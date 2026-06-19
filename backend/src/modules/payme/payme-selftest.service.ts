/**
 * Real self-test: posts a CheckPerformTransaction JSON-RPC envelope to
 * the clinic's own /api/payme/callback/:clinicId endpoint, using the
 * stored prod-or-test key as Basic auth. A PASS means the loop is
 * complete: keys decrypt, the route is mounted, the auth middleware
 * accepts the password, and the controller returns a valid JSON-RPC
 * shape (even if it's `error: { code: -31050 }` "order not found" —
 * that's the expected response for a nonexistent order id, and it
 * still proves the auth + routing work).
 *
 * Failure modes captured:
 *   - 401/UNAUTHORIZED         → wrong key configured
 *   - non-200 HTTP             → URL unreachable / nginx not proxying
 *   - non-JSON body            → not a Payme handler
 *   - missing `jsonrpc` field  → wrong endpoint
 */
import prisma from '../../config/database';
import { env } from '../../config/env';
import { getActiveConfigForClinic } from './payme-config.service';

export type SelfTestStatus = 'pass' | 'fail';

export interface SelfTestResult {
    status: SelfTestStatus;
    message: string;
    httpStatus?: number;
    durationMs: number;
}

const TIMEOUT_MS = 8000;
const PROBE_ORDER_ID = `selftest-${'0'.repeat(24)}`; // deterministic non-existent UUID-shaped id

export async function runSelfTest(clinicId: string): Promise<SelfTestResult> {
    const startedAt = Date.now();
    const config = await getActiveConfigForClinic(clinicId);
    if (!config) {
        const result: SelfTestResult = {
            status: 'fail',
            message: 'Konfiguratsiya yo\'q — avval kalit kiriting.',
            durationMs: Date.now() - startedAt,
        };
        await persist(clinicId, result);
        return result;
    }

    const key = config.isTestMode ? config.testKey : config.prodKey;
    if (!key) {
        const result: SelfTestResult = {
            status: 'fail',
            message: config.isTestMode
                ? 'Test rejim tanlangan, lekin test kalit kiritilmagan.'
                : 'Live rejim tanlangan, lekin prod kalit yo\'q.',
            durationMs: Date.now() - startedAt,
        };
        await persist(clinicId, result);
        return result;
    }

    const baseUrl = (env.PUBLIC_API_BASE_URL || '').replace(/\/+$/, '');
    if (!baseUrl) {
        const result: SelfTestResult = {
            status: 'fail',
            message: 'PUBLIC_API_BASE_URL sozlanmagan — tizim ma\'muri bilan bog\'laning.',
            durationMs: Date.now() - startedAt,
        };
        await persist(clinicId, result);
        return result;
    }
    const url = `${baseUrl}/api/payme/callback/${clinicId}`;
    const authHeader = `Basic ${Buffer.from(`Paycom:${key}`, 'utf8').toString('base64')}`;
    const body = JSON.stringify({
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'CheckPerformTransaction',
        params: {
            amount: 100,
            account: { order_id: PROBE_ORDER_ID },
        },
    });

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    let httpStatus = 0;
    let parsed: any = null;
    let rawText = '';
    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: authHeader, 'X-Self-Test': '1' },
            body,
            signal: controller.signal,
        });
        httpStatus = res.status;
        rawText = await res.text();
        try { parsed = JSON.parse(rawText); } catch { /* not JSON */ }
    } catch (e: any) {
        const result: SelfTestResult = {
            status: 'fail',
            message: e?.name === 'AbortError'
                ? `URL ${TIMEOUT_MS / 1000} sekundda javob bermadi. Nginx yoki DNS muammosi?`
                : `Tarmoq xatosi: ${e?.message || e}`,
            durationMs: Date.now() - startedAt,
        };
        await persist(clinicId, result);
        return result;
    } finally {
        clearTimeout(timer);
    }

    // Payme spec: every response is 200 OK with a JSON-RPC envelope.
    if (httpStatus !== 200) {
        const result: SelfTestResult = {
            status: 'fail',
            message: `HTTP ${httpStatus} qaytdi (Payme har doim 200 kutadi).`,
            httpStatus,
            durationMs: Date.now() - startedAt,
        };
        await persist(clinicId, result);
        return result;
    }
    if (!parsed || parsed.jsonrpc !== '2.0') {
        const result: SelfTestResult = {
            status: 'fail',
            message: 'Javob JSON-RPC formatida emas. URL noto\'g\'ri yoki backend ishlamayapti.',
            httpStatus,
            durationMs: Date.now() - startedAt,
        };
        await persist(clinicId, result);
        return result;
    }

    // Auth failure surfaces as code -32504 per spec.
    if (parsed?.error?.code === -32504) {
        const result: SelfTestResult = {
            status: 'fail',
            message: 'Auth xatosi (-32504): saqlangan kalit Payme kabinetidagi kalitga mos kelmaydi.',
            httpStatus,
            durationMs: Date.now() - startedAt,
        };
        await persist(clinicId, result);
        return result;
    }

    // Any other response — including code -31050 (order not found) — proves
    // the auth + routing + handler are wired correctly.
    const expectedErr = parsed?.error?.code === -31050 || parsed?.error?.code === -31099;
    const okResult = parsed?.result;
    const status: SelfTestStatus = expectedErr || okResult ? 'pass' : 'fail';
    const message: string = status === 'pass'
        ? `Ishlayapti! Endpoint javob berdi (${httpStatus}, JSON-RPC ✓, auth ✓).`
        : `Kutilmagan javob: ${rawText.slice(0, 300)}`;
    const result: SelfTestResult = { status, message, httpStatus, durationMs: Date.now() - startedAt };
    await persist(clinicId, result);
    return result;
}

async function persist(clinicId: string, r: SelfTestResult): Promise<void> {
    try {
        await prisma.clinicPaymeConfig.update({
            where: { clinicId },
            data: {
                lastSelfTestAt: new Date(),
                lastSelfTestStatus: r.status,
                lastSelfTestMsg: r.message.slice(0, 500),
            },
        });
    } catch (e) {
        console.warn('[payme-selftest] persist failed:', (e as any)?.message);
    }
}

/** Returns true if there's a passing self-test on file from the last 24h. */
export async function hasRecentPass(clinicId: string): Promise<boolean> {
    const row = await prisma.clinicPaymeConfig.findUnique({
        where: { clinicId },
        select: { lastSelfTestAt: true, lastSelfTestStatus: true },
    });
    if (!row || row.lastSelfTestStatus !== 'pass' || !row.lastSelfTestAt) return false;
    const ageMs = Date.now() - row.lastSelfTestAt.getTime();
    return ageMs < 24 * 60 * 60 * 1000;
}
