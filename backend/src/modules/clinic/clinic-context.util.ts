import prisma from '../../config/database';
import { AppError, ErrorCodes } from '../../utils/errors';

/**
 * Resolve which clinic a user acts against.
 *
 * Prefers User.clinicId (the primary admin's linked clinic — that column is
 * @unique, so only one admin per clinic holds it), then falls back to the
 * user's oldest active ClinicMembership. The fallback is what lets SECONDARY
 * clinic admins — created with clinicId=null and reaching the clinic only via
 * membership — use the clinic panel (stats, profile, services, doctors,
 * reports, ambulances, …). Without it every such controller 404s for them.
 *
 * Mirrors the resolution order used by resolveClinicActor (appointments) so
 * the whole clinic surface agrees on which clinic a user belongs to.
 */
export async function resolveUserClinicId(userId: string): Promise<string | null> {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { clinicId: true },
    });
    if (user?.clinicId) return user.clinicId;

    const membership = await prisma.clinicMembership.findFirst({
        where: { userId, isActive: true },
        orderBy: { joinedAt: 'asc' },
        select: { clinicId: true },
    });
    return membership?.clinicId ?? null;
}

/** Same as resolveUserClinicId but throws a clean 404 when none resolves. */
export async function requireUserClinicId(userId: string): Promise<string> {
    const clinicId = await resolveUserClinicId(userId);
    if (!clinicId) throw new AppError('Klinika topilmadi', 404, ErrorCodes.NOT_FOUND);
    return clinicId;
}
