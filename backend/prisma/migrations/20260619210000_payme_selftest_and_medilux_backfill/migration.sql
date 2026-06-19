-- ─── Self-test tracking on ClinicPaymeConfig ──────────────────────────────
-- patchActive will refuse to flip isActive=true unless lastSelfTestStatus is
-- 'pass' within the last 24h (or forceActivate=true is passed). Stores the
-- last self-test result so the UI can show "Last test: 2 min ago — PASS".
ALTER TABLE "ClinicPaymeConfig"
    ADD COLUMN IF NOT EXISTS "lastSelfTestAt"     TIMESTAMP(3),
    ADD COLUMN IF NOT EXISTS "lastSelfTestStatus" TEXT,
    ADD COLUMN IF NOT EXISTS "lastSelfTestMsg"    TEXT;

-- ─── Medilux migration: backfill PaymeTransaction.clinicId ────────────────
-- Legacy /api/payme path didn't tag transactions with a clinic id (every row
-- carried clinicId=null). orderId points at Appointment.id, so we can join
-- and resolve the right clinic in one shot.
UPDATE "PaymeTransaction" pt
SET    "clinicId" = a."clinicId"
FROM   "Appointment" a
WHERE  pt."orderId" = a."id"
  AND  pt."clinicId" IS NULL;

-- Defensive index for the deprecation-warning lookup (legacy endpoint
-- "did anyone hit me in the last 24h" query path).
CREATE INDEX IF NOT EXISTS "PaymeWebhookLog_clinicId_null_idx"
    ON "PaymeWebhookLog" ("createdAt")
    WHERE "clinicId" IS NULL;
