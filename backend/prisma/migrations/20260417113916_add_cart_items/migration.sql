-- CreateEnum
CREATE TYPE "ServiceType" AS ENUM ('DIAGNOSTIC', 'SURGICAL', 'SANATORIUM', 'CHECKUP');

-- AlterTable
ALTER TABLE "Clinic" ADD COLUMN     "legalForm" TEXT,
ADD COLUMN     "legalName" TEXT;

-- AlterTable
ALTER TABLE "ClinicSurgicalService" ADD COLUMN     "customizationData" JSONB,
ADD COLUMN     "serviceImages" JSONB;

-- CreateTable
CREATE TABLE "CartItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "serviceType" "ServiceType" NOT NULL,
    "serviceId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CartItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CartItem_userId_idx" ON "CartItem"("userId");

-- CreateIndex
CREATE INDEX "CartItem_clinicId_idx" ON "CartItem"("clinicId");

-- CreateIndex
CREATE INDEX "CartItem_serviceType_idx" ON "CartItem"("serviceType");

-- CreateIndex
CREATE UNIQUE INDEX "CartItem_userId_clinicId_serviceType_serviceId_key" ON "CartItem"("userId", "clinicId", "serviceType", "serviceId");

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
