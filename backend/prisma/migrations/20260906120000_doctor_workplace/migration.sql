-- Add workplace (ish joyi) to DoctorProfile. Idempotent.
ALTER TABLE "DoctorProfile" ADD COLUMN IF NOT EXISTS "workplace" TEXT;
