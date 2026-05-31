import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../../config/database';
import { requireAuth, requireRole, AuthRequest } from '../../middleware/auth.middleware';
import { AppError, ErrorCodes } from '../../utils/errors';

const router = Router();

// ─── PUBLIC: current active oferta ─────────────────────────────────────────
router.get('/current', async (_req: Request, res: Response, next: NextFunction) => {
    try {
        const current = await prisma.ofertaVersion.findFirst({
            where: { isActive: true },
            orderBy: { uploadedAt: 'desc' },
            select: { id: true, version: true, fileUrl: true, fileName: true, uploadedAt: true },
        });
        res.json({ success: true, data: current });
    } catch (e) { next(e); }
});

// ─── ADMIN: list all versions ─────────────────────────────────────────────
router.get(
    '/admin',
    requireAuth,
    requireRole(['SUPER_ADMIN']),
    async (_req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const versions = await prisma.ofertaVersion.findMany({
                orderBy: { uploadedAt: 'desc' },
            });
            res.json({ success: true, data: versions });
        } catch (e) { next(e); }
    },
);

// ─── ADMIN: create new version (uploads must have happened first via /upload/pdf) ──
const createSchema = z.object({
    version: z.string().min(1).max(50),
    fileUrl: z.string().min(1).max(500),
    fileName: z.string().max(255).optional(),
});

router.post(
    '/admin',
    requireAuth,
    requireRole(['SUPER_ADMIN']),
    async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const body = createSchema.parse(req.body);
            const created = await prisma.$transaction(async (tx) => {
                // Deactivate any existing active version
                await tx.ofertaVersion.updateMany({ where: { isActive: true }, data: { isActive: false } });
                // Insert new version as active
                return tx.ofertaVersion.create({
                    data: {
                        version: body.version,
                        fileUrl: body.fileUrl,
                        fileName: body.fileName,
                        isActive: true,
                        uploadedById: req.user!.id,
                    },
                });
            });
            res.json({ success: true, data: created });
        } catch (e) {
            if (e instanceof z.ZodError) {
                return next(new AppError('Noto\'g\'ri ma\'lumot', 400, ErrorCodes.VALIDATION_ERROR));
            }
            next(e);
        }
    },
);

// ─── ADMIN: activate a specific version (deactivates others) ───────────────
router.post(
    '/admin/:id/activate',
    requireAuth,
    requireRole(['SUPER_ADMIN']),
    async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const id = req.params.id as string;
            const exists = await prisma.ofertaVersion.findUnique({ where: { id } });
            if (!exists) throw new AppError('Versiya topilmadi', 404, ErrorCodes.NOT_FOUND);
            await prisma.$transaction([
                prisma.ofertaVersion.updateMany({ where: { isActive: true }, data: { isActive: false } }),
                prisma.ofertaVersion.update({ where: { id }, data: { isActive: true } }),
            ]);
            res.json({ success: true });
        } catch (e) { next(e); }
    },
);

export default router;
