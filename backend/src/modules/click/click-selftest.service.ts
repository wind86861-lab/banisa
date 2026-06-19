/**
 * Real Click.uz self-test: posts a `Prepare` envelope to the clinic's
 * own /api/click/webhook/:clinicId endpoint with a synthetic signature
 * built from the stored prod-or-test key. PASS means the loop is
 * complete (URL routable, signature math agrees, JSON shape).
 *
 * Mirrors the Payme self-test surface so the wizard talks to both
 * providers the same way.
 */
import crypto from 'crypto';
import prisma from '../../config/database';
import { env } from '../../config/env';
import { getActiveConfigForClinic } from './click-config.service';

export type SelfTestStatus = 'pass' | 'fail';
export interface SelfTestResult {
    status: SelfTestStatus;
    message: string;
    httpStatus?: number;
    durationMs: number;
}

const TIMEOUT_MS = 8000;

export async function runSelfTest(clinicId: string): Promise<SelfTestResult> {
    const startedAt = Date.now();
    const config = await getActiveConfigForClinic(clinicId);
    if (!config) {
        return persist(clinicId, {
            status: 'fail',
            message: 'Konfiguratsiya yo\'q yoki faolsiz — avval kalit kiriting.',
            durationMs: Date.now() - startedAt,
        });
    }
    const key = config.isTestMode ? config.testKey : config.prodKey;
    if (!key) {
        return persist(clinicId, {
            status: 'fail',
            message: config.isTestMode
                ? 'Test rejim tanlangan, lekin test kalit kiritilmagan.'
                : 'Live rejim tanlangan, lekin prod kalit yo\'q.',
            durationMs: Date.now() - startedAt,
        });
    }
    const baseUrl = (env.PUBLIC_API_BASE_URL || '').replace(/\/+$/, '');
    if (!baseUrl) {
        return persist(clinicId, {
            status: 'fail',
            message: 'PUBLIC_API_BASE_URL sozlanmagan — tizim ma\'muri bilan bog\'laning.',
            durationMs: Date.now() - startedAt,
        });
    }

    const url = `${baseUrl}/api/click/webhook/${clinicId}`;
    const probe = {
        click_trans_id: '0',
        service_id: config.serviceId,
        merchant_trans_id: 'selftest-no-such-appointment',
        amount: '100',
        action: '0', // Prepare
        error: '0',
        error_note: '',
        sign_time: new Date().toISOString().slice(0, 19).replace('T', ' '),
    };
    // Click signature spec: md5(click_trans_id + service_id + SECRET_KEY +
    //   merchant_trans_id + amount + action + sign_time)
    const signString = [
        probe.click_trans_id, probe.service_id, key, probe.merchant_trans_id,
        probe.amount, probe.action, probe.sign_time,
    ].join('');
    const sign_string = crypto.createHash('md5').update(signString).digest('hex');

    const body = new URLSearchParams({ ...probe, sign_string });
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    let httpStatus = 0;
    let rawText = '';
    let parsed: any = null;
    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'X-Self-Test': '1',
            },
            body: body.toString(),
            signal: controller.signal,
        });
        httpStatus = res.status;
        rawText = await res.text();
        try { parsed = JSON.parse(rawText); } catch { /* not JSON */ }
    } catch (e: any) {
        return persist(clinicId, {
            status: 'fail',
            message: e?.name === 'AbortError'
                ? `URL ${TIMEOUT_MS / 1000} sekundda javob bermadi. Nginx yoki DNS muammosi?`
                : `Tarmoq xatosi: ${e?.message || e}`,
            durationMs: Date.now() - startedAt,
        });
    } finally {
        clearTimeout(timer);
    }

    if (httpStatus !== 200) {
        return persist(clinicId, {
            status: 'fail',
            message: `HTTP ${httpStatus} qaytdi (Click har doim 200 kutadi).`,
            httpStatus,
            durationMs: Date.now() - startedAt,
        });
    }
    if (!parsed || typeof parsed.error === 'undefined') {
        return persist(clinicId, {
            status: 'fail',
            message: 'Javob Click formatida emas. URL noto\'g\'ri yoki backend ishlamayapti.',
            httpStatus,
            durationMs: Date.now() - startedAt,
        });
    }
    // Click error codes — sign failure = -1, transaction not found = -5.
    // Either proves the loop works (signature math is verified by handler,
    // and the "appointment not found" path is the EXPECTED outcome of a
    // selftest-no-such-appointment probe).
    if (parsed.error === -1) {
        return persist(clinicId, {
            status: 'fail',
            message: 'Sign check FAILED — saqlangan kalit Click kabinetidagi kalitga mos kelmaydi.',
            httpStatus,
            durationMs: Date.now() - startedAt,
        });
    }
    const okErr = parsed.error === -5 || parsed.error === 0 || parsed.error === -9;
    const status: SelfTestStatus = okErr ? 'pass' : 'fail';
    const message: string = status === 'pass'
        ? `Ishlayapti! Endpoint javob berdi (HTTP ${httpStatus}, error=${parsed.error}, sign ✓).`
        : `Kutilmagan javob: error=${parsed.error}, note="${String(parsed.error_note || '').slice(0, 120)}"`;
    return persist(clinicId, {
        status, message, httpStatus, durationMs: Date.now() - startedAt,
    });
}

async function persist(clinicId: string, r: SelfTestResult): Promise<SelfTestResult> {
    try {
        await prisma.clinicClickConfig.update({
            where: { clinicId },
            data: {
                lastSelfTestAt: new Date(),
                lastSelfTestStatus: r.status,
                lastSelfTestMsg: r.message.slice(0, 500),
            },
        });
    } catch (e) {
        console.warn('[click-selftest] persist failed:', (e as any)?.message);
    }
    return r;
}

export async function hasRecentPass(clinicId: string): Promise<boolean> {
    const row = await prisma.clinicClickConfig.findUnique({
        where: { clinicId },
        select: { lastSelfTestAt: true, lastSelfTestStatus: true },
    });
    if (!row || row.lastSelfTestStatus !== 'pass' || !row.lastSelfTestAt) return false;
    return Date.now() - row.lastSelfTestAt.getTime() < 24 * 60 * 60 * 1000;
}
