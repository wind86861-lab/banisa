import { Response, NextFunction } from 'express';
import { ClinicPermission } from '@prisma/client';
import prisma from '../config/database';
import { AppError, ErrorCodes } from '../utils/errors';
import { AuthRequest } from './auth.middleware';

/**
 * Extends the authenticated request with the resolved clinic context. Set by
 * loadClinicContext / requireClinicPermission so route handlers can read the
 * active membership instead of re-querying.
 */
export interface ClinicRequest extends AuthRequest {
    clinicContext?: {
        clinicId: string;
        membershipId: string;
        roleId: string;
        roleName: string;
        permissions: ClinicPermission[];
    };
}

/**
 * Resolve which clinic the request is acting against and load the caller's
 * active membership + role. We accept (in priority order):
 *   1. X-Clinic-Id header / query.clinicId       — explicit multi-clinic switch
 *   2. The user's User.clinicId column           — legacy "primary" clinic
 *   3. The user's single active membership       — common case after invite
 * The membership must be active. On miss we throw a clean 403.
 */
async function resolveContext(req: ClinicRequest): Promise<ClinicRequest['clinicContext']> {
    const userId = req.user?.id;
    if (!userId) throw new AppError('Authentication required', 401, ErrorCodes.UNAUTHORIZED);

    const explicit = (req.headers['x-clinic-id'] as string | undefined)
        || (req.query?.clinicId as string | undefined);

    // Quick read of the user's default clinicId as the fallback.
    const userRow = await prisma.user.findUnique({
        where: { id: userId },
        select: { clinicId: true },
    });

    const memberships = await prisma.clinicMembership.findMany({
        where: { userId, isActive: true },
        include: { role: { select: { id: true, name: true, permissions: true } } },
    });
    if (memberships.length === 0) {
        throw new AppError('Klinikada a\'zoligingiz topilmadi', 403, ErrorCodes.FORBIDDEN);
    }

    let chosen = memberships.find(m => m.clinicId === explicit)
        ?? memberships.find(m => m.clinicId === userRow?.clinicId)
        ?? memberships[0];

    return {
        clinicId: chosen.clinicId,
        membershipId: chosen.id,
        roleId: chosen.role.id,
        roleName: chosen.role.name,
        permissions: chosen.role.permissions,
    };
}

/**
 * Express middleware: load the clinic context (no permission check). Mount on
 * any /api/clinic route that needs to know which clinic the caller is acting
 * against; downstream requireClinicPermission(...) uses the same context.
 */
export const loadClinicContext = async (req: ClinicRequest, res: Response, next: NextFunction) => {
    try {
        req.clinicContext = await resolveContext(req);
        next();
    } catch (err) { next(err); }
};

/**
 * Permission gate. Pass ONE OR MORE permissions; the route is allowed when
 * the caller's role holds AT LEAST ONE of them. For AND-style multi-perm
 * requirements, chain multiple instances of this middleware.
 *
 * Touches lastSeenAt on the membership so /clinic/team can show who was
 * around recently without a separate online-status table.
 */
export const requireClinicPermission = (
    ...required: ClinicPermission[]
) => async (req: ClinicRequest, res: Response, next: NextFunction) => {
    try {
        if (!req.clinicContext) req.clinicContext = await resolveContext(req);
        const ctx = req.clinicContext!;
        const allowed = required.length === 0
            || required.some(p => ctx.permissions.includes(p));
        if (!allowed) {
            throw new AppError(
                `Bu amal uchun ruxsat yo'q (${required.join(', ')})`,
                403,
                ErrorCodes.FORBIDDEN,
            );
        }
        // Fire-and-forget; never block the request on this write.
        prisma.clinicMembership.update({
            where: { id: ctx.membershipId },
            data: { lastSeenAt: new Date() },
        }).catch(() => { /* swallow */ });
        next();
    } catch (err) { next(err); }
};
