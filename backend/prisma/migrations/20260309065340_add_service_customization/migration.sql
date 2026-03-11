-- Step 1: Add id column as nullable first (table has existing rows)
ALTER TABLE "ClinicDiagnosticService" ADD COLUMN "id" TEXT;

-- Step 2: Populate id for existing rows using gen_random_uuid()
UPDATE "ClinicDiagnosticService" SET "id" = gen_random_uuid() WHERE "id" IS NULL;

-- Step 3: Make id NOT NULL
ALTER TABLE "ClinicDiagnosticService" ALTER COLUMN "id" SET NOT NULL;

-- Step 4: Drop old composite primary key, add new id-based PK
ALTER TABLE "ClinicDiagnosticService" DROP CONSTRAINT "ClinicDiagnosticService_pkey";
ALTER TABLE "ClinicDiagnosticService" ADD CONSTRAINT "ClinicDiagnosticService_pkey" PRIMARY KEY ("id");

-- Step 5: Add unique constraint on composite (replaces old PK behavior)
CREATE UNIQUE INDEX "ClinicDiagnosticService_clinicId_diagnosticServiceId_key"
ON "ClinicDiagnosticService"("clinicId", "diagnosticServiceId");

-- Step 6: Create ServiceCustomization table
CREATE TABLE "ServiceCustomization" (
    "id" TEXT NOT NULL,
    "clinicServiceId" TEXT NOT NULL,
    "customNameUz" TEXT,
    "customNameRu" TEXT,
    "customDescriptionUz" TEXT,
    "customDescriptionRu" TEXT,
    "benefits" JSONB,
    "preparationUz" TEXT,
    "preparationRu" TEXT,
    "customCategory" TEXT,
    "tags" TEXT[],
    "estimatedDurationMinutes" INTEGER,
    "availableDays" TEXT[],
    "availableTimeSlots" JSONB,
    "requiresAppointment" BOOLEAN NOT NULL DEFAULT true,
    "requiresPrepayment" BOOLEAN NOT NULL DEFAULT false,
    "prepaymentPercentage" INTEGER,
    "isHighlighted" BOOLEAN NOT NULL DEFAULT false,
    "displayOrder" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ServiceCustomization_pkey" PRIMARY KEY ("id")
);

-- Step 7: Create ServiceImage table
CREATE TABLE "ServiceImage" (
    "id" TEXT NOT NULL,
    "customizationId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "alt" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ServiceImage_pkey" PRIMARY KEY ("id")
);

-- Step 8: Create indexes
CREATE UNIQUE INDEX "ServiceCustomization_clinicServiceId_key" ON "ServiceCustomization"("clinicServiceId");
CREATE INDEX "ServiceCustomization_clinicServiceId_idx" ON "ServiceCustomization"("clinicServiceId");
CREATE INDEX "ServiceCustomization_customCategory_idx" ON "ServiceCustomization"("customCategory");
CREATE INDEX "ServiceCustomization_isHighlighted_idx" ON "ServiceCustomization"("isHighlighted");
CREATE INDEX "ServiceCustomization_displayOrder_idx" ON "ServiceCustomization"("displayOrder");
CREATE INDEX "ServiceImage_customizationId_idx" ON "ServiceImage"("customizationId");
CREATE INDEX "ServiceImage_order_idx" ON "ServiceImage"("order");
CREATE INDEX "ServiceImage_isPrimary_idx" ON "ServiceImage"("isPrimary");

-- Step 9: Add foreign keys
ALTER TABLE "ServiceCustomization" ADD CONSTRAINT "ServiceCustomization_clinicServiceId_fkey"
FOREIGN KEY ("clinicServiceId") REFERENCES "ClinicDiagnosticService"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ServiceImage" ADD CONSTRAINT "ServiceImage_customizationId_fkey"
FOREIGN KEY ("customizationId") REFERENCES "ServiceCustomization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
