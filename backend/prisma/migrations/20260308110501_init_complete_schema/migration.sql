-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SUPER_ADMIN', 'CLINIC_ADMIN', 'PATIENT', 'PENDING_CLINIC');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('PENDING', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "AnesthesiaType" AS ENUM ('LOCAL', 'GENERAL', 'SPINAL', 'SEDATION');

-- CreateEnum
CREATE TYPE "RoomType" AS ENUM ('STANDARD', 'COMFORT', 'LUX', 'VIP');

-- CreateEnum
CREATE TYPE "Complexity" AS ENUM ('SIMPLE', 'MEDIUM', 'COMPLEX', 'ADVANCED');

-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "ClinicStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'BLOCKED');

-- CreateEnum
CREATE TYPE "ClinicType" AS ENUM ('GENERAL', 'SPECIALIZED', 'DIAGNOSTIC', 'DENTAL', 'MATERNITY', 'REHABILITATION', 'PHARMACY', 'OTHER');

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "AppointmentServiceType" AS ENUM ('DIAGNOSTIC', 'SURGICAL', 'OTHER');

-- CreateEnum
CREATE TYPE "CheckupCategory" AS ENUM ('BASIC', 'SPECIALIZED', 'AGE_BASED');

-- CreateEnum
CREATE TYPE "RegistrationStatus" AS ENUM ('PENDING', 'IN_REVIEW', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "passwordHash" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "role" "Role" NOT NULL DEFAULT 'PATIENT',
    "status" "UserStatus" NOT NULL DEFAULT 'PENDING',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "clinicId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceCategory" (
    "id" TEXT NOT NULL,
    "parentId" TEXT,
    "level" INTEGER NOT NULL DEFAULT 0,
    "nameUz" TEXT NOT NULL,
    "nameRu" TEXT,
    "nameEn" TEXT,
    "slug" TEXT NOT NULL,
    "icon" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiagnosticService" (
    "id" TEXT NOT NULL,
    "nameUz" TEXT NOT NULL,
    "nameRu" TEXT,
    "nameEn" TEXT,
    "categoryId" TEXT NOT NULL,
    "shortDescription" VARCHAR(200),
    "fullDescription" TEXT,
    "priceRecommended" INTEGER NOT NULL DEFAULT 0,
    "priceMin" INTEGER NOT NULL DEFAULT 0,
    "priceMax" INTEGER NOT NULL DEFAULT 0,
    "durationMinutes" INTEGER NOT NULL DEFAULT 30,
    "resultTimeHours" DOUBLE PRECISION NOT NULL DEFAULT 24,
    "preparation" TEXT,
    "contraindications" TEXT,
    "sampleType" VARCHAR(100),
    "imageUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiagnosticService_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SurgicalService" (
    "id" TEXT NOT NULL,
    "nameUz" TEXT NOT NULL,
    "nameRu" TEXT,
    "nameEn" TEXT,
    "categoryId" TEXT NOT NULL,
    "shortDescription" VARCHAR(200),
    "fullDescription" TEXT,
    "imageUrl" TEXT,
    "priceRecommended" INTEGER NOT NULL,
    "priceMin" INTEGER NOT NULL,
    "priceMax" INTEGER NOT NULL,
    "durationMinutes" INTEGER NOT NULL DEFAULT 0,
    "minDuration" INTEGER,
    "maxDuration" INTEGER,
    "recoveryDays" INTEGER NOT NULL DEFAULT 0,
    "anesthesiaType" "AnesthesiaType" NOT NULL,
    "anesthesiaNotes" TEXT,
    "requiresHospitalization" BOOLEAN NOT NULL DEFAULT true,
    "hospitalizationDays" INTEGER,
    "roomType" "RoomType",
    "requiresICU" BOOLEAN NOT NULL DEFAULT false,
    "icuDays" INTEGER,
    "hospitalizationNotes" TEXT,
    "requiredTests" JSONB,
    "preparationFasting" BOOLEAN NOT NULL DEFAULT false,
    "fastingHours" INTEGER,
    "preparationMedication" TEXT,
    "preparationRestrictions" JSONB,
    "preparationTimeline" TEXT,
    "contraindicationsAbsolute" JSONB,
    "contraindicationsRelative" JSONB,
    "complexity" "Complexity" NOT NULL,
    "riskLevel" "RiskLevel" NOT NULL,
    "minSurgeonExperience" INTEGER NOT NULL DEFAULT 0,
    "surgeonQualifications" JSONB,
    "surgeonSpecialization" TEXT,
    "requiredEquipment" JSONB,
    "operationStages" JSONB,
    "postOpImmediate" JSONB,
    "postOpHome" JSONB,
    "followUpSchedule" JSONB,
    "recoveryMilestones" JSONB,
    "packageIncluded" JSONB,
    "packageExcluded" JSONB,
    "alternatives" JSONB,
    "faqs" JSONB,
    "successRate" DOUBLE PRECISION,
    "videoUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SurgicalService_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Clinic" (
    "id" TEXT NOT NULL,
    "nameUz" TEXT NOT NULL,
    "nameRu" TEXT,
    "nameEn" TEXT,
    "type" "ClinicType" NOT NULL DEFAULT 'GENERAL',
    "status" "ClinicStatus" NOT NULL DEFAULT 'PENDING',
    "description" TEXT,
    "logo" TEXT,
    "coverImage" TEXT,
    "region" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "street" TEXT NOT NULL,
    "apartment" TEXT,
    "landmark" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "phones" JSONB NOT NULL DEFAULT '[]',
    "emails" JSONB NOT NULL DEFAULT '[]',
    "website" TEXT,
    "socialMedia" JSONB,
    "workingHours" JSONB NOT NULL DEFAULT '[]',
    "hasEmergency" BOOLEAN NOT NULL DEFAULT false,
    "hasAmbulance" BOOLEAN NOT NULL DEFAULT false,
    "hasOnlineBooking" BOOLEAN NOT NULL DEFAULT true,
    "bedsCount" INTEGER,
    "floorsCount" INTEGER,
    "parkingAvailable" BOOLEAN NOT NULL DEFAULT false,
    "amenities" JSONB,
    "paymentMethods" JSONB,
    "insuranceAccepted" JSONB,
    "priceRange" TEXT,
    "averageRating" DOUBLE PRECISION DEFAULT 0,
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "registrationNumber" TEXT NOT NULL,
    "taxId" TEXT NOT NULL,
    "licenseNumber" TEXT NOT NULL,
    "licenseIssuedAt" TIMESTAMP(3),
    "licenseExpiresAt" TIMESTAMP(3),
    "licenseIssuedBy" TEXT,
    "adminFirstName" TEXT NOT NULL,
    "adminLastName" TEXT NOT NULL,
    "adminEmail" TEXT NOT NULL,
    "adminPhone" TEXT NOT NULL,
    "adminPosition" TEXT,
    "rejectionReason" TEXT,
    "notes" TEXT,
    "approvedById" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Clinic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Doctor" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "specialty" TEXT,
    "bio" TEXT,
    "photoUrl" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Doctor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Appointment" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "doctorId" TEXT,
    "serviceType" "AppointmentServiceType" NOT NULL DEFAULT 'OTHER',
    "diagnosticServiceId" TEXT,
    "surgicalServiceId" TEXT,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'PENDING',
    "price" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rating" DOUBLE PRECISION NOT NULL,
    "comment" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClinicDiagnosticService" (
    "clinicId" TEXT NOT NULL,
    "diagnosticServiceId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClinicDiagnosticService_pkey" PRIMARY KEY ("clinicId","diagnosticServiceId")
);

-- CreateTable
CREATE TABLE "ClinicSurgicalService" (
    "clinicId" TEXT NOT NULL,
    "surgicalServiceId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClinicSurgicalService_pkey" PRIMARY KEY ("clinicId","surgicalServiceId")
);

-- CreateTable
CREATE TABLE "CheckupPackage" (
    "id" TEXT NOT NULL,
    "nameUz" TEXT NOT NULL,
    "nameRu" TEXT,
    "nameEn" TEXT,
    "slug" TEXT NOT NULL,
    "category" "CheckupCategory" NOT NULL,
    "shortDescription" VARCHAR(200),
    "fullDescription" TEXT,
    "targetAudience" VARCHAR(100),
    "recommendedPrice" INTEGER NOT NULL,
    "priceMin" INTEGER NOT NULL,
    "priceMax" INTEGER NOT NULL,
    "discount" INTEGER,
    "imageUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CheckupPackage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CheckupPackageItem" (
    "id" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "diagnosticServiceId" TEXT NOT NULL,
    "serviceName" TEXT NOT NULL,
    "servicePrice" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "notes" VARCHAR(255),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CheckupPackageItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClinicCheckupPackage" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "clinicPrice" INTEGER NOT NULL,
    "customNotes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "bookingCount" INTEGER NOT NULL DEFAULT 0,
    "activatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClinicCheckupPackage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClinicRegistrationRequest" (
    "id" TEXT NOT NULL,
    "status" "RegistrationStatus" NOT NULL DEFAULT 'PENDING',
    "nameUz" TEXT NOT NULL,
    "nameRu" TEXT,
    "nameEn" TEXT,
    "clinicType" TEXT NOT NULL,
    "foundedYear" INTEGER,
    "descriptionUz" TEXT NOT NULL,
    "descriptionRu" TEXT,
    "logoUrl" TEXT,
    "regionId" TEXT NOT NULL,
    "districtId" TEXT NOT NULL,
    "streetAddress" TEXT NOT NULL,
    "addressUz" TEXT NOT NULL,
    "addressRu" TEXT,
    "zipCode" TEXT,
    "googleMapsUrl" TEXT,
    "landmark" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "primaryPhone" TEXT NOT NULL,
    "secondaryPhone" TEXT,
    "emergencyPhone" TEXT,
    "email" TEXT NOT NULL,
    "website" TEXT,
    "telegram" TEXT,
    "instagram" TEXT,
    "facebook" TEXT,
    "youtube" TEXT,
    "workingHours" JSONB NOT NULL,
    "isAlwaysOpen" BOOLEAN NOT NULL DEFAULT false,
    "lunchBreakStart" TEXT,
    "lunchBreakEnd" TEXT,
    "holidayNotes" TEXT,
    "selectedServices" JSONB NOT NULL DEFAULT '[]',
    "licenseUrl" TEXT,
    "licenseNumber" TEXT NOT NULL,
    "licenseExpiry" TEXT NOT NULL,
    "inn" TEXT NOT NULL,
    "legalName" TEXT NOT NULL,
    "legalAddress" TEXT NOT NULL,
    "legalForm" TEXT,
    "certificates" JSONB NOT NULL DEFAULT '[]',
    "bankName" TEXT NOT NULL,
    "bankAccountNumber" TEXT NOT NULL,
    "mfo" TEXT NOT NULL,
    "oked" TEXT,
    "vatNumber" TEXT,
    "paymentMethods" JSONB NOT NULL DEFAULT '[]',
    "invoiceEmail" TEXT,
    "rejectionReason" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClinicRegistrationRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClinicRegistrationPerson" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "middleName" TEXT,
    "position" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "passwordHash" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClinicRegistrationPerson_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "User_clinicId_key" ON "User"("clinicId");

-- CreateIndex
CREATE INDEX "User_phone_idx" ON "User"("phone");

-- CreateIndex
CREATE INDEX "User_status_idx" ON "User"("status");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceCategory_slug_key" ON "ServiceCategory"("slug");

-- CreateIndex
CREATE INDEX "DiagnosticService_categoryId_idx" ON "DiagnosticService"("categoryId");

-- CreateIndex
CREATE INDEX "DiagnosticService_isActive_idx" ON "DiagnosticService"("isActive");

-- CreateIndex
CREATE INDEX "DiagnosticService_priceRecommended_idx" ON "DiagnosticService"("priceRecommended");

-- CreateIndex
CREATE INDEX "SurgicalService_categoryId_idx" ON "SurgicalService"("categoryId");

-- CreateIndex
CREATE INDEX "SurgicalService_isActive_idx" ON "SurgicalService"("isActive");

-- CreateIndex
CREATE INDEX "SurgicalService_complexity_idx" ON "SurgicalService"("complexity");

-- CreateIndex
CREATE INDEX "SurgicalService_riskLevel_idx" ON "SurgicalService"("riskLevel");

-- CreateIndex
CREATE UNIQUE INDEX "Clinic_registrationNumber_key" ON "Clinic"("registrationNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Clinic_taxId_key" ON "Clinic"("taxId");

-- CreateIndex
CREATE INDEX "Clinic_status_idx" ON "Clinic"("status");

-- CreateIndex
CREATE INDEX "Clinic_region_idx" ON "Clinic"("region");

-- CreateIndex
CREATE INDEX "Clinic_type_idx" ON "Clinic"("type");

-- CreateIndex
CREATE INDEX "Doctor_clinicId_idx" ON "Doctor"("clinicId");

-- CreateIndex
CREATE INDEX "Doctor_isActive_idx" ON "Doctor"("isActive");

-- CreateIndex
CREATE INDEX "Appointment_clinicId_idx" ON "Appointment"("clinicId");

-- CreateIndex
CREATE INDEX "Appointment_patientId_idx" ON "Appointment"("patientId");

-- CreateIndex
CREATE INDEX "Appointment_doctorId_idx" ON "Appointment"("doctorId");

-- CreateIndex
CREATE INDEX "Appointment_status_idx" ON "Appointment"("status");

-- CreateIndex
CREATE INDEX "Appointment_scheduledAt_idx" ON "Appointment"("scheduledAt");

-- CreateIndex
CREATE INDEX "Review_clinicId_idx" ON "Review"("clinicId");

-- CreateIndex
CREATE INDEX "Review_userId_idx" ON "Review"("userId");

-- CreateIndex
CREATE INDEX "Review_rating_idx" ON "Review"("rating");

-- CreateIndex
CREATE INDEX "Review_isActive_idx" ON "Review"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Review_clinicId_userId_key" ON "Review"("clinicId", "userId");

-- CreateIndex
CREATE INDEX "ClinicDiagnosticService_clinicId_idx" ON "ClinicDiagnosticService"("clinicId");

-- CreateIndex
CREATE INDEX "ClinicDiagnosticService_diagnosticServiceId_idx" ON "ClinicDiagnosticService"("diagnosticServiceId");

-- CreateIndex
CREATE INDEX "ClinicDiagnosticService_isActive_idx" ON "ClinicDiagnosticService"("isActive");

-- CreateIndex
CREATE INDEX "ClinicSurgicalService_clinicId_idx" ON "ClinicSurgicalService"("clinicId");

-- CreateIndex
CREATE INDEX "ClinicSurgicalService_surgicalServiceId_idx" ON "ClinicSurgicalService"("surgicalServiceId");

-- CreateIndex
CREATE INDEX "ClinicSurgicalService_isActive_idx" ON "ClinicSurgicalService"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "CheckupPackage_slug_key" ON "CheckupPackage"("slug");

-- CreateIndex
CREATE INDEX "CheckupPackage_category_idx" ON "CheckupPackage"("category");

-- CreateIndex
CREATE INDEX "CheckupPackage_isActive_idx" ON "CheckupPackage"("isActive");

-- CreateIndex
CREATE INDEX "CheckupPackage_slug_idx" ON "CheckupPackage"("slug");

-- CreateIndex
CREATE INDEX "CheckupPackageItem_packageId_idx" ON "CheckupPackageItem"("packageId");

-- CreateIndex
CREATE INDEX "CheckupPackageItem_diagnosticServiceId_idx" ON "CheckupPackageItem"("diagnosticServiceId");

-- CreateIndex
CREATE INDEX "ClinicCheckupPackage_clinicId_idx" ON "ClinicCheckupPackage"("clinicId");

-- CreateIndex
CREATE INDEX "ClinicCheckupPackage_packageId_idx" ON "ClinicCheckupPackage"("packageId");

-- CreateIndex
CREATE INDEX "ClinicCheckupPackage_isActive_idx" ON "ClinicCheckupPackage"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "ClinicCheckupPackage_clinicId_packageId_key" ON "ClinicCheckupPackage"("clinicId", "packageId");

-- CreateIndex
CREATE INDEX "ClinicRegistrationRequest_status_idx" ON "ClinicRegistrationRequest"("status");

-- CreateIndex
CREATE INDEX "ClinicRegistrationPerson_requestId_idx" ON "ClinicRegistrationPerson"("requestId");

-- CreateIndex
CREATE INDEX "ClinicRegistrationPerson_phone_idx" ON "ClinicRegistrationPerson"("phone");

-- AddForeignKey
ALTER TABLE "ServiceCategory" ADD CONSTRAINT "ServiceCategory_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "ServiceCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiagnosticService" ADD CONSTRAINT "DiagnosticService_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiagnosticService" ADD CONSTRAINT "DiagnosticService_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ServiceCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurgicalService" ADD CONSTRAINT "SurgicalService_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurgicalService" ADD CONSTRAINT "SurgicalService_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ServiceCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Doctor" ADD CONSTRAINT "Doctor_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "Doctor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_diagnosticServiceId_fkey" FOREIGN KEY ("diagnosticServiceId") REFERENCES "DiagnosticService"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_surgicalServiceId_fkey" FOREIGN KEY ("surgicalServiceId") REFERENCES "SurgicalService"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicDiagnosticService" ADD CONSTRAINT "ClinicDiagnosticService_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicDiagnosticService" ADD CONSTRAINT "ClinicDiagnosticService_diagnosticServiceId_fkey" FOREIGN KEY ("diagnosticServiceId") REFERENCES "DiagnosticService"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicSurgicalService" ADD CONSTRAINT "ClinicSurgicalService_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicSurgicalService" ADD CONSTRAINT "ClinicSurgicalService_surgicalServiceId_fkey" FOREIGN KEY ("surgicalServiceId") REFERENCES "SurgicalService"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckupPackageItem" ADD CONSTRAINT "CheckupPackageItem_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "CheckupPackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicCheckupPackage" ADD CONSTRAINT "ClinicCheckupPackage_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicCheckupPackage" ADD CONSTRAINT "ClinicCheckupPackage_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "CheckupPackage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicRegistrationPerson" ADD CONSTRAINT "ClinicRegistrationPerson_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "ClinicRegistrationRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
