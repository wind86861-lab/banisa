-- CreateTable
CREATE TABLE "GlobalAmbulanceSettings" (
    "id" TEXT NOT NULL,
    "defaultPricePerKm" INTEGER,
    "defaultBaseFee" INTEGER,
    "updatedBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GlobalAmbulanceSettings_pkey" PRIMARY KEY ("id")
);
