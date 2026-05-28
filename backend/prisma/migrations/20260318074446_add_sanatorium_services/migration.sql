-- CreateEnum
CREATE TYPE "SanatoriumServiceType" AS ENUM ('ACCOMMODATION', 'MEDICAL', 'NUTRITION', 'PROGRAM');

-- CreateTable
CREATE TABLE "SanatoriumService" (
    "id" TEXT NOT NULL,
    "nameUz" TEXT NOT NULL,
    "nameRu" TEXT,
    "nameEn" TEXT,
    "categoryId" TEXT NOT NULL,
    "shortDescription" VARCHAR(200),
    "fullDescription" TEXT,
    "imageUrl" TEXT,
    "serviceType" "SanatoriumServiceType" NOT NULL,
    "priceRecommended" INTEGER NOT NULL DEFAULT 0,
    "priceMin" INTEGER NOT NULL DEFAULT 0,
    "priceMax" INTEGER NOT NULL DEFAULT 0,
    "pricePer" TEXT NOT NULL DEFAULT 'session',
    "durationMinutes" INTEGER NOT NULL DEFAULT 0,
    "durationDays" INTEGER,
    "sessionsCount" INTEGER,
    "capacity" INTEGER,
    "includes" JSONB,
    "contraindications" TEXT,
    "preparation" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SanatoriumService_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClinicSanatoriumService" (
    "clinicId" TEXT NOT NULL,
    "sanatoriumServiceId" TEXT NOT NULL,
    "clinicPrice" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClinicSanatoriumService_pkey" PRIMARY KEY ("clinicId","sanatoriumServiceId")
);

-- CreateIndex
CREATE INDEX "SanatoriumService_categoryId_idx" ON "SanatoriumService"("categoryId");

-- CreateIndex
CREATE INDEX "SanatoriumService_isActive_idx" ON "SanatoriumService"("isActive");

-- CreateIndex
CREATE INDEX "SanatoriumService_serviceType_idx" ON "SanatoriumService"("serviceType");

-- CreateIndex
CREATE INDEX "ClinicSanatoriumService_clinicId_idx" ON "ClinicSanatoriumService"("clinicId");

-- CreateIndex
CREATE INDEX "ClinicSanatoriumService_sanatoriumServiceId_idx" ON "ClinicSanatoriumService"("sanatoriumServiceId");

-- CreateIndex
CREATE INDEX "ClinicSanatoriumService_isActive_idx" ON "ClinicSanatoriumService"("isActive");

-- AddForeignKey
ALTER TABLE "SanatoriumService" ADD CONSTRAINT "SanatoriumService_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SanatoriumService" ADD CONSTRAINT "SanatoriumService_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ServiceCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicSanatoriumService" ADD CONSTRAINT "ClinicSanatoriumService_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicSanatoriumService" ADD CONSTRAINT "ClinicSanatoriumService_sanatoriumServiceId_fkey" FOREIGN KEY ("sanatoriumServiceId") REFERENCES "SanatoriumService"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
