-- ─── Drop User.clinicId @unique ────────────────────────────────────────────
-- Single user per clinic was the old model. Multi-account requires multiple
-- users sharing the same clinicId; the @unique blocked that.
ALTER TABLE "User" DROP CONSTRAINT IF EXISTS "User_clinicId_key";

-- ─── ClinicPermission enum ──────────────────────────────────────────────────
CREATE TYPE "ClinicPermission" AS ENUM (
    'BOOKING_VIEW', 'BOOKING_VIEW_OWN', 'BOOKING_ACCEPT', 'BOOKING_REJECT',
    'BOOKING_RESCHEDULE', 'BOOKING_CANCEL', 'BOOKING_DELETE',
    'PATIENT_VIEW', 'PATIENT_CONTACT', 'PATIENT_MEDICAL_HISTORY',
    'PAYMENT_VIEW', 'PAYMENT_CONFIRM_CASH', 'PAYMENT_REFUND', 'PAYMENT_REPORTS',
    'SERVICE_VIEW', 'SERVICE_PRICE_UPDATE', 'SERVICE_ACTIVATE',
    'TEAM_VIEW', 'TEAM_INVITE', 'TEAM_REMOVE', 'TEAM_ROLE_CHANGE',
    'CLINIC_PROFILE_EDIT', 'CLINIC_SCHEDULE_EDIT', 'CLINIC_DELETE',
    'REPORTS_DAILY', 'REPORTS_MONTHLY', 'REPORTS_FINANCIAL', 'REPORTS_EXPORT',
    'DOCTOR_MANAGE', 'DOCTOR_SCHEDULE_EDIT',
    'AUDIT_VIEW'
);

-- ─── ClinicRole ─────────────────────────────────────────────────────────────
CREATE TABLE "ClinicRole" (
    "id"          TEXT PRIMARY KEY,
    "clinicId"    TEXT NOT NULL,
    "name"        TEXT NOT NULL,
    "description" TEXT,
    "permissions" "ClinicPermission"[] NOT NULL DEFAULT ARRAY[]::"ClinicPermission"[],
    "isSystem"    BOOLEAN NOT NULL DEFAULT false,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClinicRole_clinic_fk"
        FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "ClinicRole_clinicId_name_key" ON "ClinicRole"("clinicId", "name");
CREATE INDEX "ClinicRole_clinicId_idx" ON "ClinicRole"("clinicId");

-- ─── ClinicMembership ───────────────────────────────────────────────────────
CREATE TABLE "ClinicMembership" (
    "id"         TEXT PRIMARY KEY,
    "clinicId"   TEXT NOT NULL,
    "userId"     TEXT NOT NULL,
    "roleId"     TEXT NOT NULL,
    "invitedBy"  TEXT,
    "joinedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3),
    "isActive"   BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ClinicMembership_clinic_fk"
        FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ClinicMembership_user_fk"
        FOREIGN KEY ("userId")   REFERENCES "User"("id")   ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ClinicMembership_role_fk"
        FOREIGN KEY ("roleId")   REFERENCES "ClinicRole"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ClinicMembership_invitedBy_fk"
        FOREIGN KEY ("invitedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "ClinicMembership_clinicId_userId_key" ON "ClinicMembership"("clinicId", "userId");
CREATE INDEX "ClinicMembership_clinicId_idx" ON "ClinicMembership"("clinicId");
CREATE INDEX "ClinicMembership_userId_idx" ON "ClinicMembership"("userId");
CREATE INDEX "ClinicMembership_isActive_idx" ON "ClinicMembership"("isActive");

-- ─── ClinicAuditLog ─────────────────────────────────────────────────────────
CREATE TABLE "ClinicAuditLog" (
    "id"         TEXT PRIMARY KEY,
    "clinicId"   TEXT NOT NULL,
    "actorId"    TEXT,
    "action"     TEXT NOT NULL,
    "targetType" TEXT,
    "targetId"   TEXT,
    "metadata"   JSONB,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClinicAuditLog_clinic_fk"
        FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ClinicAuditLog_actor_fk"
        FOREIGN KEY ("actorId")  REFERENCES "User"("id")   ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "ClinicAuditLog_clinicId_createdAt_idx" ON "ClinicAuditLog"("clinicId", "createdAt");
CREATE INDEX "ClinicAuditLog_actorId_idx" ON "ClinicAuditLog"("actorId");
CREATE INDEX "ClinicAuditLog_action_idx" ON "ClinicAuditLog"("action");

-- ─── Seed system roles + initial OWNER memberships ──────────────────────────
-- One pass per clinic: insert six system roles using fixed permission sets,
-- then upgrade every existing CLINIC_ADMIN user to OWNER of the clinic they
-- previously pointed to via User.clinicId. Wrapped in a DO block so it can
-- be replayed safely if a clinic was created after the migration first ran.
DO $$
DECLARE
    c RECORD;
    owner_role_id TEXT;
BEGIN
    FOR c IN SELECT "id" FROM "Clinic" LOOP
        -- OWNER: every permission
        INSERT INTO "ClinicRole" ("id", "clinicId", "name", "description", "permissions", "isSystem", "updatedAt")
        VALUES (
            gen_random_uuid()::text, c."id", 'OWNER', 'To''liq nazorat — barcha amallar',
            ARRAY[
                'BOOKING_VIEW','BOOKING_ACCEPT','BOOKING_REJECT','BOOKING_RESCHEDULE','BOOKING_CANCEL','BOOKING_DELETE',
                'PATIENT_VIEW','PATIENT_CONTACT','PATIENT_MEDICAL_HISTORY',
                'PAYMENT_VIEW','PAYMENT_CONFIRM_CASH','PAYMENT_REFUND','PAYMENT_REPORTS',
                'SERVICE_VIEW','SERVICE_PRICE_UPDATE','SERVICE_ACTIVATE',
                'TEAM_VIEW','TEAM_INVITE','TEAM_REMOVE','TEAM_ROLE_CHANGE',
                'CLINIC_PROFILE_EDIT','CLINIC_SCHEDULE_EDIT','CLINIC_DELETE',
                'REPORTS_DAILY','REPORTS_MONTHLY','REPORTS_FINANCIAL','REPORTS_EXPORT',
                'DOCTOR_MANAGE','DOCTOR_SCHEDULE_EDIT',
                'AUDIT_VIEW'
            ]::"ClinicPermission"[],
            true, CURRENT_TIMESTAMP
        ) ON CONFLICT ("clinicId","name") DO NOTHING
        RETURNING "id" INTO owner_role_id;

        -- MANAGER: everything except CLINIC_DELETE and TEAM_ROLE_CHANGE
        INSERT INTO "ClinicRole" ("id", "clinicId", "name", "description", "permissions", "isSystem", "updatedAt")
        VALUES (
            gen_random_uuid()::text, c."id", 'MANAGER', 'Klinika menejeri',
            ARRAY[
                'BOOKING_VIEW','BOOKING_ACCEPT','BOOKING_REJECT','BOOKING_RESCHEDULE','BOOKING_CANCEL',
                'PATIENT_VIEW','PATIENT_CONTACT',
                'PAYMENT_VIEW','PAYMENT_CONFIRM_CASH','PAYMENT_REFUND','PAYMENT_REPORTS',
                'SERVICE_VIEW','SERVICE_PRICE_UPDATE','SERVICE_ACTIVATE',
                'TEAM_VIEW','TEAM_INVITE','TEAM_REMOVE',
                'CLINIC_PROFILE_EDIT','CLINIC_SCHEDULE_EDIT',
                'REPORTS_DAILY','REPORTS_MONTHLY','REPORTS_FINANCIAL','REPORTS_EXPORT',
                'DOCTOR_MANAGE','DOCTOR_SCHEDULE_EDIT',
                'AUDIT_VIEW'
            ]::"ClinicPermission"[],
            true, CURRENT_TIMESTAMP
        ) ON CONFLICT ("clinicId","name") DO NOTHING;

        -- RECEPTIONIST: bron + check-in + bemor + naqd to'lov
        INSERT INTO "ClinicRole" ("id", "clinicId", "name", "description", "permissions", "isSystem", "updatedAt")
        VALUES (
            gen_random_uuid()::text, c."id", 'RECEPTIONIST', 'Resepsionist',
            ARRAY[
                'BOOKING_VIEW','BOOKING_ACCEPT','BOOKING_REJECT','BOOKING_RESCHEDULE',
                'PATIENT_VIEW','PATIENT_CONTACT',
                'PAYMENT_VIEW','PAYMENT_CONFIRM_CASH',
                'SERVICE_VIEW',
                'TEAM_VIEW',
                'REPORTS_DAILY'
            ]::"ClinicPermission"[],
            true, CURRENT_TIMESTAMP
        ) ON CONFLICT ("clinicId","name") DO NOTHING;

        -- CASHIER: faqat to'lovlar
        INSERT INTO "ClinicRole" ("id", "clinicId", "name", "description", "permissions", "isSystem", "updatedAt")
        VALUES (
            gen_random_uuid()::text, c."id", 'CASHIER', 'Kassir',
            ARRAY[
                'BOOKING_VIEW',
                'PATIENT_VIEW',
                'PAYMENT_VIEW','PAYMENT_CONFIRM_CASH','PAYMENT_REPORTS',
                'REPORTS_DAILY'
            ]::"ClinicPermission"[],
            true, CURRENT_TIMESTAMP
        ) ON CONFLICT ("clinicId","name") DO NOTHING;

        -- DOCTOR: faqat o'z bronlari + tibbiy tarix
        INSERT INTO "ClinicRole" ("id", "clinicId", "name", "description", "permissions", "isSystem", "updatedAt")
        VALUES (
            gen_random_uuid()::text, c."id", 'DOCTOR', 'Doktor',
            ARRAY[
                'BOOKING_VIEW_OWN',
                'PATIENT_VIEW','PATIENT_MEDICAL_HISTORY',
                'SERVICE_VIEW',
                'DOCTOR_SCHEDULE_EDIT'
            ]::"ClinicPermission"[],
            true, CURRENT_TIMESTAMP
        ) ON CONFLICT ("clinicId","name") DO NOTHING;

        -- ACCOUNTANT: faqat hisobotlar
        INSERT INTO "ClinicRole" ("id", "clinicId", "name", "description", "permissions", "isSystem", "updatedAt")
        VALUES (
            gen_random_uuid()::text, c."id", 'ACCOUNTANT', 'Buxgalter',
            ARRAY[
                'BOOKING_VIEW',
                'PAYMENT_VIEW','PAYMENT_REFUND','PAYMENT_REPORTS',
                'SERVICE_VIEW',
                'REPORTS_DAILY','REPORTS_MONTHLY','REPORTS_FINANCIAL','REPORTS_EXPORT',
                'AUDIT_VIEW'
            ]::"ClinicPermission"[],
            true, CURRENT_TIMESTAMP
        ) ON CONFLICT ("clinicId","name") DO NOTHING;
    END LOOP;

    -- Migrate existing CLINIC_ADMIN users → OWNER membership of their clinic.
    INSERT INTO "ClinicMembership" ("id", "clinicId", "userId", "roleId", "joinedAt", "isActive")
    SELECT
        gen_random_uuid()::text,
        u."clinicId",
        u."id",
        r."id",
        COALESCE(u."createdAt", CURRENT_TIMESTAMP),
        u."isActive"
    FROM "User" u
    JOIN "ClinicRole" r
      ON r."clinicId" = u."clinicId" AND r."name" = 'OWNER' AND r."isSystem" = true
    WHERE u."clinicId" IS NOT NULL
      AND u."role" = 'CLINIC_ADMIN'
    ON CONFLICT ("clinicId","userId") DO NOTHING;
END $$;
