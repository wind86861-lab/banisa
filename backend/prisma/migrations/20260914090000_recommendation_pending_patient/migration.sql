-- A doctor may now write a recommendation for a patient who has not opened the
-- bot yet. patientId stays null until that phone's first /start claims the row;
-- patientPhone is the handle we match on.
ALTER TABLE "Recommendation" ALTER COLUMN "patientId" DROP NOT NULL;
ALTER TABLE "Recommendation" ADD COLUMN IF NOT EXISTS "patientPhone" TEXT;

-- Backfill the phone for existing rows so every recommendation carries one.
UPDATE "Recommendation" r
SET "patientPhone" = u."phone"
FROM "User" u
WHERE r."patientId" = u."id" AND r."patientPhone" IS NULL;

CREATE INDEX IF NOT EXISTS "Recommendation_patientPhone_idx" ON "Recommendation"("patientPhone");
