import type { Prisma, PrismaClient, ClinicPermission } from '@prisma/client';

/**
 * Canonical system-role definitions for a clinic. These MUST stay in sync
 * with the seed used by the RBAC migrations (20260610190000 +
 * 20260611120000). Historically the OWNER membership + system roles were
 * only ever created once, inside 20260610150000_add_clinic_membership_rbac,
 * for clinics that existed at migration time. Every clinic approved/created
 * AFTER that migration ended up with NO ClinicRole rows and NO
 * ClinicMembership — which made the Team module 403 ("Klinikada a'zoligingiz
 * topilmadi") and locked secondary admins (clinicId=null) out of every
 * clinic route. This helper closes that gap at runtime.
 *
 * DIRECTOR — read-only report consumer.
 * CLINIC_ADMIN — full operational control (everything except clinic deletion,
 * which stays gated to the platform SUPER_ADMIN).
 */
const DIRECTOR_PERMISSIONS: ClinicPermission[] = [
    'BOOKING_VIEW',
    'PATIENT_VIEW',
    'PAYMENT_VIEW',
    'TEAM_VIEW',
    'REPORTS_DAILY',
    'REPORTS_EXPORT',
] as ClinicPermission[];

const CLINIC_ADMIN_PERMISSIONS: ClinicPermission[] = [
    'BOOKING_VIEW', 'BOOKING_ACCEPT', 'BOOKING_RESCHEDULE',
    'PATIENT_VIEW', 'PATIENT_CONTACT',
    'PAYMENT_VIEW', 'PAYMENT_CONFIRM_CASH',
    'TEAM_VIEW', 'TEAM_INVITE', 'TEAM_REMOVE', 'TEAM_ROLE_CHANGE',
    'REPORTS_DAILY', 'REPORTS_EXPORT',
    'SERVICE_MANAGE', 'DOCTOR_MANAGE', 'AMBULANCE_MANAGE', 'CLINIC_SETTINGS_EDIT',
] as ClinicPermission[];

// Accepts either a live PrismaClient or a transaction client. All callers
// already run inside a $transaction, so pass `tx` to keep the seeding atomic
// with the clinic/user writes.
type Db = PrismaClient | Prisma.TransactionClient;

/**
 * Idempotently ensure the two system roles exist for a clinic. Uses the
 * (clinicId, name) unique key; on conflict it is a NO-OP — we never clobber
 * a clinic's existing role (e.g. permissions an admin manually tuned).
 * Returns the CLINIC_ADMIN role id (the default role for owner-equivalent
 * memberships).
 */
export async function ensureSystemRoles(db: Db, clinicId: string): Promise<string> {
    await db.clinicRole.upsert({
        where: { clinicId_name: { clinicId, name: 'DIRECTOR' } },
        create: {
            clinicId,
            name: 'DIRECTOR',
            description: 'Klinika direktori — hisobot oluvchi',
            permissions: DIRECTOR_PERMISSIONS,
            isSystem: true,
        },
        update: {},
    });

    const admin = await db.clinicRole.upsert({
        where: { clinicId_name: { clinicId, name: 'CLINIC_ADMIN' } },
        create: {
            clinicId,
            name: 'CLINIC_ADMIN',
            description: 'Klinika admin — barcha operatsion ish',
            permissions: CLINIC_ADMIN_PERMISSIONS,
            isSystem: true,
        },
        update: {},
        select: { id: true },
    });

    return admin.id;
}

/**
 * Ensure the given users are members of the clinic on the CLINIC_ADMIN role.
 * Purely additive: an existing membership (active OR inactive) is left
 * untouched, so this never re-activates a member who was removed from the
 * team, nor demotes someone's manually-assigned role. Seeds the system roles
 * first so the membership always has a valid role to point at.
 */
export async function ensureClinicAdminMemberships(
    db: Db,
    clinicId: string,
    userIds: string[],
): Promise<void> {
    const ids = [...new Set(userIds.filter(Boolean))];
    if (ids.length === 0) return;

    const adminRoleId = await ensureSystemRoles(db, clinicId);

    for (const userId of ids) {
        const existing = await db.clinicMembership.findUnique({
            where: { clinicId_userId: { clinicId, userId } },
            select: { id: true },
        });
        if (existing) continue; // never overwrite an existing membership
        await db.clinicMembership.create({
            data: { clinicId, userId, roleId: adminRoleId, isActive: true },
        });
    }
}
