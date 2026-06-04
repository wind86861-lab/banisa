-- AlterTable
ALTER TABLE "Ambulance" ADD COLUMN     "photoUrl" TEXT;

-- AlterTable
ALTER TABLE "Doctor" ADD COLUMN     "photoUrls" JSONB NOT NULL DEFAULT '[]';
