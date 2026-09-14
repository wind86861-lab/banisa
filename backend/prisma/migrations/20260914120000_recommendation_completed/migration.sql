-- A referral is only finished once the patient actually attended the clinic.
-- BOOKED stops at "paid / reserved"; COMPLETED follows the linked appointment.
ALTER TYPE "RecommendationStatus" ADD VALUE IF NOT EXISTS 'COMPLETED';
ALTER TABLE "Recommendation" ADD COLUMN IF NOT EXISTS "completedAt" TIMESTAMP(3);
