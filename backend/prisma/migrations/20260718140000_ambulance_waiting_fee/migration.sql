-- Ambulance waiting fee (additive, idempotent).
ALTER TABLE "Ambulance" ADD COLUMN IF NOT EXISTS "waitingRatePerMin" INTEGER;

ALTER TABLE "AmbulanceRequest" ADD COLUMN IF NOT EXISTS "waitingStartedAt" TIMESTAMP(3);
ALTER TABLE "AmbulanceRequest" ADD COLUMN IF NOT EXISTS "waitingEndedAt"   TIMESTAMP(3);
ALTER TABLE "AmbulanceRequest" ADD COLUMN IF NOT EXISTS "waitingMinutes"   INTEGER;
ALTER TABLE "AmbulanceRequest" ADD COLUMN IF NOT EXISTS "waitingFee"       INTEGER;
ALTER TABLE "AmbulanceRequest" ADD COLUMN IF NOT EXISTS "waitingRemindStage" INTEGER NOT NULL DEFAULT 0;
