import prisma from '../../config/database';
import { dispatch as dispatchNotification } from '../notifications/notification.dispatcher';

/**
 * Once per day per clinic at 21:00 Asia/Tashkent (UTC+5).
 * Aggregates the day's bookings/check-ins/no-shows/revenue and broadcasts
 * a one-page summary to every clinic admin (in-app + Telegram if bound).
 *
 * Run-tracking is in-memory — a single PM2 instance is responsible for the
 * scheduler (server.ts only starts it on instance 0). Restarts during the
 * 21:00 window could double-fire, so we record per-clinic per-date sent
 * markers in NotificationLog (channel='inapp', eventType='clinic_daily_summary').
 */

const TICK_MS = 60 * 1000; // 1 minute
const TARGET_HOUR_UTC = 16; // 21:00 Tashkent = 16:00 UTC

function todayIsoDateTashkent(): string {
    const now = new Date();
    const tashkentMs = now.getTime() + 5 * 60 * 60 * 1000;
    return new Date(tashkentMs).toISOString().slice(0, 10); // YYYY-MM-DD
}

function dayBoundsTashkent(isoDate: string): { from: Date; to: Date } {
    // isoDate is the Tashkent-local date. Bounds are 00:00–24:00 Tashkent =
    // (date)T00:00:00+05:00 → (date+1)T00:00:00+05:00 in UTC.
    const from = new Date(`${isoDate}T00:00:00+05:00`);
    const to = new Date(from.getTime() + 24 * 60 * 60 * 1000);
    return { from, to };
}

async function alreadySentToday(clinicId: string, isoDate: string): Promise<boolean> {
    const since = new Date(`${isoDate}T00:00:00+05:00`);
    const log = await (prisma as any).notificationLog.findFirst({
        where: {
            clinicId,
            // Match both the legacy marker (clinic_daily_summary) and the new
            // typed event (clinic_daily_report) so a same-day rollout doesn't
            // double-fire the summary.
            eventType: { in: ['clinic_daily_summary', 'clinic_daily_report'] },
            createdAt: { gte: since },
        },
        select: { id: true },
    });
    return Boolean(log);
}

async function runForClinic(clinicId: string, isoDate: string) {
    if (await alreadySentToday(clinicId, isoDate)) return;

    const { from, to } = dayBoundsTashkent(isoDate);

    // Aggregate metrics for the day.
    const [total, completed, cancelled, paidRevenue, paidCount, pending] = await Promise.all([
        prisma.appointment.count({ where: { clinicId, scheduledAt: { gte: from, lt: to } } }),
        prisma.appointment.count({ where: { clinicId, scheduledAt: { gte: from, lt: to }, status: 'COMPLETED' as any } }),
        prisma.appointment.count({ where: { clinicId, scheduledAt: { gte: from, lt: to }, status: 'CANCELLED' as any } }),
        prisma.appointment.aggregate({
            where: { clinicId, scheduledAt: { gte: from, lt: to }, paymentStatus: 'PAID' as any },
            _sum: { paidAmount: true },
        }),
        prisma.appointment.count({ where: { clinicId, scheduledAt: { gte: from, lt: to }, paymentStatus: 'PAID' as any } }),
        prisma.appointment.count({ where: { clinicId, scheduledAt: { gte: from, lt: to }, paymentStatus: 'UNPAID' as any } }),
    ]);

    const revenue = paidRevenue._sum?.paidAmount || 0;

    // Dispatch the typed daily-report event. The Telegram channel routes it
    // via REPORTS_DAILY permission gate, so DIRECTOR + CLINIC_ADMIN both get
    // it but no one else does.
    await dispatchNotification({
        type: 'clinic_daily_report',
        clinicId,
        total,
        completed,
        cancelled,
        revenue,
        paidCount,
        pending,
        link: '/clinic/reports',
    });
}

async function tick() {
    const now = new Date();
    if (now.getUTCHours() !== TARGET_HOUR_UTC) return;
    if (now.getUTCMinutes() > 5) return; // only run in the first 5 minutes of the hour

    const isoDate = todayIsoDateTashkent();
    const clinics = await prisma.clinic.findMany({
        where: { status: 'APPROVED' as any },
        select: { id: true },
        take: 1000,
    });

    for (const c of clinics) {
        try { await runForClinic(c.id, isoDate); }
        catch (e) { console.error('[dailySummary] clinic', c.id, e); }
    }
}

let started = false;
export function startDailySummaryScheduler() {
    if (started) return;
    started = true;
    setInterval(() => { tick().catch(e => console.error('[dailySummary]', e)); }, TICK_MS);
    console.log('[dailySummary] started — fires at 21:00 Asia/Tashkent (16:00 UTC)');
}
