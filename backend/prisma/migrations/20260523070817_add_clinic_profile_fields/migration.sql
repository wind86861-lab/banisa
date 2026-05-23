-- Add all clinic profile fields previously only stored on ClinicRegistrationRequest.
-- All columns are nullable (or have sensible defaults), so this migration is
-- additive and safe to run against the live database with no backfill.

ALTER TABLE "Clinic"
    ADD COLUMN "legalAddress"      TEXT,
    ADD COLUMN "foundedYear"       INTEGER,
    ADD COLUMN "descriptionRu"     TEXT,
    ADD COLUMN "addressUz"         TEXT,
    ADD COLUMN "addressRu"         TEXT,
    ADD COLUMN "zipCode"           TEXT,
    ADD COLUMN "googleMapsUrl"     TEXT,
    ADD COLUMN "isAlwaysOpen"      BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN "lunchBreakStart"   TEXT,
    ADD COLUMN "lunchBreakEnd"     TEXT,
    ADD COLUMN "holidayNotes"      TEXT,
    ADD COLUMN "licenseUrl"        TEXT,
    ADD COLUMN "certificates"      JSONB DEFAULT '[]',
    ADD COLUMN "bankName"          TEXT,
    ADD COLUMN "bankAccountNumber" TEXT,
    ADD COLUMN "mfo"               TEXT,
    ADD COLUMN "oked"              TEXT,
    ADD COLUMN "vatNumber"         TEXT,
    ADD COLUMN "invoiceEmail"      TEXT;
