-- Add AMBULANCE to the cart's ServiceType enum so emergency calls can
-- flow through the same cart/checkout pipeline as other services.
-- Patient picks an ambulance in the Telegram bot, the bot adds it to
-- their cart, and checkout creates an Appointment row (with
-- AppointmentServiceType = OTHER) the clinic dispatch can confirm.
ALTER TYPE "ServiceType" ADD VALUE IF NOT EXISTS 'AMBULANCE';
