-- CreateTable
CREATE TABLE "OfertaVersion" (
    "id" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileName" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uploadedById" TEXT,

    CONSTRAINT "OfertaVersion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OfertaVersion_version_key" ON "OfertaVersion"("version");

-- CreateIndex
CREATE INDEX "OfertaVersion_isActive_idx" ON "OfertaVersion"("isActive");

-- AlterTable: track which oferta version was accepted at booking time
ALTER TABLE "Appointment" ADD COLUMN "ofertaVersionId" TEXT;
ALTER TABLE "Appointment" ADD COLUMN "ofertaAcceptedAt" TIMESTAMP(3);

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_ofertaVersionId_fkey"
    FOREIGN KEY ("ofertaVersionId") REFERENCES "OfertaVersion"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
