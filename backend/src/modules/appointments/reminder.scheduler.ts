import prisma from '../../config/database';
import { dispatch as dispatchNotification } from '../notifications/notification.dispatcher';

// Tick cadence. 5 minutes is the resolution of our reminder windows.
const TICK_MS = 5 * 60 * 1000;

// Reminder windows. We pick a generous +/- half-tick band so an appointment
// scheduled exactly at the 24h/1h mark is never missed even if the tick
// drifts by a few seconds.
const WINDOW_24H_BEFORE_MS = 23 * 60 * 60 * 1000 + 30 * 60 * 1000; // 23h30m
const WINDOW_24H_AFTER_MS = 24 * 60 * 60 * 1000 + 30 * 60 * 1000; // 24h30m
const WINDOW_1H_BEFORE_MS = 30 * 60 * 1000;                       // 30m
const WINDOW_1H_AFTER_MS = 90 * 60 * 1000;                        // 90m

// Statuses that still count as "the appointment will happen" — we don't
// remind for CANCELLED, NO_SHOW, COMPLETED, etc.
const LIVE_STATUSES = ['PENDING', 'OPERATOR_CONFIRMED', 'SENT_TO_CLINIC', 'CLINIC_ACCEPTED', 'PENDING_ARRIVAL', 'PAID'] as const;

interface ReminderConfig {
    type: 'booking_reminder_24h' | 'booking_reminder_1h';
    field: 'reminder24hSentAt' | 'reminder1hSentAt';
    beforeMs: number;
    afterMs: number;
}

const REMINDERS: ReminderConfig[] = [
    { type: 'booking_reminder_24h', field: 'reminder24hSentAt', beforeMs: WINDOW_24H_BEFORE_MS, afterMs: WINDOW_24H_AFTER_MS },
    { type: 'booking_reminder_1h', field: 'reminder1hSentAt', beforeMs: WINDOW_1H_BEFORE_MS, afterMs: WINDOW_1H_AFTER_MS },
];

async function runReminder(cfg: ReminderConfig) {
    const now = Date.now();
    const from = new Date(now + cfg.beforeMs);
    const to = new Date(now + cfg.afterMs);

    const due = await prisma.appointment.findMany({
        where: {
            scheduledAt: { gte: from, lte: to },
            status: { in: LIVE_STATUSES as any },
            [cfg.field]: null,
        },
        include: {
            patient: { select: { firstName: true, lastName: true } },
            clinic: { select: { nameUz: true } },
            diagnosticService: { select: { nameUz: true } },
            surgicalService: { select: { nameUz: true } },
        },
        take: 200,
    });

    if (due.length === 0) return;

    for (const a of due) {
        try {
            // Reserve the slot first — if dispatch throws we don't double-send.
            // The atomic update guards against two scheduler instances racing.
            const updated = await prisma.appointment.updateMany({
                where: { id: a.id, [cfg.field]: null } as any,
                data: { [cfg.field]: new Date() } as any,
            });
            if (updated.count === 0) continue; // someone else claimed it

            const serviceName = (a as any).diagnosticService?.nameUz || (a as any).surgicalService?.nameUz || 'Xizmat';
            await dispatchNotification({
                type: cfg.type,
                userId: a.patientId,
                appointmentId: a.id,
                bookingNumber: a.bookingNumber,
                serviceName,
                clinicName: (a as any).clinic?.nameUz,
                appointmentAt: a.scheduledAt,
                priority: 'HIGH',
                link: `/user/appointments/${a.id}`,
            });
        } catch (e) {
            console.error(`[reminderScheduler] ${cfg.type} failed for`, a.id, e);
        }
    }
}

let started = false;

export function startReminderScheduler() {
    if (started) return;
    started = true;
    const tick = async () => {
        for (const cfg of REMINDERS) {
            try { await runReminder(cfg); } catch (e) { console.error('[reminderScheduler]', cfg.type, e); }
        }
    };
    setInterval(tick, TICK_MS);
    setTimeout(tick, 15_000);
    console.log('[reminderScheduler] started — interval 5min, windows 24h/1h');
}
