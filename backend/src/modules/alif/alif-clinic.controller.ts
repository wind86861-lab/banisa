import { Response } from 'express';
import prisma from '../../config/database';
import { AuthRequest } from '../../middleware/auth.middleware';
import { env } from '../../config/env';
import { upsertAlifConfig, getAlifConfigPublic, invalidateAlifCache } from './alif-config.service';

async function resolveClinicId(userId: string): Promise<string | null> {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { clinicId: true } });
    return user?.clinicId ?? null;
}

function webhookUrl(): string {
    return `${env.PUBLIC_API_BASE_URL.replace(/\/$/, '')}/api/alif/webhook`;
}

// GET /api/clinic/payments/alif/config
export const getAlifConfig = async (req: AuthRequest, res: Response) => {
    const clinicId = await resolveClinicId(req.user!.id);
    if (!clinicId) return res.status(404).json({ success: false, message: 'Klinika topilmadi' });
    const config = await getAlifConfigPublic(clinicId);
    return res.json({ success: true, data: { config, webhookUrl: webhookUrl() } });
};

// PUT /api/clinic/payments/alif/config — enter/rotate Token + Key.
export const putAlifConfig = async (req: AuthRequest, res: Response) => {
    const clinicId = await resolveClinicId(req.user!.id);
    if (!clinicId) return res.status(404).json({ success: false, message: 'Klinika topilmadi' });

    const { prodToken, prodKey, testToken, testKey, isTestMode } = req.body || {};
    const has = await prisma.clinicAlifConfig.findUnique({ where: { clinicId } });

    // On first connect prod Token + Key are required; on edit they may be blank
    // (keep the existing sealed values).
    if (!has && (!prodToken || !prodKey)) {
        return res.status(400).json({ success: false, message: 'Prod Token va Key kerak' });
    }

    try {
        const saved = await upsertAlifConfig(clinicId, {
            prodToken: prodToken ? String(prodToken).trim() : undefined,
            prodKey: prodKey ? String(prodKey).trim() : undefined,
            testToken: testToken ? String(testToken).trim() : null,
            testKey: testKey ? String(testKey).trim() : null,
            isTestMode: typeof isTestMode === 'boolean' ? isTestMode : undefined,
            actorId: req.user!.id,
        });
        return res.json({ success: true, data: { config: { isActive: saved.isActive, isTestMode: saved.isTestMode } } });
    } catch (e: any) {
        return res.status(400).json({ success: false, message: e?.message || 'Saqlashda xatolik' });
    }
};

// PATCH /api/clinic/payments/alif/config/active
export const patchAlifActive = async (req: AuthRequest, res: Response) => {
    const clinicId = await resolveClinicId(req.user!.id);
    if (!clinicId) return res.status(404).json({ success: false, message: 'Klinika topilmadi' });

    const { isActive } = req.body || {};
    if (typeof isActive !== 'boolean') return res.status(400).json({ success: false, message: 'isActive boolean bo\'lishi kerak' });

    const row = await prisma.clinicAlifConfig.findUnique({ where: { clinicId } });
    if (!row) return res.status(404).json({ success: false, message: 'Avval Alif ma\'lumotlarini kiriting' });

    const updated = await prisma.clinicAlifConfig.update({ where: { clinicId }, data: { isActive } });
    invalidateAlifCache(clinicId);

    // Keep the clinic's advertised paymentMethods in sync so the patient
    // checkout offers (or hides) Alif automatically.
    const clinic = await prisma.clinic.findUnique({ where: { id: clinicId }, select: { paymentMethods: true } });
    const methods: string[] = Array.isArray(clinic?.paymentMethods) ? (clinic!.paymentMethods as string[]) : [];
    const hasAlif = methods.includes('ALIF');
    let next = methods;
    if (isActive && !hasAlif) next = [...methods, 'ALIF'];
    else if (!isActive && hasAlif) next = methods.filter((m) => m !== 'ALIF');
    if (next !== methods) {
        await prisma.clinic.update({ where: { id: clinicId }, data: { paymentMethods: next } });
    }

    return res.json({ success: true, data: { isActive: updated.isActive } });
};

// PATCH /api/clinic/payments/alif/config/mode — test ↔ live.
export const patchAlifMode = async (req: AuthRequest, res: Response) => {
    const clinicId = await resolveClinicId(req.user!.id);
    if (!clinicId) return res.status(404).json({ success: false, message: 'Klinika topilmadi' });

    const { isTestMode } = req.body || {};
    if (typeof isTestMode !== 'boolean') return res.status(400).json({ success: false, message: 'isTestMode boolean bo\'lishi kerak' });

    const row = await prisma.clinicAlifConfig.findUnique({ where: { clinicId } });
    if (!row) return res.status(404).json({ success: false, message: 'Avval Alif ma\'lumotlarini kiriting' });

    const updated = await prisma.clinicAlifConfig.update({ where: { clinicId }, data: { isTestMode } });
    invalidateAlifCache(clinicId);
    return res.json({ success: true, data: { isTestMode: updated.isTestMode } });
};
