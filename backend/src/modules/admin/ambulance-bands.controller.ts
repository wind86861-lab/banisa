import { Response } from 'express';
import prisma from '../../config/database';
import { AuthRequest } from '../../middleware/auth.middleware';

// SUPER_ADMIN-managed tez-yordam distance bands. Each band is a km range the
// patient's trip can fall into; every ambulance fills a per-band tariff. Bands
// are dynamic — admin adds/edits/deactivates them as the market changes.

const toKm = (v: any, fallback: number | null): number | null => {
    if (v == null || v === '') return fallback;
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 ? n : fallback;
};

export const listBands = async (_req: AuthRequest, res: Response) => {
    const bands = await prisma.ambulancePricingBand.findMany({
        orderBy: [{ sortOrder: 'asc' }, { minKm: 'asc' }],
        include: { _count: { select: { tariffs: true } } },
    });
    return res.json({ success: true, data: { items: bands } });
};

export const createBand = async (req: AuthRequest, res: Response) => {
    const b = req.body || {};
    const label = typeof b.label === 'string' ? b.label.trim() : '';
    if (!label) return res.status(400).json({ success: false, message: 'Nom (label) kerak' });

    const minKm = toKm(b.minKm, 0) ?? 0;
    const maxKm = toKm(b.maxKm, null);
    if (maxKm != null && maxKm <= minKm) {
        return res.status(400).json({ success: false, message: 'maxKm minKm dan katta bo\'lishi kerak' });
    }
    const sortOrder = Number.isFinite(Number(b.sortOrder)) ? Math.round(Number(b.sortOrder)) : 0;

    const created = await prisma.ambulancePricingBand.create({
        data: { label, minKm, maxKm, sortOrder, isActive: b.isActive !== false },
    });
    return res.json({ success: true, data: created });
};

export const updateBand = async (req: AuthRequest, res: Response) => {
    const id = String(req.params.id || '');
    const b = req.body || {};
    const data: any = {};
    if (typeof b.label === 'string' && b.label.trim()) data.label = b.label.trim();
    if (b.minKm !== undefined) data.minKm = toKm(b.minKm, 0) ?? 0;
    if (b.maxKm !== undefined) data.maxKm = toKm(b.maxKm, null);
    if (b.sortOrder !== undefined && Number.isFinite(Number(b.sortOrder))) data.sortOrder = Math.round(Number(b.sortOrder));
    if (typeof b.isActive === 'boolean') data.isActive = b.isActive;

    // Validate the resulting range if either bound changed.
    if (data.minKm !== undefined || data.maxKm !== undefined) {
        const current = await prisma.ambulancePricingBand.findUnique({ where: { id } });
        if (!current) return res.status(404).json({ success: false, message: 'Poyas topilmadi' });
        const min = data.minKm ?? current.minKm;
        const max = data.maxKm !== undefined ? data.maxKm : current.maxKm;
        if (max != null && max <= min) {
            return res.status(400).json({ success: false, message: 'maxKm minKm dan katta bo\'lishi kerak' });
        }
    }

    const updated = await prisma.ambulancePricingBand.update({ where: { id }, data });
    return res.json({ success: true, data: updated });
};

export const deleteBand = async (req: AuthRequest, res: Response) => {
    const id = String(req.params.id || '');
    // Cascade drops any per-ambulance tariffs for this band.
    await prisma.ambulancePricingBand.delete({ where: { id } });
    return res.json({ success: true });
};
