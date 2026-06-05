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

function fmt(n: number): string { return Number(n).toLocaleString('en-US').replace(/,/g, ' '); }

async function alreadySentToday(clinicId: string, isoDate: string): Promise<boolean> {
    const since = new Date(`${isoDate}T00:00:00+05:00`);
    const log = await (prisma as any).notificationLog.findFirst({
        where: {
            clinicId,
            eventType: 'clinic_daily_summary',
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
    const [total, checkedIn, noShows, paidRevenue, clinic] = await Promise.all([
        prisma.appointment.count({ where: { clinicId, scheduledAt: { gte: from, lt: to } } }),
        prisma.appointment.count({ where: { clinicId, scheduledAt: { gte: from, lt: to }, checkedInAt: { not: null } } }),
        prisma.appointment.count({ where: { clinicId, scheduledAt: { gte: from, lt: to }, status: 'NO_SHOW' } }),
        prisma.appointment.aggregate({
            where: { clinicId, scheduledAt: { gte: from, lt: to }, paymentStatus: 'PAID' },
            _sum: { paidAmount: true },
        }),
        prisma.clinic.findUnique({ where: { id: clinicId }, select: { nameUz: true } }),
    ]);

    const revenue = paidRevenue._sum?.paidAmount || 0;
    const arrivedPct = total > 0 ? Math.round((checkedIn / total) * 100) : 0;
    const title = `📊 Bugungi xulosa — ${isoDate}`;
    const body =
        `📅 Bronlar: ${total}\n` +
        `✅ Kelganlar: ${checkedIn} (${arrivedPct}%)\n` +
        `❌ Kelmaganlar: ${noShows}\n` +
        `💵 Tushum: ${fmt(revenue)} so'm` +
        (clinic?.nameUz ? `\n🏥 ${clinic.nameUz}` : '');

    await dispatchNotification({
        type: 'general',
        clinicId,
        title,
        body,
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
