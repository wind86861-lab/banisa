-- Backfill clinic RBAC for clinics approved/created AFTER the original
-- 20260610150000_add_clinic_membership_rbac seed. That seed only ran once,
-- for clinics that existed at the time. Every clinic onboarded since then
-- has NO ClinicRole rows and NO ClinicMembership, which:
--   * makes the Team ("Xodimlar") module return 403
--     ("Klinikada a'zoligingiz topilmadi"), and
--   * locks secondary admins (User.clinicId = NULL) out of every clinic
--     route, since clinic context is resolved via ClinicMembership.
--
-- This migration is STRICTLY ADDITIVE — it only INSERTs, always with
-- ON CONFLICT DO NOTHING. It never updates, renames, or deletes any row,
-- so it cannot lose or clobber existing data (e.g. a role whose permissions
-- an admin manually tuned, or a member previously removed from the team).

-- 1. Ensure both system roles exist for every clinic. Existing rows are left
--    exactly as-is (DO NOTHING).
INSERT INTO "ClinicRole" ("id", "clinicId", "name", "description", "permissions", "isSystem", "updatedAt")
SELECT
    gen_random_uuid()::text, c."id", 'DIRECTOR', 'Klinika direktori — hisobot oluvchi',
    ARRAY[
        'BOOKING_VIEW','PATIENT_VIEW','PAYMENT_VIEW','TEAM_VIEW','REPORTS_DAILY','REPORTS_EXPORT'
    ]::"ClinicPermission"[],
    true, CURRENT_TIMESTAMP
FROM "Clinic" c
ON CONFLICT ("clinicId", "name") DO NOTHING;

INSERT INTO "ClinicRole" ("id", "clinicId", "name", "description", "permissions", "isSystem", "updatedAt")
SELECT
    gen_random_uuid()::text, c."id", 'CLINIC_ADMIN', 'Klinika admin — barcha operatsion ish',
    ARRAY[
        'BOOKING_VIEW','BOOKING_ACCEPT','BOOKING_RESCHEDULE',
        'PATIENT_VIEW','PATIENT_CONTACT',
        'PAYMENT_VIEW','PAYMENT_CONFIRM_CASH',
        'TEAM_VIEW','TEAM_INVITE','TEAM_REMOVE','TEAM_ROLE_CHANGE',
        'REPORTS_DAILY','REPORTS_EXPORT'
    ]::"ClinicPermission"[],
    true, CURRENT_TIMESTAMP
FROM "Clinic" c
ON CONFLICT ("clinicId", "name") DO NOTHING;

-- 2. Membership for PRIMARY admins: any CLINIC_ADMIN user whose User.clinicId
--    is set but who has no membership on that clinic. Covers admin-created
--    clinics (no pendingPersons) and the primary of self-registered ones.
INSERT INTO "ClinicMembership" ("id", "clinicId", "userId", "roleId", "joinedAt", "isActive")
SELECT gen_random_uuid()::text, u."clinicId", u."id", r."id", CURRENT_TIMESTAMP, true
FROM "User" u
JOIN "ClinicRole" r
  ON r."clinicId" = u."clinicId" AND r."name" = 'CLINIC_ADMIN' AND r."isSystem" = true
WHERE u."role" = 'CLINIC_ADMIN'
  AND u."clinicId" IS NOT NULL
ON CONFLICT ("clinicId", "userId") DO NOTHING;

-- 3. Membership for SECONDARY admins (User.clinicId = NULL). Their only link
--    to the clinic is the phone stored in Clinic.pendingPersons; match on it.
--    The subquery filters to array-typed JSON first so jsonb_array_elements
--    never sees a non-array value.
INSERT INTO "ClinicMembership" ("id", "clinicId", "userId", "roleId", "joinedAt", "isActive")
SELECT gen_random_uuid()::text, c."id", u."id", r."id", CURRENT_TIMESTAMP, true
FROM (
    SELECT "id", "pendingPersons"
    FROM "Clinic"
    WHERE "pendingPersons" IS NOT NULL
      AND jsonb_typeof("pendingPersons") = 'array'
) c
CROSS JOIN LATERAL jsonb_array_elements(c."pendingPersons") AS p
JOIN "User" u
  ON u."phone" = (p->>'phone') AND u."role" = 'CLINIC_ADMIN'
JOIN "ClinicRole" r
  ON r."clinicId" = c."id" AND r."name" = 'CLINIC_ADMIN' AND r."isSystem" = true
ON CONFLICT ("clinicId", "userId") DO NOTHING;
