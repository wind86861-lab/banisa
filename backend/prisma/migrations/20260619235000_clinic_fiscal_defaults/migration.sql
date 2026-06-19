-- Fiscal defaults per clinic, used to build the Payme CheckPerformTransaction
-- `detail.items[]` payload that Soliq Komiteti reads off the receipt:
--   fiscalMxikCode    — MXIK product code (tasnif.soliq.uz)
--   fiscalPackageCode — measurement unit tied to MXIK
--   fiscalVatPercent  — 0 or 12 typically; clinic-specific tax regime
-- All nullable: the Payme handler falls back to the safe default values
-- (10902004002000999 / 1322039 / 12) when the clinic hasn't configured them.
ALTER TABLE "Clinic"
    ADD COLUMN IF NOT EXISTS "fiscalMxikCode"    TEXT,
    ADD COLUMN IF NOT EXISTS "fiscalPackageCode" TEXT,
    ADD COLUMN IF NOT EXISTS "fiscalVatPercent"  INTEGER;
