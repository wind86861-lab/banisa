import prisma from '../../config/database';

export interface LogEntry {
    clinicId: string | null;
    method: string;            // "prepare" | "complete" | "AuthFailed"
    errorCode?: number | null;
    errorMsg?: string | null;
    orderId?: string | null;   // merchant_trans_id
    clickTransId?: string | null;
    durationMs: number;
    isTestMode?: boolean;
    ip?: string | null;
}

// Fire-and-forget — slow write must never block responding to CLICK.
export function logWebhook(entry: LogEntry): void {
    prisma.clickWebhookLog
        .create({
            data: {
                clinicId: entry.clinicId,
                method: entry.method,
                errorCode: entry.errorCode ?? null,
                errorMsg: entry.errorMsg ?? null,
                orderId: entry.orderId ?? null,
                clickTransId: entry.clickTransId ?? null,
                durationMs: entry.durationMs,
                isTestMode: entry.isTestMode ?? false,
                ip: entry.ip ?? null,
            },
        })
        .catch((err) => console.warn('[click-webhook-log] write failed:', err?.message));
}

export interface StatsRange {
    clinicId: string;
    sinceMs: number;
}

export async function getStats({ clinicId, sinceMs }: StatsRange) {
    const since = new Date(sinceMs);
    const rows = await prisma.clickWebhookLog.findMany({
        where: { clinicId, createdAt: { gte: since } },
        select: { errorCode: true, durationMs: true, createdAt: true },
        orderBy: { createdAt: 'asc' },
    });

    const ok = rows.filter((r) => r.errorCode === null || r.errorCode === 0).length;
    const fail = rows.length - ok;

    const durations = rows.map((r) => r.durationMs).sort((a, b) => a - b);
    const p95 = durations.length
        ? durations[Math.min(durations.length - 1, Math.floor(durations.length * 0.95))]
        : 0;
    const avg = durations.length
        ? Math.round(durations.reduce((s, d) => s + d, 0) / durations.length)
        : 0;

    const lastAt = rows.length ? rows[rows.length - 1].createdAt : null;
    const buckets = bucketByHour(rows, sinceMs, Date.now());

    return { ok, fail, p95, avg, lastAt, total: rows.length, buckets };
}

function bucketByHour(
    rows: { createdAt: Date; errorCode: number | null }[],
    sinceMs: number,
    nowMs: number,
) {
    const HOUR = 3600_000;
    const span = Math.max(HOUR, nowMs - sinceMs);
    const bucketSize = span > 24 * HOUR ? span / 24 : HOUR;
    const buckets: { t: number; ok: number; fail: number }[] = [];
    for (let i = 0; i < 24; i++) {
        buckets.push({ t: sinceMs + i * bucketSize, ok: 0, fail: 0 });
    }
    for (const r of rows) {
        const idx = Math.min(23, Math.floor((r.createdAt.getTime() - sinceMs) / bucketSize));
        if (idx < 0) continue;
        if (r.errorCode === null || r.errorCode === 0) buckets[idx].ok++;
        else buckets[idx].fail++;
    }
    return buckets;
}

export async function getRecent(clinicId: string, limit = 20) {
    return prisma.clickWebhookLog.findMany({
        where: { clinicId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        select: {
            id: true,
            method: true,
            errorCode: true,
            errorMsg: true,
            orderId: true,
            clickTransId: true,
            durationMs: true,
            isTestMode: true,
            createdAt: true,
        },
    });
}
