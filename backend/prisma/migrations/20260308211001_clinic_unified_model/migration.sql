-- CreateEnum
CREATE TYPE "ClinicSource" AS ENUM ('ADMIN_CREATED', 'SELF_REGISTERED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ClinicStatus" ADD VALUE 'IN_REVIEW';
ALTER TYPE "ClinicStatus" ADD VALUE 'SUSPENDED';
ALTER TYPE "ClinicStatus" ADD VALUE 'DELETED';

-- DropIndex
DROP INDEX "Clinic_registrationNumber_key";

-- DropIndex
DROP INDEX "Clinic_taxId_key";

-- AlterTable
ALTER TABLE "Clinic" ADD COLUMN     "createdBy" TEXT,
ADD COLUMN     "pendingPersons" JSONB,
ADD COLUMN     "reviewedAt" TIMESTAMP(3),
ADD COLUMN     "reviewedBy" TEXT,
ADD COLUMN     "source" "ClinicSource" NOT NULL DEFAULT 'ADMIN_CREATED',
ADD COLUMN     "submittedAt" TIMESTAMP(3),
ALTER COLUMN "registrationNumber" DROP NOT NULL,
ALTER COLUMN "taxId" DROP NOT NULL,
ALTER COLUMN "licenseNumber" DROP NOT NULL,
ALTER COLUMN "adminFirstName" DROP NOT NULL,
ALTER COLUMN "adminLastName" DROP NOT NULL,
ALTER COLUMN "adminEmail" DROP NOT NULL,
ALTER COLUMN "adminPhone" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "Clinic_source_idx" ON "Clinic"("source");

-- CreateIndex
CREATE INDEX "Clinic_createdAt_idx" ON "Clinic"("createdAt");
