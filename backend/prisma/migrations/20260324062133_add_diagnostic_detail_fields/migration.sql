-- AlterTable
ALTER TABLE "DiagnosticService" ADD COLUMN     "additionalInfo" JSONB,
ADD COLUMN     "bookingPolicy" JSONB,
ADD COLUMN     "contraindicationsJson" JSONB,
ADD COLUMN     "indicationsJson" JSONB,
ADD COLUMN     "preparationJson" JSONB,
ADD COLUMN     "processDescription" TEXT,
ADD COLUMN     "resultFormat" VARCHAR(200),
ADD COLUMN     "resultParameters" JSONB,
ADD COLUMN     "sampleVolume" VARCHAR(50);
