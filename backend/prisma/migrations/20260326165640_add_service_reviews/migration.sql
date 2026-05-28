-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "ServiceReview" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "diagnosticServiceId" TEXT,
    "surgicalServiceId" TEXT,
    "sanatoriumServiceId" TEXT,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "status" "ReviewStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ServiceReview_diagnosticServiceId_idx" ON "ServiceReview"("diagnosticServiceId");

-- CreateIndex
CREATE INDEX "ServiceReview_surgicalServiceId_idx" ON "ServiceReview"("surgicalServiceId");

-- CreateIndex
CREATE INDEX "ServiceReview_sanatoriumServiceId_idx" ON "ServiceReview"("sanatoriumServiceId");

-- CreateIndex
CREATE INDEX "ServiceReview_userId_idx" ON "ServiceReview"("userId");

-- CreateIndex
CREATE INDEX "ServiceReview_status_idx" ON "ServiceReview"("status");

-- CreateIndex
CREATE INDEX "ServiceReview_rating_idx" ON "ServiceReview"("rating");

-- CreateIndex
CREATE INDEX "ServiceReview_createdAt_idx" ON "ServiceReview"("createdAt");

-- AddForeignKey
ALTER TABLE "ServiceReview" ADD CONSTRAINT "ServiceReview_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceReview" ADD CONSTRAINT "ServiceReview_diagnosticServiceId_fkey" FOREIGN KEY ("diagnosticServiceId") REFERENCES "DiagnosticService"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceReview" ADD CONSTRAINT "ServiceReview_surgicalServiceId_fkey" FOREIGN KEY ("surgicalServiceId") REFERENCES "SurgicalService"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceReview" ADD CONSTRAINT "ServiceReview_sanatoriumServiceId_fkey" FOREIGN KEY ("sanatoriumServiceId") REFERENCES "SanatoriumService"("id") ON DELETE SET NULL ON UPDATE CASCADE;
