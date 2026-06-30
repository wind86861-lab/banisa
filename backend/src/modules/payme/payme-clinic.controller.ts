import { Response } from 'express';
import prisma from '../../config/database';
import { AuthRequest } from '../../middleware/auth.middleware';
import { env } from '../../config/env';
import { upsertConfig, invalidateCache } from './payme-config.service';
import { getStats, getRecent } from './payme-webhook-log.service';
import { maskKey, open } from '../../utils/tenant-vault';
import { runSelfTest, hasRecentPass } from './payme-selftest.service';
import { ensureTestOrder } from './payme-testorder.service';

async function resolveClinicId(userId: string): Promise<string | null> {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { clinicId: true } });
    return user?.clinicId ?? null;
}

function webhookUrlFor(clinicId: string) {
    return `${env.PUBLIC_API_BASE_URL.replace(/\/$/, '')}/api/payme/callback/${clinicId}`;
}

// Payme merchant IDs are 24-char hex (MongoDB ObjectId). Reject obvious junk
// like the phone-number we found in Medilux's row — it sends invalid info up
// to Payme and they reject the response.
const PAYME_MERCHANT_ID_REGEX = /^[a-f0-9]{20,32}$/i;

// Audit-log helper — never throws so a missing audit row can't break a save.
async function audit(clinicId: string, actorId: string | null, action: string, metadata?: any): Promise<void> {
    try {
        await prisma.clinicAuditLog.create({
            data: { clinicId, actorId, action, targetType: 'payme', metadata: metadata ?? null },
        });
    } catch (e) {
        console.warn('[payme-clinic] audit log failed:', (e as any)?.message);
    }
}

// Public-safe view of the config — plaintext keys NEVER returned.
function projectConfig(row: any, prodKey: string, testKey: string | null) {
    return {
        merchantId: row.merchantId,
        prodKeyMasked: maskKey(prodKey),
        testKeyMasked: testKey ? maskKey(testKey) : null,
        hasTestKey: !!testKey,
        isTestMode: row.isTestMode,
        isActive: row.isActive,
        connectedAt: row.connectedAt,
        lastUsedAt: row.lastUsedAt,
        lastRotatedAt: row.lastRotatedAt,
        lastSelfTestAt: row.lastSelfTestAt,
        lastSelfTestStatus: row.lastSelfTestStatus,
        lastSelfTestMsg: row.lastSelfTestMsg,
        webhookUrl: webhookUrlFor(row.clinicId),
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
    };
}

// ─── GET config ─────────────────────────────────────────────────────────────
export const getConfig = async (req: AuthRequest, res: Response) => {
    const clinicId = await resolveClinicId(req.user!.id);
    if (!clinicId) return res.status(404).json({ success: false, message: 'Klinika topilmadi' });

    const row = await prisma.clinicPaymeConfig.findUnique({ where: { clinicId } });
    if (!row) {
        return res.json({
            success: true,
            data: {
                config: null,
                webhookUrl: webhookUrlFor(clinicId),
            },
        });
    }

    let prodKey = '';
    let testKey: string | null = null;
    try {
        prodKey = open({
            ciphertext: row.prodKeyCiphertext,
            iv: row.prodKeyIv,
            tag: row.prodKeyTag,
        });
        if (row.testKeyCiphertext && row.testKeyIv && row.testKeyTag) {
            testKey = open({
                ciphertext: row.testKeyCiphertext,
                iv: row.testKeyIv,
                tag: row.testKeyTag,
            });
        }
    } catch {
        return res.status(500).json({
            success: false,
            message: 'Maxfiy kalitni ochib bo\'lmadi. Tizim ma\'muri bilan bog\'laning.',
        });
    }

    return res.json({
        success: true,
        data: { config: projectConfig(row, prodKey, testKey) },
    });
};

// ─── PUT config (create or rotate) ──────────────────────────────────────────
// Fix #1: validates merchantId format (24-char hex).
// Fix #8: clears lastUsedAt on rotation so the dashboard reflects the new
//          key's first usage from scratch.
export const putConfig = async (req: AuthRequest, res: Response) => {
    const clinicId = await resolveClinicId(req.user!.id);
    if (!clinicId) return res.status(404).json({ success: false, message: 'Klinika topilmadi' });

    const { merchantId, prodKey, testKey, isTestMode } = req.body || {};
    if (typeof merchantId !== 'string' || !PAYME_MERCHANT_ID_REGEX.test(merchantId.trim())) {
        return res.status(400).json({
            success: false,
            message: 'merchantId noto\'g\'ri. Payme merchant ID 20-32 ta hex belgi (a-f, 0-9) bo\'lishi kerak. Payme kabinet → Sozlamalar → Merchant ID.',
        });
    }
    if (typeof prodKey !== 'string' || prodKey.trim().length < 8) {
        return res.status(400).json({ success: false, message: 'Production kalit noto\'g\'ri (kamida 8 belgi)' });
    }
    if (testKey && (typeof testKey !== 'string' || testKey.trim().length < 8)) {
        return res.status(400).json({ success: false, message: 'Test kalit noto\'g\'ri' });
    }

    const existing = await prisma.clinicPaymeConfig.findUnique({ where: { clinicId } });
    const saved = await upsertConfig({
        clinicId,
        merchantId: merchantId.trim(),
        prodKey: prodKey.trim(),
        testKey: testKey ? String(testKey).trim() : null,
        isTestMode: typeof isTestMode === 'boolean' ? isTestMode : (existing?.isTestMode ?? true),
        // K1: rotation auto-deactivates. Payme cabinet still uses the old key
        // for a few minutes after rotation — leaving isActive=true silently
        // breaks every payment in that window. Admin self-tests + re-enables.
        isActive: false,
        actorId: req.user!.id,
        reason: existing ? 'rotation' : 'initial',
    });

    // Self-test is invalidated by a key change — admin must re-test
    // before they can re-activate. Also clears lastUsedAt + drops PAYME
    // from paymentMethods if the config was active before, so patients
    // stop seeing the button until the test+activate flow completes.
    if (existing) {
        await prisma.$transaction(async (tx) => {
            await tx.clinicPaymeConfig.update({
                where: { clinicId },
                data: {
                    lastUsedAt: null,
                    lastSelfTestAt: null,
                    lastSelfTestStatus: null,
                    lastSelfTestMsg: null,
                },
            });
            if (existing.isActive) {
                const clinic = await tx.clinic.findUnique({
                    where: { id: clinicId }, select: { paymentMethods: true },
                });
                const methods = (clinic?.paymentMethods as string[] | null) ?? [];
                await tx.clinic.update({
                    where: { id: clinicId },
                    data: { paymentMethods: methods.filter((m) => m !== 'PAYME') },
                });
            }
        });
        invalidateCache(clinicId);
    }

    await audit(clinicId, req.user!.id, existing ? 'payme.rotate' : 'payme.create', {
        merchantId: saved.merchantId,
        hasTestKey: !!testKey,
        isTestMode: saved.isTestMode,
    });

    return res.json({
        success: true,
        data: projectConfig(
            { ...saved, isActive: false, lastUsedAt: null, lastSelfTestAt: null, lastSelfTestStatus: null, lastSelfTestMsg: null },
            prodKey.trim(),
            testKey ? String(testKey).trim() : null,
        ),
    });
};

// ─── PATCH mode (test ↔ live) ───────────────────────────────────────────────
export const patchMode = async (req: AuthRequest, res: Response) => {
    const clinicId = await resolveClinicId(req.user!.id);
    if (!clinicId) return res.status(404).json({ success: false, message: 'Klinika topilmadi' });

    const { isTestMode } = req.body || {};
    if (typeof isTestMode !== 'boolean') {
        return res.status(400).json({ success: false, message: 'isTestMode boolean bo\'lishi kerak' });
    }

    const row = await prisma.clinicPaymeConfig.findUnique({ where: { clinicId } });
    if (!row) return res.status(404).json({ success: false, message: 'Config topilmadi' });

    if (isTestMode && !row.testKeyCiphertext) {
        return res.status(400).json({
            success: false,
            message: 'Test rejimga o\'tish uchun avval test kalit kiritilishi kerak',
        });
    }

    // Mode flip invalidates the self-test — they were testing the OTHER key.
    const updated = await prisma.clinicPaymeConfig.update({
        where: { clinicId },
        data: {
            isTestMode,
            updatedBy: req.user!.id,
            lastSelfTestAt: null,
            lastSelfTestStatus: null,
            lastSelfTestMsg: null,
        },
    });
    invalidateCache(clinicId);
    await audit(clinicId, req.user!.id, 'payme.mode_changed', { isTestMode });

    return res.json({ success: true, data: { isTestMode: updated.isTestMode } });
};

// ─── PATCH active (turn on/off) ─────────────────────────────────────────────
// Fix #2: two-stage activation — activation requires a passing self-test
//          from the last 24h, unless forceActivate=true (kept for emergency
//          migration scenarios; audit-logged).
// Fix #6: paymentMethods sync moved into the same transaction.
// Fix #9: writes ClinicAuditLog rows on every flip.
export const patchActive = async (req: AuthRequest, res: Response) => {
    const clinicId = await resolveClinicId(req.user!.id);
    if (!clinicId) return res.status(404).json({ success: false, message: 'Klinika topilmadi' });

    const { isActive, forceActivate } = req.body || {};
    if (typeof isActive !== 'boolean') {
        return res.status(400).json({ success: false, message: 'isActive boolean bo\'lishi kerak' });
    }

    const row = await prisma.clinicPaymeConfig.findUnique({ where: { clinicId } });
    if (!row) return res.status(404).json({ success: false, message: 'Config topilmadi' });

    // Two-stage gate: refuse to activate unless self-test passed recently.
    // forceActivate=true bypasses for migration emergencies — gets audit-logged
    // so a super admin can see who skipped the gate and why.
    if (isActive && !forceActivate) {
        const passed = await hasRecentPass(clinicId);
        if (!passed) {
            return res.status(412).json({
                success: false,
                code: 'SELFTEST_REQUIRED',
                message: 'Yoqishdan oldin self-test PASS qilishi kerak. "Tekshirish" tugmasini bosing va 24 soat ichida qayta yoqing.',
            });
        }
    }

    // Atomic: bump isActive AND keep paymentMethods in sync so we never end
    // up with PAYME shown to patients while the webhook is off (or vice versa).
    const updatedConfig = await prisma.$transaction(async (tx) => {
        const updated = await tx.clinicPaymeConfig.update({
            where: { clinicId },
            data: {
                isActive,
                connectedAt: row.connectedAt ?? (isActive ? new Date() : null),
                updatedBy: req.user!.id,
            },
        });
        const clinic = await tx.clinic.findUnique({
            where: { id: clinicId }, select: { paymentMethods: true },
        });
        const methods = (clinic?.paymentMethods as string[] | null) ?? [];
        const set = new Set(methods);
        if (isActive) set.add('PAYME'); else set.delete('PAYME');
        await tx.clinic.update({
            where: { id: clinicId },
            data: { paymentMethods: Array.from(set) },
        });
        return updated;
    });

    invalidateCache(clinicId);
    await audit(clinicId, req.user!.id, isActive ? 'payme.activate' : 'payme.deactivate', {
        forced: !!forceActivate && isActive,
        merchantId: row.merchantId,
    });

    return res.json({ success: true, data: { isActive: updatedConfig.isActive } });
};

// ─── DELETE config (deactivate, keys remain encrypted in DB) ────────────────
export const deleteConfig = async (req: AuthRequest, res: Response) => {
    const clinicId = await resolveClinicId(req.user!.id);
    if (!clinicId) return res.status(404).json({ success: false, message: 'Klinika topilmadi' });

    const row = await prisma.clinicPaymeConfig.findUnique({ where: { clinicId } });
    if (!row) return res.json({ success: true });

    await prisma.$transaction(async (tx) => {
        await tx.clinicPaymeConfig.update({
            where: { clinicId },
            data: { isActive: false, updatedBy: req.user!.id },
        });
        const clinic = await tx.clinic.findUnique({
            where: { id: clinicId }, select: { paymentMethods: true },
        });
        const methods = (clinic?.paymentMethods as string[] | null) ?? [];
        await tx.clinic.update({
            where: { id: clinicId },
            data: { paymentMethods: methods.filter((m) => m !== 'PAYME') },
        });
    });
    invalidateCache(clinicId);
    await audit(clinicId, req.user!.id, 'payme.disconnect', { merchantId: row.merchantId });

    return res.json({ success: true });
};

// ─── GET stats ──────────────────────────────────────────────────────────────
export const getStatsHandler = async (req: AuthRequest, res: Response) => {
    const clinicId = await resolveClinicId(req.user!.id);
    if (!clinicId) return res.status(404).json({ success: false, message: 'Klinika topilmadi' });

    const range = String(req.query.range || '24h');
    const map: Record<string, number> = {
        '24h': 24 * 3600_000,
        '7d': 7 * 24 * 3600_000,
        '30d': 30 * 24 * 3600_000,
    };
    const span = map[range] || map['24h'];
    const stats = await getStats({ clinicId, sinceMs: Date.now() - span });
    return res.json({ success: true, data: { range, ...stats } });
};

// ─── GET recent ─────────────────────────────────────────────────────────────
export const getRecentHandler = async (req: AuthRequest, res: Response) => {
    const clinicId = await resolveClinicId(req.user!.id);
    if (!clinicId) return res.status(404).json({ success: false, message: 'Klinika topilmadi' });

    const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit || '20'), 10) || 20));
    const items = await getRecent(clinicId, limit);
    return res.json({ success: true, data: { items } });
};

// ─── GET versions ───────────────────────────────────────────────────────────
export const getVersionsHandler = async (req: AuthRequest, res: Response) => {
    const clinicId = await resolveClinicId(req.user!.id);
    if (!clinicId) return res.status(404).json({ success: false, message: 'Klinika topilmadi' });

    const versions = await prisma.paymeConfigVersion.findMany({
        where: { clinicId },
        orderBy: { version: 'desc' },
        take: 20,
        select: {
            id: true,
            version: true,
            merchantId: true,
            isTestMode: true,
            reason: true,
            changedBy: true,
            createdAt: true,
        },
    });
    return res.json({ success: true, data: { items: versions } });
};

// ─── POST self-test ─────────────────────────────────────────────────────────
// Fix #3: real self-test — sends a CheckPerformTransaction probe to the
// clinic's own callback URL. PASS proves auth+routing+handler all work.
export const selfTestHandler = async (req: AuthRequest, res: Response) => {
    const clinicId = await resolveClinicId(req.user!.id);
    if (!clinicId) return res.status(404).json({ success: false, message: 'Klinika topilmadi' });

    const result = await runSelfTest(clinicId);
    await audit(clinicId, req.user!.id, 'payme.selftest', {
        status: result.status, message: result.message, durationMs: result.durationMs,
    });
    return res.json({ success: true, data: result });
};

// ─── POST test-order ──────────────────────────────────────────────────────────
// Provisions (and resets) the clinic's reusable Payme sandbox order, returning
// the order_id + amount the moderator pastes into test.paycom.uz. Replaces the
// old per-clinic hardcoded test ids — the merchant endpoint now runs its normal
// data-driven path against this real appointment. See payme-testorder.service.
export const testOrderHandler = async (req: AuthRequest, res: Response) => {
    const clinicId = await resolveClinicId(req.user!.id);
    if (!clinicId) return res.status(404).json({ success: false, message: 'Klinika topilmadi' });

    const order = await ensureTestOrder(clinicId);
    await audit(clinicId, req.user!.id, 'payme.testorder', { orderId: order.orderId });
    return res.json({ success: true, data: order });
};
