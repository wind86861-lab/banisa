import prisma from '../../config/database';
import { notifyClinicAdmins } from '../notifications/notifications.service';

// Bookings >2h past scheduledAt that never checked in → NO_SHOW.
const NO_SHOW_AFTER_MS = 2 * 60 * 60 * 1000;
// Renotify clinic admins about a CHECKED_IN + UNPAID cash booking every 5 min.
const RENOTIFY_INTERVAL_MS = 5 * 60 * 1000;
// Tick cadence (both jobs run together).
const TICK_MS = 60 * 1000;

const lastRenotifyAt = new Map<string, number>();

async function runAutoNoShow() {
    const cutoff = new Date(Date.now() - NO_SHOW_AFTER_MS);
    const stale = await prisma.appointment.findMany({
        where: {
            scheduledAt: { lt: cutoff },
            status: { in: ['PENDING_ARRIVAL', 'CLINIC_ACCEPTED', 'OPERATOR_CONFIRMED', 'SENT_TO_CLINIC', 'PAID'] },
        },
        select: { id: true, status: true },
        take: 100,
    });
    for (const a of stale) {
        try {
            await prisma.appointment.update({
                where: { id: a.id },
                data: { status: 'NO_SHOW', noShowMarkedAt: new Date() } as any,
            });
            await prisma.appointmentLog.create({
                data: {
                    appointmentId: a.id,
                    action: 'NO_SHOW',
                    oldStatus: a.status as any,
                    newStatus: 'NO_SHOW' as any,
                    userRole: 'SYSTEM',
                    note: 'Auto-marked: no check-in within 2 hours of scheduledAt',
                } as any,
            });
        } catch (e) {
            console.error('[checkInScheduler] no-show update failed for', a.id, e);
        }
    }
    if (stale.length > 0) console.log(`[checkInScheduler] auto NO_SHOW: ${stale.length} bookings`);
}

async function runCashRenotify() {
    const awaiting = await prisma.appointment.findMany({
        where: {
            status: 'CHECKED_IN',
            paymentStatus: 'UNPAID',
            paymentMethod: 'CASH',
            checkedInAt: { not: null },
        },
        select: {
            id: true, clinicId: true, bookingNumber: true, finalPrice: true, price: true,
            checkedInAt: true,
            patient: { select: { firstName: true, lastName: true, phone: true } },
            diagnosticService: { select: { nameUz: true } },
            surgicalService: { select: { nameUz: true } },
        },
        take: 100,
    });
    const now = Date.now();
    for (const a of awaiting) {
        const last = lastRenotifyAt.get(a.id) || (a.checkedInAt ? a.checkedInAt.getTime() : 0);
        if (now - last < RENOTIFY_INTERVAL_MS) continue;
        lastRenotifyAt.set(a.id, now);
        try {
            const fullName = [a.patient?.firstName, a.patient?.lastName].filter(Boolean).join(' ') || a.patient?.phone || 'Bemor';
            const serviceName = a.diagnosticService?.nameUz || a.surgicalService?.nameUz || 'Xizmat';
            const finalPrice = a.finalPrice || a.price || 0;
            const formattedPrice = Number(finalPrice).toLocaleString('en-US').replace(/,/g, ' ');
            const waitMin = a.checkedInAt ? Math.round((now - a.checkedInAt.getTime()) / 60000) : 0;
            await notifyClinicAdmins({
                clinicId: a.clinicId,
                type: 'CHECK_IN',
                title: '⏰ Naqd to\'lov hali tasdiqlanmagan',
                body: `${fullName} — ${serviceName} — ${formattedPrice} so'm — ${waitMin} daq kutmoqda`,
                priority: 'HIGH',
                data: { appointmentId: a.id, bookingNumber: a.bookingNumber, finalPrice, waitMinutes: waitMin },
                link: `/clinic/cashier?focus=${a.id}`,
            });
        } catch (e) {
            console.error('[checkInScheduler] renotify failed for', a.id, e);
        }
    }
    // Forget bookings no longer in the awaiting set (paid/cancelled).
    const activeIds = new Set(awaiting.map(a => a.id));
    for (const id of lastRenotifyAt.keys()) {
        if (!activeIds.has(id)) lastRenotifyAt.delete(id);
    }
}

let started = false;

export function startCheckInScheduler() {
    if (started) return;
    started = true;
    const tick = async () => {
        try { await runAutoNoShow(); } catch (e) { console.error('[checkInScheduler] auto-no-show:', e); }
        try { await runCashRenotify(); } catch (e) { console.error('[checkInScheduler] cash-renotify:', e); }
    };
    setInterval(tick, TICK_MS);
    // Initial run after a short delay so bootstrap finishes cleanly.
    setTimeout(tick, 10_000);
    console.log('[checkInScheduler] started — interval 60s');
}
