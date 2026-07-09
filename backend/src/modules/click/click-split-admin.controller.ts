import { Response } from 'express';
import prisma from '../../config/database';
import { AuthRequest } from '../../middleware/auth.middleware';
import {
    getGlobalSplitConfigPublic,
    upsertGlobalSplitConfig,
} from './click-split-config.service';

const CLICK_NUMERIC_ID = /^\d{1,15}$/;

// ─── GET /admin/click/split/config — global Banisa Split-Shop config ────────
export const getGlobalConfig = async (req: AuthRequest, res: Response) => {
    const config = await getGlobalSplitConfigPublic();
    return res.json({ success: true, data: { config } });
};

// ─── PUT /admin/click/split/config — create/update the global config ───────
export const putGlobalConfig = async (req: AuthRequest, res: Response) => {
    const {
        serviceId, merchantId, merchantUserId, prodKey, testKey, isTestMode, isActive,
        banisaCntrgId, banisaInn, banisaBranchId,
        banisaPaymentAccount, banisaPaymentMfo, banisaTransitAccount, banisaTransitMfo,
    } = req.body || {};

    if (typeof serviceId !== 'string' || !CLICK_NUMERIC_ID.test(serviceId.trim())) {
        return res.status(400).json({ success: false, message: 'serviceId noto\'g\'ri (raqamlar)' });
    }
    if (typeof merchantId !== 'string' || !CLICK_NUMERIC_ID.test(merchantId.trim())) {
        return res.status(400).json({ success: false, message: 'merchantId noto\'g\'ri (raqamlar)' });
    }
    if (prodKey && (typeof prodKey !== 'string' || prodKey.trim().length < 6)) {
        return res.status(400).json({ success: false, message: 'Production kalit noto\'g\'ri (kamida 6 belgi)' });
    }
    if (testKey && (typeof testKey !== 'string' || testKey.trim().length < 6)) {
        return res.status(400).json({ success: false, message: 'Test kalit noto\'g\'ri' });
    }

    try {
        const saved = await upsertGlobalSplitConfig({
            serviceId: serviceId.trim(),
            merchantId: merchantId.trim(),
            merchantUserId: typeof merchantUserId === 'string' && merchantUserId.trim() ? merchantUserId.trim() : null,
            prodKey: prodKey ? String(prodKey).trim() : undefined,
            testKey: testKey ? String(testKey).trim() : null,
            isTestMode: typeof isTestMode === 'boolean' ? isTestMode : undefined,
            isActive: typeof isActive === 'boolean' ? isActive : undefined,
            banisaCntrgId: banisaCntrgId != null ? String(banisaCntrgId).trim() : null,
            banisaInn: banisaInn != null ? String(banisaInn).trim() : null,
            banisaBranchId: banisaBranchId != null ? String(banisaBranchId).trim() : null,
            banisaPaymentAccount: banisaPaymentAccount != null ? String(banisaPaymentAccount).trim() : null,
            banisaPaymentMfo: banisaPaymentMfo != null ? String(banisaPaymentMfo).trim() : null,
            banisaTransitAccount: banisaTransitAccount != null ? String(banisaTransitAccount).trim() : null,
            banisaTransitMfo: banisaTransitMfo != null ? String(banisaTransitMfo).trim() : null,
            actorId: req.user!.id,
        });
        return res.json({
            success: true,
            data: { config: { ...saved, prodKeyCiphertext: undefined, prodKeyIv: undefined, prodKeyTag: undefined, testKeyCiphertext: undefined, testKeyIv: undefined, testKeyTag: undefined } },
        });
    } catch (e: any) {
        return res.status(400).json({ success: false, message: e?.message || 'Saqlashda xatolik' });
    }
};

// ─── GET /admin/click/split/clinics — every clinic's split routing status ───
export const listSplitClinics = async (req: AuthRequest, res: Response) => {
    const clinics = await prisma.clinic.findMany({
        select: {
            id: true,
            nameUz: true,
            region: true,
            status: true,
            clickSplitConfig: true,
        },
        orderBy: { nameUz: 'asc' },
    });

    const items = clinics.map((c) => {
        const s = c.clickSplitConfig;
        return {
            clinicId: c.id,
            clinicName: c.nameUz,
            region: c.region,
            clinicStatus: c.status,
            isConfigured: s?.isConfigured ?? false,
            isActive: s?.isActive ?? false,
            // Full contract dossier the clinic shared — Banisa compiles the
            // Click Split-Shop counterparty agreement from this.
            inn: s?.inn ?? null,
            branchId: s?.branchId ?? null,
            cntrgId: s?.cntrgId ?? null,
            legalName: s?.legalName ?? null,
            directorName: s?.directorName ?? null,
            legalAddress: s?.legalAddress ?? null,
            bankName: s?.bankName ?? null,
            oked: s?.oked ?? null,
            contactPhone: s?.contactPhone ?? null,
            paymentAccount: s?.paymentAccount ?? null,
            paymentMfo: s?.paymentMfo ?? null,
            transitAccount: s?.transitAccount ?? null,
            transitMfo: s?.transitMfo ?? null,
            updatedAt: s?.updatedAt ?? null,
        };
    });

    return res.json({ success: true, data: { items, total: items.length } });
};

// ─── PATCH /admin/click/split/clinics/:clinicId/active ──────────────────────
// Super-admin-only gate: a clinic must have filled in its rekvizit
// (isConfigured) before Banisa can route split payments to it.
export const patchClinicSplitActive = async (req: AuthRequest, res: Response) => {
    const clinicId = String(req.params.clinicId || '');
    const { isActive } = req.body || {};
    if (typeof isActive !== 'boolean') {
        return res.status(400).json({ success: false, message: 'isActive boolean bo\'lishi kerak' });
    }

    const row = await prisma.clinicClickSplitConfig.findUnique({ where: { clinicId } });
    if (!row) return res.status(404).json({ success: false, message: 'Klinika split rekviziti kiritmagan' });
    if (isActive && !row.isConfigured) {
        return res.status(412).json({ success: false, message: 'Klinika hali barcha rekvizitlarni kiritmagan' });
    }

    const updated = await prisma.clinicClickSplitConfig.update({
        where: { clinicId },
        data: { isActive },
    });
    return res.json({ success: true, data: { isActive: updated.isActive } });
};
