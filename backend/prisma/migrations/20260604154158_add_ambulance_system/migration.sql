-- CreateEnum
CREATE TYPE "AmbulanceType" AS ENUM ('BASIC', 'INTENSIVE_CARE', 'NEONATAL', 'CARDIAC', 'TRAUMA', 'OBSTETRIC');

-- CreateEnum
CREATE TYPE "AmbulanceStatus" AS ENUM ('AVAILABLE', 'BUSY', 'MAINTENANCE', 'OFFLINE');

-- CreateTable
CREATE TABLE "Ambulance" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "callSign" TEXT NOT NULL,
    "type" "AmbulanceType" NOT NULL DEFAULT 'BASIC',
    "vehicleModel" TEXT,
    "licensePlate" TEXT,
    "capacity" INTEGER NOT NULL DEFAULT 1,
    "equipment" JSONB NOT NULL DEFAULT '[]',
    "status" "AmbulanceStatus" NOT NULL DEFAULT 'OFFLINE',
    "baseLatitude" DOUBLE PRECISION,
    "baseLongitude" DOUBLE PRECISION,
    "currentLatitude" DOUBLE PRECISION,
    "currentLongitude" DOUBLE PRECISION,
    "lastStatusAt" TIMESTAMP(3),
    "baseFee" INTEGER,
    "pricePerKm" INTEGER,
    "dispatchPhone" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ambulance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AmbulanceStatusLog" (
    "id" TEXT NOT NULL,
    "ambulanceId" TEXT NOT NULL,
    "fromStatus" "AmbulanceStatus",
    "toStatus" "AmbulanceStatus" NOT NULL,
    "changedBy" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AmbulanceStatusLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Ambulance_clinicId_idx" ON "Ambulance"("clinicId");

-- CreateIndex
CREATE INDEX "Ambulance_status_idx" ON "Ambulance"("status");

-- CreateIndex
CREATE INDEX "Ambulance_type_idx" ON "Ambulance"("type");

-- CreateIndex
CREATE INDEX "Ambulance_isActive_idx" ON "Ambulance"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Ambulance_clinicId_callSign_key" ON "Ambulance"("clinicId", "callSign");

-- CreateIndex
CREATE INDEX "AmbulanceStatusLog_ambulanceId_idx" ON "AmbulanceStatusLog"("ambulanceId");

-- CreateIndex
CREATE INDEX "AmbulanceStatusLog_createdAt_idx" ON "AmbulanceStatusLog"("createdAt");

-- AddForeignKey
ALTER TABLE "Ambulance" ADD CONSTRAINT "Ambulance_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AmbulanceStatusLog" ADD CONSTRAINT "AmbulanceStatusLog_ambulanceId_fkey" FOREIGN KEY ("ambulanceId") REFERENCES "Ambulance"("id") ON DELETE CASCADE ON UPDATE CASCADE;
