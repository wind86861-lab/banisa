-- Banisa commission default 10% -> 20% (SHOP-SPLIT). Additive + idempotent.
-- 1. New rows default to 0.20.
ALTER TABLE "Clinic" ALTER COLUMN "commissionRate" SET DEFAULT 0.20;
-- 2. Bring existing clinics still on the old 10% default (or null) up to 20%.
--    Custom per-clinic rates set by the super-admin are left untouched.
UPDATE "Clinic" SET "commissionRate" = 0.20
 WHERE "commissionRate" = 0.10 OR "commissionRate" IS NULL;
