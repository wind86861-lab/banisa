import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../../middleware/auth.middleware';
import { AppError, ErrorCodes } from '../../utils/errors';
import { sendSuccess } from '../../utils/response';
import prisma from '../../config/database';

const ALLOWED_TYPES = ['DIAGNOSTIC', 'SURGICAL'] as const;
type SvcType = (typeof ALLOWED_TYPES)[number];

export const toggleFavoriteSchema = z.object({
    body: z.object({
        serviceType: z.enum(ALLOWED_TYPES),
        serviceId: z.string().uuid('Noto\'g\'ri xizmat ID'),
    }),
});

export const favoritesController = {
    // GET /api/user/favorites — hydrate with service details
    list: async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const rows = await prisma.userFavorite.findMany({
                where: { userId: req.user!.id },
                orderBy: { createdAt: 'desc' },
                take: 200,
            });

            const byType: Record<SvcType, string[]> = { DIAGNOSTIC: [], SURGICAL: [] };
            for (const r of rows) byType[r.serviceType as SvcType]?.push(r.serviceId);

            const [diag, surg] = await Promise.all([
                byType.DIAGNOSTIC.length ? prisma.diagnosticService.findMany({
                    where: { id: { in: byType.DIAGNOSTIC }, isActive: true },
                    select: {
                        id: true, nameUz: true, shortDescription: true, priceMin: true,
                        priceMax: true, priceRecommended: true,
                        category: { select: { nameUz: true } },
                    },
                }) : [],
                byType.SURGICAL.length ? prisma.surgicalService.findMany({
                    where: { id: { in: byType.SURGICAL }, isActive: true },
                    select: {
                        id: true, nameUz: true, shortDescription: true, priceMin: true,
                        priceMax: true, priceRecommended: true,
                        category: { select: { nameUz: true } },
                    },
                }) : [],
            ]);

            const diagMap = new Map(diag.map(d => [d.id, d]));
            const surgMap = new Map(surg.map(s => [s.id, s]));

            const data = rows.map(r => {
                const svc =
                    r.serviceType === 'DIAGNOSTIC' ? diagMap.get(r.serviceId) :
                    r.serviceType === 'SURGICAL' ? surgMap.get(r.serviceId) :
                    null;
                if (!svc) return null;
                return {
                    favoriteId: r.id,
                    serviceType: r.serviceType,
                    serviceId: r.serviceId,
                    addedAt: r.createdAt,
                    service: {
                        id: svc.id,
                        title: svc.nameUz,
                        category: svc.category?.nameUz ?? 'Umumiy',
                        desc: svc.shortDescription ?? '',
                        price: svc.priceRecommended ?? svc.priceMin ?? 0,
                    },
                };
            }).filter(Boolean);

            sendSuccess(res, data, { total: data.length });
        } catch (err) { next(err); }
    },

    // GET /api/user/favorites/ids — light: just the {serviceType, serviceId} pairs.
    // Used by service cards to render the heart filled/outline without hydrating.
    ids: async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const rows = await prisma.userFavorite.findMany({
                where: { userId: req.user!.id },
                select: { serviceType: true, serviceId: true },
            });
            sendSuccess(res, rows);
        } catch (err) { next(err); }
    },

    // POST /api/user/favorites/toggle
    toggle: async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const { serviceType, serviceId } = req.body as { serviceType: SvcType; serviceId: string };
            const existing = await prisma.userFavorite.findUnique({
                where: {
                    userId_serviceType_serviceId: {
                        userId: req.user!.id, serviceType, serviceId,
                    },
                },
            });
            if (existing) {
                await prisma.userFavorite.delete({ where: { id: existing.id } });
                return sendSuccess(res, { added: false });
            }
            await prisma.userFavorite.create({
                data: { userId: req.user!.id, serviceType, serviceId },
            });
            sendSuccess(res, { added: true });
        } catch (err) { next(err); }
    },

    // DELETE /api/user/favorites/:id
    remove: async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const fav = await prisma.userFavorite.findFirst({
                where: { id: String(req.params.id), userId: req.user!.id },
            });
            if (!fav) throw new AppError('Topilmadi', 404, ErrorCodes.NOT_FOUND);
            await prisma.userFavorite.delete({ where: { id: fav.id } });
            sendSuccess(res, null);
        } catch (err) { next(err); }
    },
};
