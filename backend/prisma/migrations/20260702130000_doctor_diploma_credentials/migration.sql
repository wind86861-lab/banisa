-- Doctor education + credential documents. Adds the two diploma pairs
-- (Bakalavr / Magistr — specialty text + uploaded diploma) and a document
-- URL alongside each existing credential (toifa / ilmiy daraja / ilmiy unvon)
-- so the clinic can attach a scanned certificate.
--
-- STRICTLY ADDITIVE: every column is nullable with no default and no
-- backfill — existing Doctor rows are untouched, no data is read or removed.
-- The existing category/academicDegree/academicTitle text columns stay as-is.

ALTER TABLE "Doctor"
    ADD COLUMN "bachelorSpecialty"    TEXT,
    ADD COLUMN "bachelorDiplomaUrl"   TEXT,
    ADD COLUMN "masterSpecialty"      TEXT,
    ADD COLUMN "masterDiplomaUrl"     TEXT,
    ADD COLUMN "categoryDocUrl"       TEXT,
    ADD COLUMN "academicDegreeDocUrl" TEXT,
    ADD COLUMN "academicTitleDocUrl"  TEXT;
