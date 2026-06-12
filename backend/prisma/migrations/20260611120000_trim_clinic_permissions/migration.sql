-- Trim ClinicPermission from 31 → 13. The original enum was designed for
-- a 6-role world (OWNER/MANAGER/RECEPTIONIST/CASHIER/DOCTOR/ACCOUNTANT);
-- after collapsing to DIRECTOR + CLINIC_ADMIN the rest never gate
-- anything in code. Drop them, then re-seed both system roles with the
-- reduced set.
--
-- Postgres won't allow ARRAY(SELECT ...) in an ALTER COLUMN USING
-- expression ("cannot use subquery in transform expression"), so we
-- do the swap via a temp column + UPDATE + drop-and-rename instead.

CREATE TYPE "ClinicPermission_new" AS ENUM (
    'BOOKING_VIEW',
    'BOOKING_ACCEPT',
    'BOOKING_RESCHEDULE',
    'PATIENT_VIEW',
    'PATIENT_CONTACT',
    'PAYMENT_VIEW',
    'PAYMENT_CONFIRM_CASH',
    'TEAM_VIEW',
    'TEAM_INVITE',
    'TEAM_REMOVE',
    'TEAM_ROLE_CHANGE',
    'REPORTS_DAILY',
    'REPORTS_EXPORT'
);

ALTER TABLE "ClinicRole" ADD COLUMN "permissions_new" "ClinicPermission_new"[];

UPDATE "ClinicRole"
SET "permissions_new" = COALESCE(sub.arr, ARRAY[]::"ClinicPermission_new"[])
FROM (
    SELECT
        r.id,
        ARRAY(
            SELECT v::text::"ClinicPermission_new"
            FROM unnest(r."permissions") AS v
            WHERE v::text IN (
                'BOOKING_VIEW','BOOKING_ACCEPT','BOOKING_RESCHEDULE',
                'PATIENT_VIEW','PATIENT_CONTACT',
                'PAYMENT_VIEW','PAYMENT_CONFIRM_CASH',
                'TEAM_VIEW','TEAM_INVITE','TEAM_REMOVE','TEAM_ROLE_CHANGE',
                'REPORTS_DAILY','REPORTS_EXPORT'
            )
        ) AS arr
    FROM "ClinicRole" r
) AS sub
WHERE "ClinicRole".id = sub.id;

ALTER TABLE "ClinicRole" DROP COLUMN "permissions";
ALTER TABLE "ClinicRole" RENAME COLUMN "permissions_new" TO "permissions";
ALTER TABLE "ClinicRole" ALTER COLUMN "permissions" SET NOT NULL;
ALTER TABLE "ClinicRole" ALTER COLUMN "permissions" SET DEFAULT ARRAY[]::"ClinicPermission_new"[];

DROP TYPE "ClinicPermission";
ALTER TYPE "ClinicPermission_new" RENAME TO "ClinicPermission";

-- Re-seed DIRECTOR + CLINIC_ADMIN with the reduced sets. The previous
-- migration (20260610190000) seeded them with permissions that no longer
-- exist; that data was just stripped by the type swap above, so we
-- restore the intended sets now.
DO $$
DECLARE c RECORD;
BEGIN
    FOR c IN SELECT "id" FROM "Clinic" LOOP
        UPDATE "ClinicRole"
        SET permissions = ARRAY[
                'BOOKING_VIEW',
                'PATIENT_VIEW',
                'PAYMENT_VIEW',
                'TEAM_VIEW',
                'REPORTS_DAILY',
                'REPORTS_EXPORT'
            ]::"ClinicPermission"[],
            "updatedAt" = CURRENT_TIMESTAMP
        WHERE "clinicId" = c."id" AND "name" = 'DIRECTOR' AND "isSystem" = true;

        UPDATE "ClinicRole"
        SET permissions = ARRAY[
                'BOOKING_VIEW','BOOKING_ACCEPT','BOOKING_RESCHEDULE',
                'PATIENT_VIEW','PATIENT_CONTACT',
                'PAYMENT_VIEW','PAYMENT_CONFIRM_CASH',
                'TEAM_VIEW','TEAM_INVITE','TEAM_REMOVE','TEAM_ROLE_CHANGE',
                'REPORTS_DAILY','REPORTS_EXPORT'
            ]::"ClinicPermission"[],
            "updatedAt" = CURRENT_TIMESTAMP
        WHERE "clinicId" = c."id" AND "name" = 'CLINIC_ADMIN' AND "isSystem" = true;
    END LOOP;
END $$;
