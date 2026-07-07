-- Click SHOP SPLIT. STRICTLY ADDITIVE: two new tables + three nullable/defaulted
-- columns on ClickTransaction. No existing row is read, changed, or deleted.

-- 1. Split audit columns on ClickTransaction (existing rows default to non-split).
ALTER TABLE "ClickTransaction"
    ADD COLUMN "isSplit"           BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN "splitBanisaAmount" INTEGER,
    ADD COLUMN "splitClinicAmount" INTEGER;

-- 2. Single Banisa "Split-Shop" merchant config (one row).
CREATE TABLE "ClickSplitGlobalConfig" (
    "id"                   TEXT NOT NULL,
    "serviceId"            TEXT NOT NULL,
    "merchantId"           TEXT NOT NULL,
    "merchantUserId"       TEXT,
    "prodKeyCiphertext"    TEXT NOT NULL,
    "prodKeyIv"            TEXT NOT NULL,
    "prodKeyTag"           TEXT NOT NULL,
    "testKeyCiphertext"    TEXT,
    "testKeyIv"            TEXT,
    "testKeyTag"           TEXT,
    "isTestMode"           BOOLEAN NOT NULL DEFAULT true,
    "isActive"             BOOLEAN NOT NULL DEFAULT false,
    "banisaCntrgId"        TEXT,
    "banisaInn"            TEXT,
    "banisaBranchId"       TEXT,
    "banisaPaymentAccount" TEXT,
    "banisaPaymentMfo"     TEXT,
    "banisaTransitAccount" TEXT,
    "banisaTransitMfo"     TEXT,
    "createdBy"            TEXT,
    "updatedBy"            TEXT,
    "createdAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"            TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ClickSplitGlobalConfig_pkey" PRIMARY KEY ("id")
);

-- 3. Per-clinic split routing (clinic admin fills this).
CREATE TABLE "ClinicClickSplitConfig" (
    "id"             TEXT NOT NULL,
    "clinicId"       TEXT NOT NULL,
    "inn"            TEXT,
    "branchId"       TEXT,
    "cntrgId"        TEXT,
    "paymentAccount" TEXT,
    "paymentMfo"     TEXT,
    "transitAccount" TEXT,
    "transitMfo"     TEXT,
    "isConfigured"   BOOLEAN NOT NULL DEFAULT false,
    "isActive"       BOOLEAN NOT NULL DEFAULT false,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ClinicClickSplitConfig_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ClinicClickSplitConfig_clinicId_key" ON "ClinicClickSplitConfig"("clinicId");
CREATE INDEX "ClinicClickSplitConfig_isActive_idx" ON "ClinicClickSplitConfig"("isActive");

ALTER TABLE "ClinicClickSplitConfig"
    ADD CONSTRAINT "ClinicClickSplitConfig_clinicId_fkey"
    FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
