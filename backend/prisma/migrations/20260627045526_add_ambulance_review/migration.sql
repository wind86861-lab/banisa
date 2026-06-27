-- CreateTable
CREATE TABLE "AmbulanceReview" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "ambulanceId" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AmbulanceReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AmbulanceReview_requestId_key" ON "AmbulanceReview"("requestId");

-- CreateIndex
CREATE INDEX "AmbulanceReview_ambulanceId_idx" ON "AmbulanceReview"("ambulanceId");

-- CreateIndex
CREATE INDEX "AmbulanceReview_clinicId_idx" ON "AmbulanceReview"("clinicId");

-- CreateIndex
CREATE INDEX "AmbulanceReview_patientId_idx" ON "AmbulanceReview"("patientId");

-- CreateIndex
CREATE INDEX "AmbulanceReview_createdAt_idx" ON "AmbulanceReview"("createdAt");

-- AddForeignKey
ALTER TABLE "AmbulanceReview" ADD CONSTRAINT "AmbulanceReview_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "AmbulanceRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AmbulanceReview" ADD CONSTRAINT "AmbulanceReview_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AmbulanceReview" ADD CONSTRAINT "AmbulanceReview_ambulanceId_fkey" FOREIGN KEY ("ambulanceId") REFERENCES "Ambulance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AmbulanceReview" ADD CONSTRAINT "AmbulanceReview_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
