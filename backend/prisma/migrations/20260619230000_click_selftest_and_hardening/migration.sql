-- Mirror Payme's self-test tracking onto Click: patchActive will refuse to
-- flip isActive=true unless lastSelfTestStatus='pass' within the last 24h
-- (forceActivate=true bypass remains for migration emergencies, audited).
ALTER TABLE "ClinicClickConfig"
    ADD COLUMN IF NOT EXISTS "lastSelfTestAt"     TIMESTAMP(3),
    ADD COLUMN IF NOT EXISTS "lastSelfTestStatus" TEXT,
    ADD COLUMN IF NOT EXISTS "lastSelfTestMsg"    TEXT;
