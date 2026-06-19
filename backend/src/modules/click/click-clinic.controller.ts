import { Response } from 'express';
import prisma from '../../config/database';
import { AuthRequest } from '../../middleware/auth.middleware';
import { env } from '../../config/env';
import { upsertConfig, invalidateCache } from './click-config.service';
import { getStats, getRecent } from './click-webhook-log.service';
import { maskKey, open } from '../../utils/tenant-vault';
import { runSelfTest, hasRecentPass } from './click-selftest.service';

async function resolveClinicId(userId: string): Promise<string | null> {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { clinicId: true } });
    return user?.clinicId ?? null;
}

function webhookUrlFor(clinicId: string) {
    // The URL the clinic pastes into the CLICK service config screen as both
    // Prepare URL and Complete URL — our handler branches on body.action.
    return `${env.PUBLIC_API_BASE_URL.replace(/\/$/, '')}/api/click/webhook/${clinicId}`;
}

// Click merchant_id + service_id are numeric per the CLICK SHOP API.
// Accepting anything else means we ship garbage in the JSON-RPC response that
// the CLICK side will reject.
const CLICK_NUMERIC_ID = /^\d{1,15}$/;

async function audit(clinicId: string, actorId: string | null, action: string, metadata?: any): Promise<void> {
    try {
        await prisma.clinicAuditLog.create({
            data: { clinicId, actorId, action, targetType: 'click', metadata: metadata ?? null },
        });
    } catch (e) {
        console.warn('[click-clinic] audit log failed:', (e as any)?.message);
    }
}

function projectConfig(row: any, prodKey: string, testKey: string | null) {
    return {
        merchantId: row.merchantId,
        serviceId: row.serviceId,
        merchantUserId: row.merchantUserId,
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

    const row = await prisma.clinicClickConfig.findUnique({ where: { clinicId } });
    if (!row) {
        return res.json({
            success: true,
            data: { config: null, webhookUrl: webhookUrlFor(clinicId) },
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
// Mirrors the hardened Payme controller:
//   - merchantId + serviceId must look like numeric Click IDs
//   - rotation auto-deactivates the config + clears self-test (admin must
//     re-test and re-enable, preventing the "rotated keys but cabinet still
//     on the old ones" silent-failure window).
export const putConfig = async (req: AuthRequest, res: Response) => {
    const clinicId = await resolveClinicId(req.user!.id);
    if (!clinicId) return res.status(404).json({ success: false, message: 'Klinika topilmadi' });

    const { merchantId, serviceId, merchantUserId, prodKey, testKey, isTestMode } = req.body || {};
    if (typeof merchantId !== 'string' || !CLICK_NUMERIC_ID.test(merchantId.trim())) {
        return res.status(400).json({
            success: false,
            message: 'merchantId noto\'g\'ri. Click merchant ID raqamlardan iborat bo\'lishi kerak.',
        });
    }
    if (typeof serviceId !== 'string' || !CLICK_NUMERIC_ID.test(serviceId.trim())) {
        return res.status(400).json({
            success: false,
            message: 'serviceId noto\'g\'ri. Click service ID raqamlardan iborat bo\'lishi kerak.',
        });
    }
    if (typeof prodKey !== 'string' || prodKey.trim().length < 6) {
        return res.status(400).json({ success: false, message: 'Production kalit noto\'g\'ri (kamida 6 belgi)' });
    }
    if (testKey && (typeof testKey !== 'string' || testKey.trim().length < 6)) {
        return res.status(400).json({ success: false, message: 'Test kalit noto\'g\'ri' });
    }

    const existing = await prisma.clinicClickConfig.findUnique({ where: { clinicId } });
    const saved = await upsertConfig({
        clinicId,
        merchantId: merchantId.trim(),
        serviceId: serviceId.trim(),
        merchantUserId: typeof merchantUserId === 'string' && merchantUserId.trim()
            ? merchantUserId.trim()
            : null,
        prodKey: prodKey.trim(),
        testKey: testKey ? String(testKey).trim() : null,
        isTestMode: typeof isTestMode === 'boolean' ? isTestMode : (existing?.isTestMode ?? true),
        // Rotation auto-deactivates (K1 fix): the Click cabinet still uses the
        // old key for a few minutes after rotation, so leaving isActive=true
        // would silently fail every payment in that window.
        isActive: false,
        actorId: req.user!.id,
        reason: existing ? 'rotation' : 'initial',
    });

    await prisma.$transaction(async (tx) => {
        await tx.clinicClickConfig.update({
            where: { clinicId },
            data: {
                lastUsedAt: null,
                lastSelfTestAt: null,
                lastSelfTestStatus: null,
                lastSelfTestMsg: null,
            },
        });
        // If the config was active before this rotation, drop CLICK from the
        // clinic's paymentMethods so patients stop seeing the button until
        // the admin re-tests + re-activates.
        if (existing?.isActive) {
            const clinic = await tx.clinic.findUnique({
                where: { id: clinicId }, select: { paymentMethods: true },
            });
            const methods = (clinic?.paymentMethods as string[] | null) ?? [];
            await tx.clinic.update({
                where: { id: clinicId },
                data: { paymentMethods: methods.filter((m) => m !== 'CLICK') },
            });
        }
    });
    invalidateCache(clinicId);

    await audit(clinicId, req.user!.id, existing ? 'click.rotate' : 'click.create', {
        merchantId: saved.merchantId,
        serviceId: saved.serviceId,
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

    const row = await prisma.clinicClickConfig.findUnique({ where: { clinicId } });
    if (!row) return res.status(404).json({ success: false, message: 'Config topilmadi' });

    if (isTestMode && !row.testKeyCiphertext) {
        return res.status(400).json({
            success: false,
            message: 'Test rejimga o\'tish uchun avval test kalit kiritilishi kerak',
        });
    }

    const updated = await prisma.clinicClickConfig.update({
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
    await audit(clinicId, req.user!.id, 'click.mode_changed', { isTestMode });

    return res.json({ success: true, data: { isTestMode: updated.isTestMode } });
};

// ─── PATCH active (turn on/off) ─────────────────────────────────────────────
// Two-stage activation gate + paymentMethods inside the same transaction.
export const patchActive = async (req: AuthRequest, res: Response) => {
    const clinicId = await resolveClinicId(req.user!.id);
    if (!clinicId) return res.status(404).json({ success: false, message: 'Klinika topilmadi' });

    const { isActive, forceActivate } = req.body || {};
    if (typeof isActive !== 'boolean') {
        return res.status(400).json({ success: false, message: 'isActive boolean bo\'lishi kerak' });
    }

    const row = await prisma.clinicClickConfig.findUnique({ where: { clinicId } });
    if (!row) return res.status(404).json({ success: false, message: 'Config topilmadi' });

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

    const updatedConfig = await prisma.$transaction(async (tx) => {
        const updated = await tx.clinicClickConfig.update({
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
        if (isActive) set.add('CLICK'); else set.delete('CLICK');
        await tx.clinic.update({
            where: { id: clinicId },
            data: { paymentMethods: Array.from(set) },
        });
        return updated;
    });

    invalidateCache(clinicId);
    await audit(clinicId, req.user!.id, isActive ? 'click.activate' : 'click.deactivate', {
        forced: !!forceActivate && isActive,
        merchantId: row.merchantId,
    });

    return res.json({ success: true, data: { isActive: updatedConfig.isActive } });
};

// ─── DELETE config (deactivate, keys remain encrypted in DB) ────────────────
export const deleteConfig = async (req: AuthRequest, res: Response) => {
    const clinicId = await resolveClinicId(req.user!.id);
    if (!clinicId) return res.status(404).json({ success: false, message: 'Klinika topilmadi' });

    const row = await prisma.clinicClickConfig.findUnique({ where: { clinicId } });
    if (!row) return res.json({ success: true });

    await prisma.$transaction(async (tx) => {
        await tx.clinicClickConfig.update({
            where: { clinicId },
            data: { isActive: false, updatedBy: req.user!.id },
        });
        const clinic = await tx.clinic.findUnique({
            where: { id: clinicId }, select: { paymentMethods: true },
        });
        const methods = (clinic?.paymentMethods as string[] | null) ?? [];
        await tx.clinic.update({
            where: { id: clinicId },
            data: { paymentMethods: methods.filter((m) => m !== 'CLICK') },
        });
    });
    invalidateCache(clinicId);
    await audit(clinicId, req.user!.id, 'click.disconnect', { merchantId: row.merchantId });
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

    const versions = await prisma.clickConfigVersion.findMany({
        where: { clinicId },
        orderBy: { version: 'desc' },
        take: 20,
        select: {
            id: true,
            version: true,
            merchantId: true,
            serviceId: true,
            isTestMode: true,
            reason: true,
            changedBy: true,
            createdAt: true,
        },
    });
    return res.json({ success: true, data: { items: versions } });
};

// ─── POST self-test ─────────────────────────────────────────────────────────
export const selfTestHandler = async (req: AuthRequest, res: Response) => {
    const clinicId = await resolveClinicId(req.user!.id);
    if (!clinicId) return res.status(404).json({ success: false, message: 'Klinika topilmadi' });
    const result = await runSelfTest(clinicId);
    await audit(clinicId, req.user!.id, 'click.selftest', {
        status: result.status, message: result.message, durationMs: result.durationMs,
    });
    return res.json({ success: true, data: result });
};
