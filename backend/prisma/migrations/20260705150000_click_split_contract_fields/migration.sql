-- Full legal + banking dossier for the Click Split-Shop counterparty contract.
-- STRICTLY ADDITIVE: six nullable columns on ClinicClickSplitConfig. No data read/changed.
ALTER TABLE "ClinicClickSplitConfig"
    ADD COLUMN "legalName"    TEXT,
    ADD COLUMN "directorName" TEXT,
    ADD COLUMN "legalAddress" TEXT,
    ADD COLUMN "bankName"     TEXT,
    ADD COLUMN "oked"         TEXT,
    ADD COLUMN "contactPhone" TEXT;
