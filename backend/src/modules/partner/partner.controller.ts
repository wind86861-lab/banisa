import { Request, Response, NextFunction } from 'express';
import prisma from '../../config/database';

/**
 * GET /api/partner/operations
 *
 * Read-only feed of the surgical-operation catalog for a trusted external
 * platform. Reads straight from the master catalog, so anything a super-admin
 * adds / renames / deactivates in Banisa shows up on the next pull.
 *
 * Query params:
 *   - includeInactive=true : also return operations with isActive=false
 *     (each row carries `isActive`, so a partner can mirror soft-deletes).
 *     Default: only active operations.
 *   - updatedSince=<ISO>   : only operations changed at/after this timestamp,
 *     for cheap incremental sync. Invalid dates are ignored (full list).
 *
 * Shape:
 *   {
 *     generatedAt: ISO,
 *     categories: [{ id, nameUz, nameRu, nameEn, slug, parentId, sortOrder }],
 *     operations: [{ id, nameUz, nameRu, nameEn, categoryId, isActive, updatedAt }],
 *     meta: { operationCount, categoryCount }
 *   }
 */
export const getOperations = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const includeInactive = String(req.query.includeInactive || '') === 'true';

        const where: any = {};
        if (!includeInactive) where.isActive = true;

        const sinceRaw = req.query.updatedSince ? String(req.query.updatedSince) : '';
        if (sinceRaw) {
            const since = new Date(sinceRaw);
            if (!Number.isNaN(since.getTime())) where.updatedAt = { gte: since };
        }

        const operations = await prisma.surgicalService.findMany({
            where,
            orderBy: [{ nameUz: 'asc' }],
            select: {
                id: true,
                nameUz: true,
                nameRu: true,
                nameEn: true,
                categoryId: true,
                isActive: true,
                updatedAt: true,
            },
        });

        // Return the categories those operations belong to (not the whole shared
        // category tree, which also holds diagnostic/sanatorium branches). Pull
        // the distinct category ids from the operation set. When updatedSince
        // narrows the operations, still return the FULL active-operation category
        // set so a partner always has a name for every categoryId it may hold.
        const catWhere: any = { surgicalServices: { some: includeInactive ? {} : { isActive: true } } };
        const categories = await prisma.serviceCategory.findMany({
            where: catWhere,
            orderBy: [{ sortOrder: 'asc' }, { nameUz: 'asc' }],
            select: {
                id: true,
                nameUz: true,
                nameRu: true,
                nameEn: true,
                slug: true,
                parentId: true,
                sortOrder: true,
            },
        });

        res.set('Cache-Control', 'public, max-age=30');
        res.json({
            success: true,
            generatedAt: new Date().toISOString(),
            categories,
            operations,
            meta: { operationCount: operations.length, categoryCount: categories.length },
        });
    } catch (e) {
        next(e);
    }
};
