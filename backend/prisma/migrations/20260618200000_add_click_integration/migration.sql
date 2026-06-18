-- Click.uz payment integration tables. Mirrors the Payme four-model layout:
-- per-clinic merchant config (encrypted secret key), an immutable version
-- history for rollback/audit, the live transaction state machine, and a
-- per-call webhook log for the clinic dashboard.

-- ─── ClickTransaction ────────────────────────────────────────────────────────
CREATE TABLE "ClickTransaction" (
    "id"                TEXT        NOT NULL,
    "clickTransId"      TEXT,
    "clickPaydocId"     TEXT,
    "merchantTransId"   TEXT        NOT NULL,
    "merchantPrepareId" TEXT,
    "amount"            INTEGER     NOT NULL,
    "state"             INTEGER     NOT NULL DEFAULT 0,
    "signTime"          TEXT,
    "clinicId"          TEXT,
    "isTestMode"        BOOLEAN     NOT NULL DEFAULT false,
    "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"         TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClickTransaction_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ClickTransaction_clickTransId_key" ON "ClickTransaction"("clickTransId");
CREATE INDEX "ClickTransaction_clickTransId_idx" ON "ClickTransaction"("clickTransId");
CREATE INDEX "ClickTransaction_merchantTransId_idx" ON "ClickTransaction"("merchantTransId");
CREATE INDEX "ClickTransaction_state_idx" ON "ClickTransaction"("state");
CREATE INDEX "ClickTransaction_merchantTransId_state_idx" ON "ClickTransaction"("merchantTransId", "state");
CREATE INDEX "ClickTransaction_clinicId_idx" ON "ClickTransaction"("clinicId");
CREATE INDEX "ClickTransaction_clinicId_state_idx" ON "ClickTransaction"("clinicId", "state");
ALTER TABLE "ClickTransaction"
    ADD CONSTRAINT "ClickTransaction_clinicId_fkey"
    FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ─── ClinicClickConfig ───────────────────────────────────────────────────────
CREATE TABLE "ClinicClickConfig" (
    "id"                TEXT     NOT NULL,
    "clinicId"          TEXT     NOT NULL,
    "merchantId"        TEXT     NOT NULL,
    "serviceId"         TEXT     NOT NULL,
    "merchantUserId"    TEXT,
    "prodKeyCiphertext" TEXT     NOT NULL,
    "prodKeyIv"         TEXT     NOT NULL,
    "prodKeyTag"        TEXT     NOT NULL,
    "testKeyCiphertext" TEXT,
    "testKeyIv"         TEXT,
    "testKeyTag"        TEXT,
    "isTestMode"        BOOLEAN  NOT NULL DEFAULT true,
    "isActive"          BOOLEAN  NOT NULL DEFAULT false,
    "connectedAt"       TIMESTAMP(3),
    "lastUsedAt"        TIMESTAMP(3),
    "lastRotatedAt"     TIMESTAMP(3),
    "createdBy"         TEXT,
    "updatedBy"         TEXT,
    "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"         TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClinicClickConfig_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ClinicClickConfig_clinicId_key" ON "ClinicClickConfig"("clinicId");
CREATE INDEX "ClinicClickConfig_isActive_idx" ON "ClinicClickConfig"("isActive");
ALTER TABLE "ClinicClickConfig"
    ADD CONSTRAINT "ClinicClickConfig_clinicId_fkey"
    FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── ClickConfigVersion ──────────────────────────────────────────────────────
CREATE TABLE "ClickConfigVersion" (
    "id"                TEXT     NOT NULL,
    "configId"          TEXT     NOT NULL,
    "clinicId"          TEXT     NOT NULL,
    "version"           INTEGER  NOT NULL,
    "merchantId"        TEXT     NOT NULL,
    "serviceId"         TEXT     NOT NULL,
    "merchantUserId"    TEXT,
    "prodKeyCiphertext" TEXT     NOT NULL,
    "prodKeyIv"         TEXT     NOT NULL,
    "prodKeyTag"        TEXT     NOT NULL,
    "testKeyCiphertext" TEXT,
    "testKeyIv"         TEXT,
    "testKeyTag"        TEXT,
    "isTestMode"        BOOLEAN  NOT NULL,
    "reason"            TEXT,
    "changedBy"         TEXT,
    "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClickConfigVersion_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ClickConfigVersion_configId_version_key" ON "ClickConfigVersion"("configId", "version");
CREATE INDEX "ClickConfigVersion_clinicId_idx" ON "ClickConfigVersion"("clinicId");
CREATE INDEX "ClickConfigVersion_createdAt_idx" ON "ClickConfigVersion"("createdAt");
ALTER TABLE "ClickConfigVersion"
    ADD CONSTRAINT "ClickConfigVersion_configId_fkey"
    FOREIGN KEY ("configId") REFERENCES "ClinicClickConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClickConfigVersion"
    ADD CONSTRAINT "ClickConfigVersion_clinicId_fkey"
    FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── ClickWebhookLog ─────────────────────────────────────────────────────────
CREATE TABLE "ClickWebhookLog" (
    "id"           TEXT     NOT NULL,
    "clinicId"     TEXT,
    "method"       TEXT     NOT NULL,
    "errorCode"    INTEGER,
    "errorMsg"     TEXT,
    "orderId"      TEXT,
    "clickTransId" TEXT,
    "durationMs"   INTEGER  NOT NULL,
    "isTestMode"   BOOLEAN  NOT NULL DEFAULT false,
    "ip"           TEXT,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClickWebhookLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ClickWebhookLog_clinicId_createdAt_idx" ON "ClickWebhookLog"("clinicId", "createdAt");
CREATE INDEX "ClickWebhookLog_clinicId_errorCode_idx" ON "ClickWebhookLog"("clinicId", "errorCode");
CREATE INDEX "ClickWebhookLog_createdAt_idx" ON "ClickWebhookLog"("createdAt");
