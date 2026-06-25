-- Ambulance dispatch (Phase 1)
-- Adds per-ambulance dispatcher link + request/offer tables.

-- 1. Enums
CREATE TYPE "AmbulanceRequestStatus" AS ENUM ('PENDING', 'DISPATCHED', 'ON_ROUTE', 'ARRIVED', 'COMPLETED', 'CANCELLED');
CREATE TYPE "DispatchOfferStatus" AS ENUM ('SHOWN', 'ACCEPTED', 'LOST', 'DECLINED');

-- 2. Per-ambulance dispatcher
ALTER TABLE "Ambulance"
    ADD COLUMN "dispatcherPhone" TEXT,
    ADD COLUMN "dispatcherUserId" TEXT;

CREATE INDEX "Ambulance_dispatcherUserId_idx" ON "Ambulance"("dispatcherUserId");

ALTER TABLE "Ambulance"
    ADD CONSTRAINT "Ambulance_dispatcherUserId_fkey"
    FOREIGN KEY ("dispatcherUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 3. AmbulanceRequest
CREATE TABLE "AmbulanceRequest" (
    "id"                  TEXT NOT NULL,
    "patientId"           TEXT NOT NULL,
    "status"              "AmbulanceRequestStatus" NOT NULL DEFAULT 'PENDING',
    "pickupLat"           DOUBLE PRECISION NOT NULL,
    "pickupLng"           DOUBLE PRECISION NOT NULL,
    "pickupAddress"       TEXT,
    "destLat"             DOUBLE PRECISION,
    "destLng"             DOUBLE PRECISION,
    "destAddress"         TEXT,
    "destClinicId"        TEXT,
    "priceMaxSom"         INTEGER,
    "estimatedDistanceKm" DOUBLE PRECISION,
    "estimatedDurationMin" INTEGER,
    "description"         TEXT,
    "acceptedAmbulanceId" TEXT,
    "acceptedAt"          TIMESTAMP(3),
    "cancelledAt"         TIMESTAMP(3),
    "cancelReason"        TEXT,
    "completedAt"         TIMESTAMP(3),
    "createdAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"           TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AmbulanceRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AmbulanceRequest_patientId_idx" ON "AmbulanceRequest"("patientId");
CREATE INDEX "AmbulanceRequest_status_idx" ON "AmbulanceRequest"("status");
CREATE INDEX "AmbulanceRequest_acceptedAmbulanceId_idx" ON "AmbulanceRequest"("acceptedAmbulanceId");
CREATE INDEX "AmbulanceRequest_createdAt_idx" ON "AmbulanceRequest"("createdAt");

ALTER TABLE "AmbulanceRequest"
    ADD CONSTRAINT "AmbulanceRequest_patientId_fkey"
    FOREIGN KEY ("patientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AmbulanceRequest"
    ADD CONSTRAINT "AmbulanceRequest_acceptedAmbulanceId_fkey"
    FOREIGN KEY ("acceptedAmbulanceId") REFERENCES "Ambulance"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AmbulanceRequest"
    ADD CONSTRAINT "AmbulanceRequest_destClinicId_fkey"
    FOREIGN KEY ("destClinicId") REFERENCES "Clinic"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 4. DispatchOffer
CREATE TABLE "DispatchOffer" (
    "id"                TEXT NOT NULL,
    "requestId"         TEXT NOT NULL,
    "ambulanceId"       TEXT NOT NULL,
    "dispatcherUserId"  TEXT NOT NULL,
    "status"            "DispatchOfferStatus" NOT NULL DEFAULT 'SHOWN',
    "telegramChatId"    BIGINT,
    "telegramMessageId" BIGINT,
    "sentAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt"       TIMESTAMP(3),

    CONSTRAINT "DispatchOffer_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DispatchOffer_requestId_ambulanceId_key" ON "DispatchOffer"("requestId", "ambulanceId");
CREATE INDEX "DispatchOffer_requestId_idx" ON "DispatchOffer"("requestId");
CREATE INDEX "DispatchOffer_dispatcherUserId_idx" ON "DispatchOffer"("dispatcherUserId");
CREATE INDEX "DispatchOffer_status_idx" ON "DispatchOffer"("status");

ALTER TABLE "DispatchOffer"
    ADD CONSTRAINT "DispatchOffer_requestId_fkey"
    FOREIGN KEY ("requestId") REFERENCES "AmbulanceRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DispatchOffer"
    ADD CONSTRAINT "DispatchOffer_ambulanceId_fkey"
    FOREIGN KEY ("ambulanceId") REFERENCES "Ambulance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DispatchOffer"
    ADD CONSTRAINT "DispatchOffer_dispatcherUserId_fkey"
    FOREIGN KEY ("dispatcherUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
