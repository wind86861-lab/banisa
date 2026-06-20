-- ─── Global fiscal defaults (super-admin) ─────────────────────────────────
-- Single-row pattern: super-admin enters MXIK / package_code / vat_percent
-- once and every payment provider (Payme / Click / future Alif) uses it
-- as the platform-wide default when building the Soliq receipt.
CREATE TABLE IF NOT EXISTS "GlobalFiscalSettings" (
    "id"                TEXT PRIMARY KEY DEFAULT 'global',
    "fiscalMxikCode"    TEXT,
    "fiscalPackageCode" TEXT,
    "fiscalVatPercent"  INTEGER,
    "updatedBy"         TEXT,
    "updatedAt"         TIMESTAMP(3) NOT NULL DEFAULT NOW()
);

-- Seed the singleton row with the safe medical-clinic defaults that
-- payme.service was already falling back to. Super-admin can edit later.
INSERT INTO "GlobalFiscalSettings" ("id", "fiscalMxikCode", "fiscalPackageCode", "fiscalVatPercent")
VALUES ('global', '10902004002000999', '1322039', 12)
ON CONFLICT ("id") DO NOTHING;

-- ─── Per-category override ────────────────────────────────────────────────
-- Super-admin (or clinic admin via category editor) can set a different
-- MXIK / VAT for a specific category. Services in that category inherit.
-- NULL means "use GlobalFiscalSettings".
ALTER TABLE "ServiceCategory"
    ADD COLUMN IF NOT EXISTS "fiscalMxikCode"    TEXT,
    ADD COLUMN IF NOT EXISTS "fiscalPackageCode" TEXT,
    ADD COLUMN IF NOT EXISTS "fiscalVatPercent"  INTEGER;
