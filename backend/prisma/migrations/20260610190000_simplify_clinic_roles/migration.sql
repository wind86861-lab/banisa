-- Simplify the seeded role set to just two: DIRECTOR (read-only, only the
-- daily report notification) and CLINIC_ADMIN (everything else, including
-- cash confirmation, team management, etc.). Cashier / Manager / Receptionist
-- / Doctor / Accountant are folded into CLINIC_ADMIN.
--
-- For every clinic:
--   1. Upsert DIRECTOR + CLINIC_ADMIN with the new perm sets (idempotent).
--   2. Move every active membership currently sitting on the old roles to
--      CLINIC_ADMIN (closest match — they get full operational access).
--   3. Soft-deactivate the old system roles by renaming them with a -LEGACY
--      suffix so they stop showing in the team UI. They're kept around
--      (not deleted) so audit log references still resolve.

DO $$
DECLARE
    c RECORD;
    director_id TEXT;
    admin_id TEXT;
BEGIN
    FOR c IN SELECT "id" FROM "Clinic" LOOP
        ----------------------------------------------------------------
        -- DIRECTOR — read-only, monthly + daily report consumer
        ----------------------------------------------------------------
        INSERT INTO "ClinicRole" ("id", "clinicId", "name", "description", "permissions", "isSystem", "updatedAt")
        VALUES (
            gen_random_uuid()::text, c."id", 'DIRECTOR', 'Klinika direktori — hisobot oluvchi',
            ARRAY[
                'BOOKING_VIEW',
                'PATIENT_VIEW',
                'PAYMENT_VIEW',
                'SERVICE_VIEW',
                'TEAM_VIEW',
                'REPORTS_DAILY','REPORTS_MONTHLY','REPORTS_FINANCIAL','REPORTS_EXPORT',
                'AUDIT_VIEW'
            ]::"ClinicPermission"[],
            true, CURRENT_TIMESTAMP
        )
        ON CONFLICT ("clinicId","name") DO UPDATE SET
            permissions = EXCLUDED.permissions,
            description = EXCLUDED.description,
            "updatedAt" = CURRENT_TIMESTAMP,
            "isSystem"  = true
        RETURNING "id" INTO director_id;
        IF director_id IS NULL THEN
            SELECT "id" INTO director_id
            FROM "ClinicRole" WHERE "clinicId" = c."id" AND "name" = 'DIRECTOR';
        END IF;

        ----------------------------------------------------------------
        -- CLINIC_ADMIN — full operational control (everything except
        -- clinic-deletion, which we keep gated to whoever holds the
        -- platform-side SUPER_ADMIN role).
        ----------------------------------------------------------------
        INSERT INTO "ClinicRole" ("id", "clinicId", "name", "description", "permissions", "isSystem", "updatedAt")
        VALUES (
            gen_random_uuid()::text, c."id", 'CLINIC_ADMIN', 'Klinika admin — barcha operatsion ish',
            ARRAY[
                'BOOKING_VIEW','BOOKING_ACCEPT','BOOKING_REJECT','BOOKING_RESCHEDULE','BOOKING_CANCEL','BOOKING_DELETE',
                'PATIENT_VIEW','PATIENT_CONTACT','PATIENT_MEDICAL_HISTORY',
                'PAYMENT_VIEW','PAYMENT_CONFIRM_CASH','PAYMENT_REFUND','PAYMENT_REPORTS',
                'SERVICE_VIEW','SERVICE_PRICE_UPDATE','SERVICE_ACTIVATE',
                'TEAM_VIEW','TEAM_INVITE','TEAM_REMOVE','TEAM_ROLE_CHANGE',
                'CLINIC_PROFILE_EDIT','CLINIC_SCHEDULE_EDIT',
                'REPORTS_DAILY','REPORTS_MONTHLY','REPORTS_FINANCIAL','REPORTS_EXPORT',
                'DOCTOR_MANAGE','DOCTOR_SCHEDULE_EDIT',
                'AUDIT_VIEW'
            ]::"ClinicPermission"[],
            true, CURRENT_TIMESTAMP
        )
        ON CONFLICT ("clinicId","name") DO UPDATE SET
            permissions = EXCLUDED.permissions,
            description = EXCLUDED.description,
            "updatedAt" = CURRENT_TIMESTAMP,
            "isSystem"  = true
        RETURNING "id" INTO admin_id;
        IF admin_id IS NULL THEN
            SELECT "id" INTO admin_id
            FROM "ClinicRole" WHERE "clinicId" = c."id" AND "name" = 'CLINIC_ADMIN';
        END IF;

        ----------------------------------------------------------------
        -- Migrate memberships off the legacy roles → CLINIC_ADMIN.
        -- OWNER becomes CLINIC_ADMIN; the rest follow.
        ----------------------------------------------------------------
        UPDATE "ClinicMembership" m
        SET "roleId" = admin_id
        FROM "ClinicRole" r
        WHERE m."clinicId" = c."id"
          AND m."roleId"   = r."id"
          AND r."clinicId" = c."id"
          AND r."isSystem" = true
          AND r."name"     IN ('OWNER','MANAGER','RECEPTIONIST','CASHIER','DOCTOR','ACCOUNTANT');

        ----------------------------------------------------------------
        -- Soft-deactivate the legacy roles by renaming + marking
        -- non-system, so the UI no longer offers them but historical
        -- ClinicAuditLog rows that reference them still resolve.
        ----------------------------------------------------------------
        UPDATE "ClinicRole"
        SET "name" = "name" || '-LEGACY',
            "isSystem" = false,
            "updatedAt" = CURRENT_TIMESTAMP
        WHERE "clinicId" = c."id"
          AND "name" IN ('OWNER','MANAGER','RECEPTIONIST','CASHIER','DOCTOR','ACCOUNTANT')
          AND "isSystem" = true;
    END LOOP;
END $$;
