-- Add two trip milestones between ARRIVED and COMPLETED (additive enum values).
ALTER TYPE "AmbulanceRequestStatus" ADD VALUE IF NOT EXISTS 'PICKED_UP';
ALTER TYPE "AmbulanceRequestStatus" ADD VALUE IF NOT EXISTS 'DELIVERED';
