-- Add per-item clinic-set prices for checkup packages.
-- Format: { [packageItemId]: priceInUZS }. Null until clinic edits items.
ALTER TABLE "ClinicCheckupPackage" ADD COLUMN "itemPrices" JSONB;
