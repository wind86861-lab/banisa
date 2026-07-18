-- Tez-yordam distance-band pricing (additive, idempotent).

-- 1) Patient's requested service tier on each request (null = legacy = BASIC).
ALTER TABLE "AmbulanceRequest" ADD COLUMN IF NOT EXISTS "type" "AmbulanceType";

-- 2) Admin-managed distance bands.
CREATE TABLE IF NOT EXISTS "AmbulancePricingBand" (
    "id"        TEXT NOT NULL,
    "label"     TEXT NOT NULL,
    "minKm"     DOUBLE PRECISION NOT NULL DEFAULT 0,
    "maxKm"     DOUBLE PRECISION,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive"  BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AmbulancePricingBand_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "AmbulancePricingBand_isActive_sortOrder_idx"
    ON "AmbulancePricingBand" ("isActive", "sortOrder");

-- 3) Per-ambulance, per-band tariff.
CREATE TABLE IF NOT EXISTS "AmbulanceBandTariff" (
    "id"          TEXT NOT NULL,
    "ambulanceId" TEXT NOT NULL,
    "bandId"      TEXT NOT NULL,
    "baseFee"     INTEGER NOT NULL,
    "pricePerKm"  INTEGER NOT NULL,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AmbulanceBandTariff_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "AmbulanceBandTariff_ambulanceId_bandId_key"
    ON "AmbulanceBandTariff" ("ambulanceId", "bandId");
CREATE INDEX IF NOT EXISTS "AmbulanceBandTariff_bandId_idx"
    ON "AmbulanceBandTariff" ("bandId");

DO $$ BEGIN
    ALTER TABLE "AmbulanceBandTariff"
        ADD CONSTRAINT "AmbulanceBandTariff_ambulanceId_fkey"
        FOREIGN KEY ("ambulanceId") REFERENCES "Ambulance"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE "AmbulanceBandTariff"
        ADD CONSTRAINT "AmbulanceBandTariff_bandId_fkey"
        FOREIGN KEY ("bandId") REFERENCES "AmbulancePricingBand"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
