import { Response } from 'express';
import prisma from '../../config/database';
import { AuthRequest } from '../../middleware/auth.middleware';

const slugify = (s: string) =>
    s.toLowerCase()
        .trim()
        .replace(/[^\p{L}\p{N}\s-]/gu, '')
        .replace(/\s+/g, '-')
        .replace(/--+/g, '-')
        .slice(0, 60);

export const listSpecialties = async (_req: AuthRequest, res: Response) => {
    const items = await prisma.specialty.findMany({
        orderBy: [{ sortOrder: 'asc' }, { nameUz: 'asc' }],
        include: { _count: { select: { doctors: true } } },
    });
    return res.json({
        success: true,
        data: { items: items.map((s) => ({ ...s, doctorCount: s._count.doctors })) },
    });
};

export const createSpecialty = async (req: AuthRequest, res: Response) => {
    const { nameUz, nameRu, nameEn, icon, sortOrder } = req.body || {};
    if (typeof nameUz !== 'string' || nameUz.trim().length < 2) {
        return res.status(400).json({ success: false, message: 'nameUz kerak' });
    }
    let slug = slugify(nameUz);
    let suffix = 0;
    while (await prisma.specialty.findUnique({ where: { slug } })) {
        suffix += 1;
        slug = `${slugify(nameUz)}-${suffix}`;
    }
    const created = await prisma.specialty.create({
        data: {
            slug,
            nameUz: nameUz.trim(),
            nameRu: nameRu?.trim() || null,
            nameEn: nameEn?.trim() || null,
            icon: icon?.trim() || null,
            sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
        },
    });
    return res.json({ success: true, data: created });
};

export const updateSpecialty = async (req: AuthRequest, res: Response) => {
    const id = String(req.params.id || '');
    const { nameUz, nameRu, nameEn, icon, sortOrder, isActive } = req.body || {};
    const data: any = {};
    if (typeof nameUz === 'string' && nameUz.trim().length >= 2) data.nameUz = nameUz.trim();
    if (typeof nameRu === 'string') data.nameRu = nameRu.trim() || null;
    if (typeof nameEn === 'string') data.nameEn = nameEn.trim() || null;
    if (typeof icon === 'string') data.icon = icon.trim() || null;
    if (Number.isFinite(sortOrder)) data.sortOrder = sortOrder;
    if (typeof isActive === 'boolean') data.isActive = isActive;

    const updated = await prisma.specialty.update({ where: { id }, data });
    return res.json({ success: true, data: updated });
};

export const deleteSpecialty = async (req: AuthRequest, res: Response) => {
    const id = String(req.params.id || '');
    const doctorCount = await prisma.doctor.count({ where: { specialtyId: id } });
    if (doctorCount > 0) {
        // Soft-delete to preserve FK integrity
        await prisma.specialty.update({ where: { id }, data: { isActive: false } });
        return res.json({
            success: true,
            data: { soft: true, message: `${doctorCount} doktorga bog'langan — faolsiz qilindi` },
        });
    }
    await prisma.specialty.delete({ where: { id } });
    return res.json({ success: true, data: { soft: false } });
};

// Public list — used by clinic admin dropdown and user filter
export const listSpecialtiesPublic = async (_req: any, res: Response) => {
    const items = await prisma.specialty.findMany({
        where: { isActive: true },
        orderBy: [{ sortOrder: 'asc' }, { nameUz: 'asc' }],
        select: { id: true, slug: true, nameUz: true, nameRu: true, nameEn: true, icon: true },
    });
    return res.json({ success: true, data: { items } });
};
