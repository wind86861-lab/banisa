-- Per-service / per-doctor blocked booking dates. Idempotent.
CREATE TABLE IF NOT EXISTS "ServiceUnavailableDate" (
    "id"          TEXT PRIMARY KEY,
    "clinicId"    TEXT NOT NULL,
    "serviceType" TEXT NOT NULL,
    "serviceId"   TEXT NOT NULL,
    "date"        DATE NOT NULL,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ServiceUnavailableDate_clinicId_fkey') THEN
        ALTER TABLE "ServiceUnavailableDate"
            ADD CONSTRAINT "ServiceUnavailableDate_clinicId_fkey"
            FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS "ServiceUnavailableDate_clinicId_serviceType_serviceId_date_key"
    ON "ServiceUnavailableDate"("clinicId","serviceType","serviceId","date");
CREATE INDEX IF NOT EXISTS "ServiceUnavailableDate_clinicId_serviceType_serviceId_idx"
    ON "ServiceUnavailableDate"("clinicId","serviceType","serviceId");
