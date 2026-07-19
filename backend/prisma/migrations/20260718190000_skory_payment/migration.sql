-- Skory trip payment (additive, idempotent).
ALTER TABLE "AmbulanceRequest" ADD COLUMN IF NOT EXISTS "tripFee" INTEGER;
ALTER TABLE "AmbulanceRequest" ADD COLUMN IF NOT EXISTS "totalPrice" INTEGER;
ALTER TABLE "AmbulanceRequest" ADD COLUMN IF NOT EXISTS "paymentStatus" TEXT NOT NULL DEFAULT 'UNPAID';
ALTER TABLE "AmbulanceRequest" ADD COLUMN IF NOT EXISTS "paymentMethod" TEXT;
ALTER TABLE "AmbulanceRequest" ADD COLUMN IF NOT EXISTS "paidAmount" INTEGER;
ALTER TABLE "AmbulanceRequest" ADD COLUMN IF NOT EXISTS "paidAt" TIMESTAMP(3);
ALTER TABLE "AmbulanceRequest" ADD COLUMN IF NOT EXISTS "paymentAppointmentId" TEXT;
