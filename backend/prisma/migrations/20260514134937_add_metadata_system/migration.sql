/*
  Warnings:

  - A unique constraint covering the columns `[bookingNumber]` on the table `Appointment` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[qrToken]` on the table `Appointment` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[checkInSecret]` on the table `Clinic` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `bookingNumber` to the `Appointment` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('UNPAID', 'PAID', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'CARD', 'PAYME', 'CLICK');

-- CreateEnum
CREATE TYPE "MetadataInputType" AS ENUM ('NUMBER', 'TEXT', 'SELECT', 'CHECKBOX', 'DATE', 'TEXTAREA');

-- CreateEnum
CREATE TYPE "MetadataCategory" AS ENUM ('MEDICAL_INFO', 'PREPARATION', 'RESTRICTION', 'ADDITIONAL_INFO');

-- CreateEnum
CREATE TYPE "EditableBy" AS ENUM ('CLINIC', 'OPERATOR', 'BOTH');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AppointmentStatus" ADD VALUE 'OPERATOR_CONFIRMED';
ALTER TYPE "AppointmentStatus" ADD VALUE 'SENT_TO_CLINIC';
ALTER TYPE "AppointmentStatus" ADD VALUE 'CLINIC_ACCEPTED';
ALTER TYPE "AppointmentStatus" ADD VALUE 'PAID';
ALTER TYPE "AppointmentStatus" ADD VALUE 'CHECKED_IN';
ALTER TYPE "AppointmentStatus" ADD VALUE 'IN_PROGRESS';
ALTER TYPE "AppointmentStatus" ADD VALUE 'NO_SHOW';
ALTER TYPE "AppointmentStatus" ADD VALUE 'RESCHEDULED';
ALTER TYPE "AppointmentStatus" ADD VALUE 'PENDING_ARRIVAL';

-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN     "bookingNumber" TEXT NOT NULL,
ADD COLUMN     "cancellationReason" TEXT,
ADD COLUMN     "cancelledAt" TIMESTAMP(3),
ADD COLUMN     "cancelledBy" TEXT,
ADD COLUMN     "cashAdjustmentNote" TEXT,
ADD COLUMN     "cashConfirmedAt" TIMESTAMP(3),
ADD COLUMN     "cashConfirmedById" TEXT,
ADD COLUMN     "cashReceivedAmount" INTEGER,
ADD COLUMN     "checkInLat" DOUBLE PRECISION,
ADD COLUMN     "checkInLng" DOUBLE PRECISION,
ADD COLUMN     "checkInMethod" TEXT,
ADD COLUMN     "checkedInAt" TIMESTAMP(3),
ADD COLUMN     "checkedInById" TEXT,
ADD COLUMN     "clinicNotes" TEXT,
ADD COLUMN     "clinicRespondedAt" TIMESTAMP(3),
ADD COLUMN     "clinicRespondedById" TEXT,
ADD COLUMN     "commissionAmount" INTEGER,
ADD COLUMN     "commissionRate" DOUBLE PRECISION,
ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "completedById" TEXT,
ADD COLUMN     "confirmedByOperatorId" TEXT,
ADD COLUMN     "discountAmount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "discountPercent" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "finalPrice" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "noShowMarkedAt" TIMESTAMP(3),
ADD COLUMN     "noShowMarkedById" TEXT,
ADD COLUMN     "operatorCallNote" TEXT,
ADD COLUMN     "operatorConfirmedAt" TIMESTAMP(3),
ADD COLUMN     "paidAmount" INTEGER,
ADD COLUMN     "paidAt" TIMESTAMP(3),
ADD COLUMN     "paymeTransactionId" TEXT,
ADD COLUMN     "paymentMethod" "PaymentMethod",
ADD COLUMN     "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'UNPAID',
ADD COLUMN     "qrActivatedAt" TIMESTAMP(3),
ADD COLUMN     "qrToken" TEXT,
ADD COLUMN     "startedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Clinic" ADD COLUMN     "checkInSecret" TEXT,
ADD COLUMN     "commissionRate" DOUBLE PRECISION NOT NULL DEFAULT 0.10,
ADD COLUMN     "defaultDiscountPercent" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "ClinicCheckupPackage" ADD COLUMN     "customizationData" JSONB;

-- CreateTable
CREATE TABLE "AppointmentService" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "serviceType" "AppointmentServiceType" NOT NULL,
    "serviceName" TEXT NOT NULL,
    "originalServiceId" TEXT,
    "price" INTEGER NOT NULL DEFAULT 0,
    "finalPrice" INTEGER NOT NULL DEFAULT 0,
    "discountAmount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppointmentService_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppointmentLog" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "oldStatus" TEXT,
    "newStatus" TEXT,
    "userId" TEXT,
    "userRole" TEXT,
    "userName" TEXT,
    "note" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppointmentLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "recipientUserId" TEXT,
    "recipientClinicId" TEXT,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "data" JSONB,
    "link" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MetadataTemplate" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "labelUz" TEXT NOT NULL,
    "labelRu" TEXT,
    "labelEn" TEXT,
    "inputType" "MetadataInputType" NOT NULL,
    "unit" TEXT,
    "category" "MetadataCategory" NOT NULL DEFAULT 'MEDICAL_INFO',
    "validation" JSONB,
    "visibleToPatient" BOOLEAN NOT NULL DEFAULT true,
    "editableBy" "EditableBy" NOT NULL DEFAULT 'CLINIC',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,

    CONSTRAINT "MetadataTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceMetadataLink" (
    "id" TEXT NOT NULL,
    "serviceType" "ServiceType" NOT NULL,
    "serviceId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,

    CONSTRAINT "ServiceMetadataLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppointmentMetadata" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,

    CONSTRAINT "AppointmentMetadata_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AppointmentService_appointmentId_idx" ON "AppointmentService"("appointmentId");

-- CreateIndex
CREATE INDEX "AppointmentLog_appointmentId_idx" ON "AppointmentLog"("appointmentId");

-- CreateIndex
CREATE INDEX "AppointmentLog_createdAt_idx" ON "AppointmentLog"("createdAt");

-- CreateIndex
CREATE INDEX "Notification_recipientUserId_isRead_createdAt_idx" ON "Notification"("recipientUserId", "isRead", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_recipientClinicId_createdAt_idx" ON "Notification"("recipientClinicId", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_type_idx" ON "Notification"("type");

-- CreateIndex
CREATE UNIQUE INDEX "MetadataTemplate_key_key" ON "MetadataTemplate"("key");

-- CreateIndex
CREATE INDEX "MetadataTemplate_isActive_idx" ON "MetadataTemplate"("isActive");

-- CreateIndex
CREATE INDEX "MetadataTemplate_key_idx" ON "MetadataTemplate"("key");

-- CreateIndex
CREATE INDEX "ServiceMetadataLink_serviceType_serviceId_idx" ON "ServiceMetadataLink"("serviceType", "serviceId");

-- CreateIndex
CREATE INDEX "ServiceMetadataLink_templateId_idx" ON "ServiceMetadataLink"("templateId");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceMetadataLink_serviceType_serviceId_templateId_key" ON "ServiceMetadataLink"("serviceType", "serviceId", "templateId");

-- CreateIndex
CREATE INDEX "AppointmentMetadata_appointmentId_idx" ON "AppointmentMetadata"("appointmentId");

-- CreateIndex
CREATE INDEX "AppointmentMetadata_templateId_idx" ON "AppointmentMetadata"("templateId");

-- CreateIndex
CREATE UNIQUE INDEX "AppointmentMetadata_appointmentId_templateId_key" ON "AppointmentMetadata"("appointmentId", "templateId");

-- CreateIndex
CREATE UNIQUE INDEX "Appointment_bookingNumber_key" ON "Appointment"("bookingNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Appointment_qrToken_key" ON "Appointment"("qrToken");

-- CreateIndex
CREATE INDEX "Appointment_bookingNumber_idx" ON "Appointment"("bookingNumber");

-- CreateIndex
CREATE INDEX "Appointment_qrToken_idx" ON "Appointment"("qrToken");

-- CreateIndex
CREATE INDEX "Appointment_paymentStatus_idx" ON "Appointment"("paymentStatus");

-- CreateIndex
CREATE UNIQUE INDEX "Clinic_checkInSecret_key" ON "Clinic"("checkInSecret");

-- AddForeignKey
ALTER TABLE "AppointmentService" ADD CONSTRAINT "AppointmentService_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppointmentLog" ADD CONSTRAINT "AppointmentLog_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_recipientUserId_fkey" FOREIGN KEY ("recipientUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_recipientClinicId_fkey" FOREIGN KEY ("recipientClinicId") REFERENCES "Clinic"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceMetadataLink" ADD CONSTRAINT "ServiceMetadataLink_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "MetadataTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppointmentMetadata" ADD CONSTRAINT "AppointmentMetadata_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppointmentMetadata" ADD CONSTRAINT "AppointmentMetadata_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "MetadataTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
