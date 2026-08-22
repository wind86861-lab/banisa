-- Shifokor (doctor) referral feature — Phase 1 data foundation.
-- Fully additive + idempotent. Safe to re-run. No data loss.

-- 1. New role value (must be its own statement; autocommit).
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'DOCTOR';

-- 2. Recommendation status enum.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'RecommendationStatus') THEN
    CREATE TYPE "RecommendationStatus" AS ENUM ('PENDING','ACCEPTED','REJECTED','EXPIRED','BOOKED');
  END IF;
END $$;

-- 3. DoctorProfile
CREATE TABLE IF NOT EXISTS "DoctorProfile" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "specialty" TEXT,
  "bio" TEXT,
  "documents" JSONB NOT NULL DEFAULT '[]',
  "rejectionReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DoctorProfile_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "DoctorProfile_userId_key" ON "DoctorProfile"("userId");
CREATE INDEX IF NOT EXISTS "DoctorProfile_userId_idx" ON "DoctorProfile"("userId");

-- 4. Recommendation
CREATE TABLE IF NOT EXISTS "Recommendation" (
  "id" TEXT NOT NULL,
  "doctorId" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "clinicId" TEXT NOT NULL,
  "status" "RecommendationStatus" NOT NULL DEFAULT 'PENDING',
  "totalAmount" INTEGER NOT NULL DEFAULT 0,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "respondedAt" TIMESTAMP(3),
  "bookedAt" TIMESTAMP(3),
  CONSTRAINT "Recommendation_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "Recommendation_doctorId_idx" ON "Recommendation"("doctorId");
CREATE INDEX IF NOT EXISTS "Recommendation_patientId_idx" ON "Recommendation"("patientId");
CREATE INDEX IF NOT EXISTS "Recommendation_clinicId_idx" ON "Recommendation"("clinicId");
CREATE INDEX IF NOT EXISTS "Recommendation_status_idx" ON "Recommendation"("status");
CREATE INDEX IF NOT EXISTS "Recommendation_expiresAt_idx" ON "Recommendation"("expiresAt");

-- 5. RecommendationItem
CREATE TABLE IF NOT EXISTS "RecommendationItem" (
  "id" TEXT NOT NULL,
  "recommendationId" TEXT NOT NULL,
  "serviceType" "ServiceType" NOT NULL,
  "serviceId" TEXT NOT NULL,
  "nameSnapshot" TEXT NOT NULL,
  "priceSnapshot" INTEGER NOT NULL DEFAULT 0,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RecommendationItem_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "RecommendationItem_recommendationId_idx" ON "RecommendationItem"("recommendationId");

-- 6. Appointment.recommendationId
ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "recommendationId" TEXT;

-- 7. Foreign keys (guarded — add only if missing).
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'DoctorProfile_userId_fkey') THEN
    ALTER TABLE "DoctorProfile" ADD CONSTRAINT "DoctorProfile_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Recommendation_doctorId_fkey') THEN
    ALTER TABLE "Recommendation" ADD CONSTRAINT "Recommendation_doctorId_fkey"
      FOREIGN KEY ("doctorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Recommendation_patientId_fkey') THEN
    ALTER TABLE "Recommendation" ADD CONSTRAINT "Recommendation_patientId_fkey"
      FOREIGN KEY ("patientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Recommendation_clinicId_fkey') THEN
    ALTER TABLE "Recommendation" ADD CONSTRAINT "Recommendation_clinicId_fkey"
      FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'RecommendationItem_recommendationId_fkey') THEN
    ALTER TABLE "RecommendationItem" ADD CONSTRAINT "RecommendationItem_recommendationId_fkey"
      FOREIGN KEY ("recommendationId") REFERENCES "Recommendation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Appointment_recommendationId_fkey') THEN
    ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_recommendationId_fkey"
      FOREIGN KEY ("recommendationId") REFERENCES "Recommendation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
