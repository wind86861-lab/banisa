import { Response } from 'express';
import prisma from '../../config/database';
import { AuthRequest } from '../../middleware/auth.middleware';

// Singleton row. We don't enforce a hardcoded id — `findFirst` + upsert
// behaviour: create on first PUT, update thereafter.

export const getAmbulanceSettings = async (_req: AuthRequest, res: Response) => {
    const row = await prisma.globalAmbulanceSettings.findFirst({ orderBy: { createdAt: 'asc' } });
    return res.json({ success: true, data: row });
};

export const putAmbulanceSettings = async (req: AuthRequest, res: Response) => {
    const b = req.body || {};
    const defaultPricePerKm = b.defaultPricePerKm == null || b.defaultPricePerKm === ''
        ? null
        : Math.max(0, Math.round(Number(b.defaultPricePerKm)));
    const defaultBaseFee = b.defaultBaseFee == null || b.defaultBaseFee === ''
        ? null
        : Math.max(0, Math.round(Number(b.defaultBaseFee)));
    if (defaultPricePerKm != null && !Number.isFinite(defaultPricePerKm)) {
        return res.status(400).json({ success: false, message: 'defaultPricePerKm noto\'g\'ri' });
    }
    if (defaultBaseFee != null && !Number.isFinite(defaultBaseFee)) {
        return res.status(400).json({ success: false, message: 'defaultBaseFee noto\'g\'ri' });
    }

    const existing = await prisma.globalAmbulanceSettings.findFirst({ orderBy: { createdAt: 'asc' } });
    const data = { defaultPricePerKm, defaultBaseFee, updatedBy: req.user!.id };

    const saved = existing
        ? await prisma.globalAmbulanceSettings.update({ where: { id: existing.id }, data })
        : await prisma.globalAmbulanceSettings.create({ data });

    return res.json({ success: true, data: saved });
};
