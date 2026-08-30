import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import prisma from '../../config/database';
import { env } from '../../config/env';
import { AppError, ErrorCodes } from '../../utils/errors';
import { ClinicRequest } from '../../middleware/clinic-permission.middleware';

const MAX_IDS = 200;

/** Parse a comma-separated id list from a query param; throws 400 if empty. */
function parseIds(raw: unknown, field: string): string[] {
    const ids = [...new Set(String(raw || '').split(',').map(s => s.trim()).filter(Boolean))];
    if (!ids.length) throw new AppError(`${field} majburiy`, 400, ErrorCodes.VALIDATION_ERROR);
    if (ids.length > MAX_IDS) throw new AppError(`Bir so'rovda ko'pi bilan ${MAX_IDS} ta`, 400, ErrorCodes.VALIDATION_ERROR);
    return ids;
}

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
 *     categories: [{ id, nameUz, nameRu, nameEn, slug, parentId, sortOrder, level }],  // full branch: root → soha → bo'lim
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
        //
        // Operations always live on the LEAF (level-2) category, but the partner
        // needs the whole branch — soha (level 1) → bo'lim (level 2) — to group
        // them, so walk parentId up to the root. Without this every returned
        // category's parentId pointed at a row not in the response (all orphans).
        const catSelect = {
            id: true,
            nameUz: true,
            nameRu: true,
            nameEn: true,
            slug: true,
            parentId: true,
            sortOrder: true,
            level: true,
        };
        const catWhere: any = { surgicalServices: { some: includeInactive ? {} : { isActive: true } } };
        let categories = await prisma.serviceCategory.findMany({ where: catWhere, select: catSelect });

        // Climb ancestor levels until every parentId resolves within the set.
        // The tree is 3 deep, so this loops at most twice.
        const seen = new Set(categories.map(c => c.id));
        let missing = categories
            .map(c => c.parentId)
            .filter((id): id is string => typeof id === 'string' && !seen.has(id));
        while (missing.length) {
            const parents = await prisma.serviceCategory.findMany({
                where: { id: { in: [...new Set(missing)] } },
                select: catSelect,
            });
            if (!parents.length) break; // guard against a broken parent link / cycle
            categories = categories.concat(parents);
            parents.forEach(p => seen.add(p.id));
            missing = parents
                .map(p => p.parentId)
                .filter((id): id is string => typeof id === 'string' && !seen.has(id));
        }

        categories.sort((a, b) =>
            (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.nameUz.localeCompare(b.nameUz));

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

/**
 * POST /api/partner/link-ticket  (clinic session, not the partner key)
 *
 * The "Connect to KlinikaTop" button calls this. Returns a short-lived signed
 * ticket that KlinikaTop verifies to identify the clinic — no form to fill in.
 *
 * Signed with LINK_TICKET_SECRET (HS256 = HMAC-SHA256), a SEPARATE secret from
 * the JWT session secrets so one leak can't open both. 60s TTL because the
 * ticket rides in a redirect URL, and a random jti so KlinikaTop can reject a
 * replay (Banisa stores nothing). If the secret is unset/misconfigured the
 * feature is disabled (503) rather than minting weak tickets.
 */
export const createLinkTicket = async (req: ClinicRequest, res: Response, next: NextFunction) => {
    try {
        const secret = env.LINK_TICKET_SECRET;
        if (!secret || secret === env.JWT_ACCESS_SECRET || secret === env.JWT_SECRET) {
            throw new AppError('KlinikaTop ulanishi sozlanmagan', 503, ErrorCodes.SERVER_ERROR);
        }
        const clinicId = req.clinicContext!.clinicId;
        const userId = req.user!.id;
        const user = await prisma.user.findUnique({ where: { id: userId }, select: { phone: true } });

        const ticket = jwt.sign(
            { clinicId, userId, phone: user?.phone ?? null },
            secret,
            { algorithm: 'HS256', expiresIn: '60s', jwtid: randomUUID() },
        );
        // Build the hand-off URL server-side so the redirect target stays a
        // backend setting (KLINIKATOP_URL) — the panel just follows it.
        const base = env.KLINIKATOP_URL.replace(/\/+$/, '');
        const redirectUrl = `${base}/ulanish?ticket=${encodeURIComponent(ticket)}`;
        // Never cache a credential.
        res.set('Cache-Control', 'no-store');
        res.json({ ticket, expiresIn: 60, redirectUrl });
    } catch (e) {
        next(e);
    }
};

/**
 * GET /api/partner/clinics?ids=a,b,c  (partner key)
 *
 * Clinic profiles so KlinikaTop can fill its own record without the clinic
 * re-typing a form. `ids` is mandatory (400 if missing) and capped at 200 so a
 * keyless-shaped mistake can't dump the whole clinic base.
 */
export const getClinics = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const ids = parseIds(req.query.ids, 'ids');
        const rows = await prisma.clinic.findMany({
            where: { id: { in: ids } },
            select: {
                id: true, nameUz: true, nameRu: true, region: true,
                addressUz: true, addressRu: true, district: true, street: true,
                phones: true, logo: true, status: true,
                licenseNumber: true, licenseExpiresAt: true,
            },
        });
        const clinics = rows.map(c => ({
            id: c.id,
            nameUz: c.nameUz,
            nameRu: c.nameRu ?? null,
            region: c.region,
            // Prefer the explicit localized address; fall back to the composed
            // region/district/street so a partner always has something to show.
            addressUz: c.addressUz || [c.region, c.district, c.street].filter(Boolean).join(', '),
            addressRu: c.addressRu ?? null,
            phones: Array.isArray(c.phones) ? c.phones : [],
            logo: c.logo ?? null,
            status: c.status,
            licenseNumber: c.licenseNumber ?? null,
            licenseExpiresAt: c.licenseExpiresAt ?? null,
        }));
        res.set('Cache-Control', 'public, max-age=30');
        res.json({ clinics });
    } catch (e) {
        next(e);
    }
};

/**
 * GET /api/partner/clinic-operations?clinicIds=a,b,c  (partner key)
 *
 * Which operations each clinic has enabled — the steady-state sync KlinikaTop
 * pulls every ~10 min. Returns the FULL link set (active AND inactive) so a
 * deactivation shows up as isActive:false; an incremental feed couldn't express
 * a removal, and ClinicSurgicalService has no updatedAt to drive one anyway.
 */
export const getClinicOperations = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const ids = parseIds(req.query.clinicIds, 'clinicIds');
        const links = await prisma.clinicSurgicalService.findMany({
            where: { clinicId: { in: ids } },
            orderBy: [{ clinicId: 'asc' }, { surgicalServiceId: 'asc' }],
            select: { clinicId: true, surgicalServiceId: true, isActive: true },
        });
        res.set('Cache-Control', 'public, max-age=30');
        res.json({
            generatedAt: new Date().toISOString(),
            links: links.map(l => ({ clinicId: l.clinicId, operationId: l.surgicalServiceId, isActive: l.isActive })),
        });
    } catch (e) {
        next(e);
    }
};
