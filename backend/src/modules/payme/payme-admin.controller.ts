import { Response } from 'express';
import prisma from '../../config/database';
import { AuthRequest } from '../../middleware/auth.middleware';
import { invalidateCache } from './payme-config.service';
import { env } from '../../config/env';

function webhookUrlFor(clinicId: string) {
    return `${env.PUBLIC_API_BASE_URL.replace(/\/$/, '')}/api/payme/callback/${clinicId}`;
}

// ─── GET /admin/payme/clinics — overview of every clinic + config status ────
// Lists ALL clinics so admin can see which ones haven't onboarded yet.
export const listClinics = async (req: AuthRequest, res: Response) => {
    const status = String(req.query.status || 'all'); // all | active | inactive | none
    const search = String(req.query.search || '').trim().toLowerCase();

    const clinics = await prisma.clinic.findMany({
        select: {
            id: true,
            nameUz: true,
            region: true,
            status: true,
            paymentMethods: true,
            paymeConfig: {
                select: {
                    id: true,
                    merchantId: true,
                    isTestMode: true,
                    isActive: true,
                    connectedAt: true,
                    lastUsedAt: true,
                    lastRotatedAt: true,
                    updatedAt: true,
                },
            },
            _count: { select: { paymeTransactions: true } },
        },
        orderBy: { nameUz: 'asc' },
    });

    let rows = clinics.map((c) => {
        const cfg = c.paymeConfig;
        const configStatus = !cfg
            ? 'none'
            : cfg.isActive
                ? (cfg.isTestMode ? 'test' : 'live')
                : 'inactive';
        return {
            clinicId: c.id,
            clinicName: c.nameUz,
            region: c.region,
            clinicStatus: c.status,
            configStatus,
            merchantId: cfg?.merchantId ?? null,
            isTestMode: cfg?.isTestMode ?? null,
            isActive: cfg?.isActive ?? false,
            connectedAt: cfg?.connectedAt ?? null,
            lastUsedAt: cfg?.lastUsedAt ?? null,
            lastRotatedAt: cfg?.lastRotatedAt ?? null,
            updatedAt: cfg?.updatedAt ?? null,
            txCount: c._count.paymeTransactions,
            webhookUrl: webhookUrlFor(c.id),
        };
    });

    if (status !== 'all') {
        rows = rows.filter((r) => {
            if (status === 'active') return r.configStatus === 'live' || r.configStatus === 'test';
            if (status === 'inactive') return r.configStatus === 'inactive';
            if (status === 'none') return r.configStatus === 'none';
            return true;
        });
    }
    if (search) {
        rows = rows.filter(
            (r) => r.clinicName.toLowerCase().includes(search)
                || (r.merchantId || '').toLowerCase().includes(search),
        );
    }

    return res.json({ success: true, data: { items: rows, total: rows.length } });
};

// ─── GET /admin/payme/clinics/:clinicId — drill-down ────────────────────────
export const getClinic = async (req: AuthRequest, res: Response) => {
    const clinicId = String(req.params.clinicId || '');
    if (!clinicId) return res.status(400).json({ success: false, message: 'clinicId kerak' });

    const clinic = await prisma.clinic.findUnique({
        where: { id: clinicId },
        include: { paymeConfig: true },
    });
    if (!clinic) return res.status(404).json({ success: false, message: 'Klinika topilmadi' });

    // 24h stats from webhook log
    const since = new Date(Date.now() - 24 * 3600_000);
    const [okCount, failCount, recentLogs, versions, txCount] = await Promise.all([
        prisma.paymeWebhookLog.count({ where: { clinicId, createdAt: { gte: since }, errorCode: null } }),
        prisma.paymeWebhookLog.count({ where: { clinicId, createdAt: { gte: since }, errorCode: { not: null } } }),
        prisma.paymeWebhookLog.findMany({
            where: { clinicId },
            orderBy: { createdAt: 'desc' },
            take: 25,
            select: {
                id: true, method: true, errorCode: true, errorMsg: true,
                orderId: true, paymeId: true, durationMs: true, isTestMode: true,
                createdAt: true, ip: true,
            },
        }),
        prisma.paymeConfigVersion.findMany({
            where: { clinicId },
            orderBy: { version: 'desc' },
            take: 20,
            select: {
                id: true, version: true, merchantId: true, isTestMode: true,
                reason: true, changedBy: true, createdAt: true,
            },
        }),
        prisma.paymeTransaction.count({ where: { clinicId } }),
    ]);

    const cfg = clinic.paymeConfig;
    return res.json({
        success: true,
        data: {
            clinic: {
                id: clinic.id,
                name: clinic.nameUz,
                region: clinic.region,
                status: clinic.status,
                paymentMethods: clinic.paymentMethods,
            },
            config: cfg ? {
                merchantId: cfg.merchantId,
                isTestMode: cfg.isTestMode,
                isActive: cfg.isActive,
                connectedAt: cfg.connectedAt,
                lastUsedAt: cfg.lastUsedAt,
                lastRotatedAt: cfg.lastRotatedAt,
                createdAt: cfg.createdAt,
                updatedAt: cfg.updatedAt,
                webhookUrl: webhookUrlFor(clinic.id),
            } : null,
            stats24h: { ok: okCount, fail: failCount },
            txCount,
            recentLogs,
            versions,
        },
    });
};

// ─── POST /admin/payme/clinics/:clinicId/force-disable ──────────────────────
// Incident response: force-deactivate a config without removing the keys.
// Audit logged in PaymeConfigVersion (reason = "admin-force-disable").
export const forceDisable = async (req: AuthRequest, res: Response) => {
    const clinicId = String(req.params.clinicId || '');
    if (!clinicId) return res.status(400).json({ success: false, message: 'clinicId kerak' });
    const reason = String(req.body?.reason || '').trim().slice(0, 200);

    const cfg = await prisma.clinicPaymeConfig.findUnique({ where: { clinicId } });
    if (!cfg) return res.status(404).json({ success: false, message: 'Config topilmadi' });

    await prisma.$transaction(async (tx) => {
        await tx.clinicPaymeConfig.update({
            where: { clinicId },
            data: { isActive: false, updatedBy: req.user!.id },
        });

        const lastVersion = await tx.paymeConfigVersion.findFirst({
            where: { configId: cfg.id },
            orderBy: { version: 'desc' },
            select: { version: true },
        });
        const nextVersion = (lastVersion?.version ?? 0) + 1;

        await tx.paymeConfigVersion.create({
            data: {
                configId: cfg.id,
                clinicId,
                version: nextVersion,
                merchantId: cfg.merchantId,
                prodKeyCiphertext: cfg.prodKeyCiphertext,
                prodKeyIv: cfg.prodKeyIv,
                prodKeyTag: cfg.prodKeyTag,
                testKeyCiphertext: cfg.testKeyCiphertext,
                testKeyIv: cfg.testKeyIv,
                testKeyTag: cfg.testKeyTag,
                isTestMode: cfg.isTestMode,
                reason: `admin-force-disable: ${reason || 'no reason given'}`,
                changedBy: req.user!.id,
            },
        });

        // Sync clinic.paymentMethods
        const clinic = await tx.clinic.findUnique({
            where: { id: clinicId },
            select: { paymentMethods: true },
        });
        const methods = (clinic?.paymentMethods as string[] | null) ?? [];
        await tx.clinic.update({
            where: { id: clinicId },
            data: { paymentMethods: methods.filter((m) => m !== 'PAYME') },
        });
    });

    invalidateCache(clinicId);
    return res.json({ success: true });
};

// ─── GET /admin/payme/overview — platform-wide KPIs ──────────────────────────
export const getOverview = async (req: AuthRequest, res: Response) => {
    const since24 = new Date(Date.now() - 24 * 3600_000);

    const [
        totalClinics,
        liveCount,
        testCount,
        inactiveCount,
        noneCount,
        webhooksOk,
        webhooksFail,
    ] = await Promise.all([
        prisma.clinic.count(),
        prisma.clinicPaymeConfig.count({ where: { isActive: true, isTestMode: false } }),
        prisma.clinicPaymeConfig.count({ where: { isActive: true, isTestMode: true } }),
        prisma.clinicPaymeConfig.count({ where: { isActive: false } }),
        prisma.clinic.count({ where: { paymeConfig: { is: null } } }),
        prisma.paymeWebhookLog.count({ where: { createdAt: { gte: since24 }, errorCode: null } }),
        prisma.paymeWebhookLog.count({ where: { createdAt: { gte: since24 }, errorCode: { not: null } } }),
    ]);

    return res.json({
        success: true,
        data: {
            totalClinics,
            connected: liveCount + testCount,
            live: liveCount,
            test: testCount,
            inactive: inactiveCount,
            none: noneCount,
            webhooks24h: {
                ok: webhooksOk,
                fail: webhooksFail,
                total: webhooksOk + webhooksFail,
            },
        },
    });
};

// ─── GET /admin/payme/audit — recent config-change events ───────────────────
export const getAudit = async (req: AuthRequest, res: Response) => {
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || '30'), 10) || 30));
    const events = await prisma.paymeConfigVersion.findMany({
        orderBy: { createdAt: 'desc' },
        take: limit,
        select: {
            id: true,
            clinicId: true,
            version: true,
            merchantId: true,
            isTestMode: true,
            reason: true,
            changedBy: true,
            createdAt: true,
            clinic: { select: { nameUz: true } },
        },
    });

    const items = events.map((e) => ({
        id: e.id,
        clinicId: e.clinicId,
        clinicName: e.clinic?.nameUz ?? '—',
        version: e.version,
        merchantId: e.merchantId,
        isTestMode: e.isTestMode,
        reason: e.reason,
        changedBy: e.changedBy,
        createdAt: e.createdAt,
    }));

    return res.json({ success: true, data: { items } });
};
