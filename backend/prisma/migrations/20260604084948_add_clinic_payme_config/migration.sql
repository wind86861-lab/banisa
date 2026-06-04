-- AlterTable
ALTER TABLE "ClinicServiceMetadata" ADD COLUMN     "valueMax" TEXT;

-- AlterTable
ALTER TABLE "PaymeTransaction" ADD COLUMN     "clinicId" TEXT,
ADD COLUMN     "isTestMode" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "UserFavorite" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "serviceType" "ServiceType" NOT NULL,
    "serviceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserFavorite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClinicPaymeConfig" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "prodKeyCiphertext" TEXT NOT NULL,
    "prodKeyIv" TEXT NOT NULL,
    "prodKeyTag" TEXT NOT NULL,
    "testKeyCiphertext" TEXT,
    "testKeyIv" TEXT,
    "testKeyTag" TEXT,
    "isTestMode" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "connectedAt" TIMESTAMP(3),
    "lastUsedAt" TIMESTAMP(3),
    "lastRotatedAt" TIMESTAMP(3),
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClinicPaymeConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymeConfigVersion" (
    "id" TEXT NOT NULL,
    "configId" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "merchantId" TEXT NOT NULL,
    "prodKeyCiphertext" TEXT NOT NULL,
    "prodKeyIv" TEXT NOT NULL,
    "prodKeyTag" TEXT NOT NULL,
    "testKeyCiphertext" TEXT,
    "testKeyIv" TEXT,
    "testKeyTag" TEXT,
    "isTestMode" BOOLEAN NOT NULL,
    "reason" TEXT,
    "changedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymeConfigVersion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserFavorite_userId_createdAt_idx" ON "UserFavorite"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "UserFavorite_serviceType_serviceId_idx" ON "UserFavorite"("serviceType", "serviceId");

-- CreateIndex
CREATE UNIQUE INDEX "UserFavorite_userId_serviceType_serviceId_key" ON "UserFavorite"("userId", "serviceType", "serviceId");

-- CreateIndex
CREATE UNIQUE INDEX "ClinicPaymeConfig_clinicId_key" ON "ClinicPaymeConfig"("clinicId");

-- CreateIndex
CREATE INDEX "ClinicPaymeConfig_isActive_idx" ON "ClinicPaymeConfig"("isActive");

-- CreateIndex
CREATE INDEX "PaymeConfigVersion_clinicId_idx" ON "PaymeConfigVersion"("clinicId");

-- CreateIndex
CREATE INDEX "PaymeConfigVersion_createdAt_idx" ON "PaymeConfigVersion"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PaymeConfigVersion_configId_version_key" ON "PaymeConfigVersion"("configId", "version");

-- CreateIndex
CREATE INDEX "PaymeTransaction_orderId_state_idx" ON "PaymeTransaction"("orderId", "state");

-- CreateIndex
CREATE INDEX "PaymeTransaction_clinicId_idx" ON "PaymeTransaction"("clinicId");

-- CreateIndex
CREATE INDEX "PaymeTransaction_clinicId_state_idx" ON "PaymeTransaction"("clinicId", "state");

-- AddForeignKey
ALTER TABLE "UserFavorite" ADD CONSTRAINT "UserFavorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymeTransaction" ADD CONSTRAINT "PaymeTransaction_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicPaymeConfig" ADD CONSTRAINT "ClinicPaymeConfig_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymeConfigVersion" ADD CONSTRAINT "PaymeConfigVersion_configId_fkey" FOREIGN KEY ("configId") REFERENCES "ClinicPaymeConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymeConfigVersion" ADD CONSTRAINT "PaymeConfigVersion_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
