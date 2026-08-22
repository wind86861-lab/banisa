import prisma from '../../config/database';

const INTERVAL_MS = 60 * 60 * 1000; // hourly

/**
 * Flip PENDING recommendations whose 3-day window has passed to EXPIRED.
 * `updateMany` is a single atomic statement — inherently race-safe across
 * pm2 cluster instances (a second instance just re-runs a 0-row no-op).
 */
async function expireOverdue() {
    try {
        const res = await (prisma as any).recommendation.updateMany({
            where: { status: 'PENDING', expiresAt: { lt: new Date() } },
            data: { status: 'EXPIRED' },
        });
        if (res.count) console.log(`[recommendationExpiry] expired ${res.count} recommendation(s)`);
    } catch (e) {
        console.error('[recommendationExpiry] failed', e);
    }
}

let started = false;
export function startRecommendationExpiryScheduler() {
    if (started) return;
    started = true;
    expireOverdue();
    setInterval(expireOverdue, INTERVAL_MS);
    console.log('[recommendationExpiry] started — interval 60min');
}
