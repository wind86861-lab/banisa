-- Add four write-scoped clinic permissions so the read-only DIRECTOR role can
-- be enforced across the config surfaces (services / doctors / ambulances /
-- settings + profile), which previously had no matching permission and were
-- therefore gated only on User.role = CLINIC_ADMIN.
--
-- ADD VALUE is additive and irreversible; it never touches existing rows.
-- Kept in its own migration (separate transaction) so the values are
-- committed before the follow-up migration grants them to CLINIC_ADMIN —
-- Postgres forbids using a freshly-added enum value in the same transaction.

ALTER TYPE "ClinicPermission" ADD VALUE IF NOT EXISTS 'SERVICE_MANAGE';
ALTER TYPE "ClinicPermission" ADD VALUE IF NOT EXISTS 'DOCTOR_MANAGE';
ALTER TYPE "ClinicPermission" ADD VALUE IF NOT EXISTS 'AMBULANCE_MANAGE';
ALTER TYPE "ClinicPermission" ADD VALUE IF NOT EXISTS 'CLINIC_SETTINGS_EDIT';
