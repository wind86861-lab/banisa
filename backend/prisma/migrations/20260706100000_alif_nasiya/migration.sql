-- Alif (Nasiya) per-clinic integration. STRICTLY ADDITIVE: one enum value +
-- two new tables. The new enum value is NOT used within this migration, so it
-- is safe to add here. No existing row is read or changed.

ALTER TYPE "PaymentMethod" ADD VALUE IF NOT EXISTS 'ALIF';

-- Per-clinic Alif merchant credentials (Token + Key, AES sealed).
CREATE TABLE "ClinicAlifConfig" (
    "id"                  TEXT NOT NULL,
    "clinicId"            TEXT NOT NULL,
    "prodTokenCiphertext" TEXT NOT NULL,
    "prodTokenIv"         TEXT NOT NULL,
    "prodTokenTag"        TEXT NOT NULL,
    "prodKeyCiphertext"   TEXT NOT NULL,
    "prodKeyIv"           TEXT NOT NULL,
    "prodKeyTag"          TEXT NOT NULL,
    "testTokenCiphertext" TEXT,
    "testTokenIv"         TEXT,
    "testTokenTag"        TEXT,
    "testKeyCiphertext"   TEXT,
    "testKeyIv"           TEXT,
    "testKeyTag"          TEXT,
    "isTestMode"          BOOLEAN NOT NULL DEFAULT true,
    "isActive"            BOOLEAN NOT NULL DEFAULT false,
    "connectedAt"         TIMESTAMP(3),
    "lastUsedAt"          TIMESTAMP(3),
    "createdBy"           TEXT,
    "updatedBy"           TEXT,
    "createdAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"           TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ClinicAlifConfig_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ClinicAlifConfig_clinicId_key" ON "ClinicAlifConfig"("clinicId");
CREATE INDEX "ClinicAlifConfig_isActive_idx" ON "ClinicAlifConfig"("isActive");
ALTER TABLE "ClinicAlifConfig"
    ADD CONSTRAINT "ClinicAlifConfig_clinicId_fkey"
    FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Payment attempts.
CREATE TABLE "AlifTransaction" (
    "id"            TEXT NOT NULL,
    "invoiceId"     TEXT,
    "appointmentId" TEXT NOT NULL,
    "amount"        INTEGER NOT NULL,
    "status"        TEXT NOT NULL DEFAULT 'PENDING',
    "clinicId"      TEXT,
    "isTestMode"    BOOLEAN NOT NULL DEFAULT false,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"     TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AlifTransaction_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AlifTransaction_invoiceId_key" ON "AlifTransaction"("invoiceId");
CREATE INDEX "AlifTransaction_appointmentId_idx" ON "AlifTransaction"("appointmentId");
CREATE INDEX "AlifTransaction_clinicId_idx" ON "AlifTransaction"("clinicId");
CREATE INDEX "AlifTransaction_status_idx" ON "AlifTransaction"("status");
ALTER TABLE "AlifTransaction"
    ADD CONSTRAINT "AlifTransaction_clinicId_fkey"
    FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE SET NULL ON UPDATE CASCADE;
