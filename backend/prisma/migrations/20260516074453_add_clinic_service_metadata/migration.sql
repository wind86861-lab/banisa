-- CreateTable
CREATE TABLE "ClinicServiceMetadata" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "serviceType" "ServiceType" NOT NULL,
    "serviceId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClinicServiceMetadata_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClinicServiceMetadata_serviceType_serviceId_templateId_valu_idx" ON "ClinicServiceMetadata"("serviceType", "serviceId", "templateId", "value");

-- CreateIndex
CREATE INDEX "ClinicServiceMetadata_clinicId_idx" ON "ClinicServiceMetadata"("clinicId");

-- CreateIndex
CREATE INDEX "ClinicServiceMetadata_templateId_idx" ON "ClinicServiceMetadata"("templateId");

-- CreateIndex
CREATE UNIQUE INDEX "ClinicServiceMetadata_clinicId_serviceType_serviceId_templa_key" ON "ClinicServiceMetadata"("clinicId", "serviceType", "serviceId", "templateId");

-- AddForeignKey
ALTER TABLE "ClinicServiceMetadata" ADD CONSTRAINT "ClinicServiceMetadata_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicServiceMetadata" ADD CONSTRAINT "ClinicServiceMetadata_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "MetadataTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
