-- AlterTable
ALTER TABLE "ServiceCustomization" ADD COLUMN     "accuracy" VARCHAR(50),
ADD COLUMN     "additionalInfo" JSONB,
ADD COLUMN     "bookingPolicy" JSONB,
ADD COLUMN     "certifications" JSONB,
ADD COLUMN     "equipment" VARCHAR(200),
ADD COLUMN     "fullDescriptionRu" TEXT,
ADD COLUMN     "fullDescriptionUz" TEXT,
ADD COLUMN     "preparationJson" JSONB,
ADD COLUMN     "processDescription" TEXT,
ADD COLUMN     "resultFormat" VARCHAR(200),
ADD COLUMN     "resultTimeHours" DOUBLE PRECISION,
ADD COLUMN     "sampleVolume" VARCHAR(50);
