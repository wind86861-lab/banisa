import { z } from 'zod';

const ClinicType = z.enum(['GENERAL', 'SPECIALIZED', 'DIAGNOSTIC', 'DENTAL', 'MATERNITY', 'REHABILITATION', 'PHARMACY', 'OTHER']);
const ClinicStatus = z.enum(['PENDING', 'APPROVED', 'REJECTED', 'BLOCKED']);

const workingHourArrayItem = z.object({
    day: z.string(),
    isOpen: z.boolean(),
    openTime: z.string().optional(),
    closeTime: z.string().optional(),
});

const workingHourDayObj = z.object({
    isOpen: z.boolean(),
    openTime: z.string().optional(),
    closeTime: z.string().optional(),
});

const workingHoursSchema = z.union([
    z.array(workingHourArrayItem),
    z.record(z.string(), workingHourDayObj),
]);

const socialMediaSchema = z.object({
    telegram: z.string().optional().nullable(),
    instagram: z.string().optional().nullable(),
    facebook: z.string().optional().nullable(),
    youtube: z.string().optional().nullable(),
}).optional().nullable();

export const clinicCreateSchema = z.object({
    body: z.object({
        nameUz: z.string().min(2).max(255),
        nameRu: z.string().max(255).optional().nullable(),
        nameEn: z.string().max(255).optional().nullable(),
        type: ClinicType.optional(),
        description: z.string().max(5000).optional().nullable(),
        logo: z.string().optional().nullable(),
        coverImage: z.string().optional().nullable(),

        // Location
        region: z.string().min(1),
        district: z.string().min(1),
        street: z.string().min(1),
        apartment: z.string().optional().nullable(),
        landmark: z.string().optional().nullable(),
        latitude: z.number().optional().nullable(),
        longitude: z.number().optional().nullable(),

        // Contact
        phones: z.array(z.string()).optional().default([]),
        emails: z.array(z.string()).optional().default([]),
        website: z.string().optional().nullable(),
        socialMedia: socialMediaSchema,

        // Schedule
        workingHours: workingHoursSchema.optional().nullable(),
        hasEmergency: z.boolean().optional(),
        hasAmbulance: z.boolean().optional(),
        hasOnlineBooking: z.boolean().optional(),

        // Infrastructure
        bedsCount: z.number().int().min(0).optional().nullable(),
        floorsCount: z.number().int().min(0).optional().nullable(),
        parkingAvailable: z.boolean().optional(),
        amenities: z.array(z.string()).optional().nullable(),

        // Payment
        paymentMethods: z.array(z.string()).optional().nullable(),
        insuranceAccepted: z.array(z.string()).optional().nullable(),
        priceRange: z.string().optional().nullable(),

        // Documents
        registrationNumber: z.string().optional().nullable(),
        taxId: z.string().optional().nullable(),
        licenseNumber: z.string().optional().nullable(),
        licenseIssuedAt: z.string().optional().nullable(),
        licenseExpiresAt: z.string().optional().nullable(),
        licenseIssuedBy: z.string().optional().nullable(),
        legalForm: z.string().optional().nullable(),
        legalName: z.string().optional().nullable(),

        // Admin
        adminFirstName: z.string().optional().nullable(),
        adminLastName: z.string().optional().nullable(),
        adminEmail: z.string().email().optional().nullable(),
        adminPhone: z.string().optional().nullable(),
        adminPosition: z.string().optional().nullable(),

        notes: z.string().optional().nullable(),
    }),
});

export const clinicUpdateSchema = z.object({
    body: z.object({
        nameUz: z.string().min(2).max(255).optional(),
        nameRu: z.string().max(255).optional().nullable(),
        nameEn: z.string().max(255).optional().nullable(),
        type: ClinicType.optional(),
        description: z.string().max(5000).optional().nullable(),
        logo: z.string().optional().nullable(),
        coverImage: z.string().optional().nullable(),
        region: z.string().optional(),
        district: z.string().optional(),
        street: z.string().optional(),
        apartment: z.string().optional().nullable(),
        landmark: z.string().optional().nullable(),
        latitude: z.number().optional().nullable(),
        longitude: z.number().optional().nullable(),
        phones: z.array(z.string()).optional(),
        emails: z.array(z.string()).optional(),
        website: z.string().optional().nullable(),
        socialMedia: socialMediaSchema,
        workingHours: workingHoursSchema.optional().nullable(),
        hasEmergency: z.boolean().optional(),
        hasAmbulance: z.boolean().optional(),
        hasOnlineBooking: z.boolean().optional(),
        bedsCount: z.number().optional().nullable(),
        floorsCount: z.number().optional().nullable(),
        parkingAvailable: z.boolean().optional(),
        amenities: z.array(z.string()).optional().nullable(),
        paymentMethods: z.array(z.string()).optional().nullable(),
        insuranceAccepted: z.array(z.string()).optional().nullable(),
        priceRange: z.string().optional().nullable(),
        registrationNumber: z.string().optional().nullable(),
        taxId: z.string().optional().nullable(),
        licenseNumber: z.string().optional().nullable(),
        licenseIssuedAt: z.string().optional().nullable(),
        licenseExpiresAt: z.string().optional().nullable(),
        licenseIssuedBy: z.string().optional().nullable(),
        legalForm: z.string().optional().nullable(),
        legalName: z.string().optional().nullable(),
        adminFirstName: z.string().optional().nullable(),
        adminLastName: z.string().optional().nullable(),
        adminEmail: z.string().email().optional().nullable(),
        adminPhone: z.string().optional().nullable(),
        adminPosition: z.string().optional().nullable(),
        notes: z.string().optional().nullable(),
    }),
});

export const bulkActionSchema = z.object({
    body: z.object({
        ids: z.array(z.string().uuid()).min(1),
    }),
});

export const reviewModerationSchema = z.object({
    body: z.object({
        reason: z.string().optional(),
    }),
});
