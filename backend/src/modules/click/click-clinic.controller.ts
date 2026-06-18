import { Response } from 'express';
import prisma from '../../config/database';
import { AuthRequest } from '../../middleware/auth.middleware';
import { env } from '../../config/env';
import {
    getActiveConfigForClinic,
    upsertConfig,
    deactivateConfig,
    invalidateCache,
} from './click-config.service';
import { getStats, getRecent } from './click-webhook-log.service';
import { maskKey, open } from '../../utils/tenant-vault';

async function resolveClinicId(userId: string): Promise<string | null> {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { clinicId: true } });
    return user?.clinicId ?? null;
}

function webhookUrlFor(clinicId: string) {
    // The URL the clinic pastes into the CLICK service config screen as both
    // Prepare URL and Complete URL — our handler branches on body.action.
    return `${env.PUBLIC_API_BASE_URL.replace(/\/$/, '')}/api/click/webhook/${clinicId}`;
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
export const putConfig = async (req: AuthRequest, res: Response) => {
    const clinicId = await resolveClinicId(req.user!.id);
    if (!clinicId) return res.status(404).json({ success: false, message: 'Klinika topilmadi' });

    const { merchantId, serviceId, merchantUserId, prodKey, testKey, isTestMode } = req.body || {};
    if (typeof merchantId !== 'string' || merchantId.trim().length < 1) {
        return res.status(400).json({ success: false, message: 'merchantId noto\'g\'ri' });
    }
    if (typeof serviceId !== 'string' || serviceId.trim().length < 1) {
        return res.status(400).json({ success: false, message: 'serviceId noto\'g\'ri' });
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
        isActive: existing?.isActive ?? false,
        actorId: req.user!.id,
        reason: existing ? 'rotation' : 'initial',
    });

    return res.json({
        success: true,
        data: projectConfig(saved, prodKey.trim(), testKey ? String(testKey).trim() : null),
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
        data: { isTestMode, updatedBy: req.user!.id },
    });
    invalidateCache(clinicId);

    return res.json({ success: true, data: { isTestMode: updated.isTestMode } });
};

// ─── PATCH active (turn on/off without losing keys) ─────────────────────────
export const patchActive = async (req: AuthRequest, res: Response) => {
    const clinicId = await resolveClinicId(req.user!.id);
    if (!clinicId) return res.status(404).json({ success: false, message: 'Klinika topilmadi' });

    const { isActive } = req.body || {};
    if (typeof isActive !== 'boolean') {
        return res.status(400).json({ success: false, message: 'isActive boolean bo\'lishi kerak' });
    }

    const row = await prisma.clinicClickConfig.findUnique({ where: { clinicId } });
    if (!row) return res.status(404).json({ success: false, message: 'Config topilmadi' });

    const updated = await prisma.clinicClickConfig.update({
        where: { clinicId },
        data: {
            isActive,
            connectedAt: row.connectedAt ?? (isActive ? new Date() : null),
            updatedBy: req.user!.id,
        },
    });
    invalidateCache(clinicId);

    // Keep clinic.paymentMethods in sync so cart shows/hides CLICK.
    try {
        const methods = ((await prisma.clinic.findUnique({
            where: { id: clinicId },
            select: { paymentMethods: true },
        }))?.paymentMethods as string[] | null) ?? [];
        const set = new Set(methods);
        if (isActive) set.add('CLICK'); else set.delete('CLICK');
        await prisma.clinic.update({
            where: { id: clinicId },
            data: { paymentMethods: Array.from(set) },
        });
    } catch (err) {
        console.warn('[click-clinic] paymentMethods sync failed:', (err as any)?.message);
    }

    return res.json({ success: true, data: { isActive: updated.isActive } });
};

// ─── DELETE config (deactivate, keys remain encrypted in DB) ────────────────
export const deleteConfig = async (req: AuthRequest, res: Response) => {
    const clinicId = await resolveClinicId(req.user!.id);
    if (!clinicId) return res.status(404).json({ success: false, message: 'Klinika topilmadi' });

    const row = await prisma.clinicClickConfig.findUnique({ where: { clinicId } });
    if (!row) return res.json({ success: true });

    await deactivateConfig(clinicId, req.user!.id);
    try {
        const methods = ((await prisma.clinic.findUnique({
            where: { id: clinicId },
            select: { paymentMethods: true },
        }))?.paymentMethods as string[] | null) ?? [];
        await prisma.clinic.update({
            where: { id: clinicId },
            data: { paymentMethods: methods.filter((m) => m !== 'CLICK') },
        });
    } catch {}

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
// Best we can do without a real CLICK sandbox account: verify that the config
// loads and the secret_key decrypts cleanly, plus surface the URL the clinic
// needs to paste. Returns instructions for the operator.
export const selfTestHandler = async (req: AuthRequest, res: Response) => {
    const clinicId = await resolveClinicId(req.user!.id);
    if (!clinicId) return res.status(404).json({ success: false, message: 'Klinika topilmadi' });

    const config = await getActiveConfigForClinic(clinicId);
    if (!config) {
        return res.status(400).json({
            success: false,
            message: 'Konfiguratsiya yo\'q yoki faolsiz',
        });
    }

    return res.json({
        success: true,
        data: {
            status: 'ready',
            message: "CLICK konfiguratsiyasi tayyor. Webhook URL'ni CLICK shaxsiy kabinetiga yozing va sandbox tranzaksiyani bajaring.",
            webhookUrl: webhookUrlFor(clinicId),
            serviceId: config.serviceId,
            merchantId: config.merchantId,
            isTestMode: config.isTestMode,
        },
    });
};
