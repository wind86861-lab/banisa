import { z } from 'zod';

// ─── Diagnostic Services ─────────────────────────────────────────────────────

export const activateServiceSchema = z.object({
    body: z.object({
        serviceId: z.string().min(1, 'serviceId majburiy'),
    }),
});

// ─── Surgical Services ────────────────────────────────────────────────────────

export const activateSurgicalServiceSchema = z.object({
    body: z.object({
        serviceId: z.string().min(1, 'serviceId majburiy'),
    }),
});

// ─── Sanatorium Services ─────────────────────────────────────────────────────

export const activateSanatoriumServiceSchema = z.object({
    body: z.object({
        serviceId: z.string().uuid(),
        
        // Pricing & Discount
        clinicPrice: z.number().min(0).optional(),
        discountPercent: z.number().min(0).max(100).optional(),
        discountValidUntil: z.string().optional(), // ISO date string
        
        // Customization
        customNameUz: z.string().min(3).max(255).optional(),
        customNameRu: z.string().max(255).optional(),
        customDescription: z.string().optional(),
        
        // Room/Accommodation Details
        roomType: z.string().optional(), // Standart, Komfort, Lux, VIP
        roomImages: z.array(z.string().url()).optional(),
        roomAmenities: z.array(z.string()).optional(),
        
        // Meal Plan
        mealPlan: z.string().optional(), // 3-razlama, To'liq pansion, Yarim pansion
        mealDescription: z.string().optional(),
        
        // Location & Contact
        locationAddress: z.string().optional(),
        locationCoords: z.string().optional(), // "lat,lng"
        contactPhone: z.string().optional(),
        contactEmail: z.string().email().optional(),
        
        // Additional Features
        features: z.array(z.string()).optional(),
        includes: z.array(z.string()).optional(),
        excludes: z.array(z.string()).optional(),
        
        // Availability
        availableFrom: z.string().optional(), // ISO date string
        availableTo: z.string().optional(), // ISO date string
        maxGuests: z.number().min(1).optional(),
    }),
});

// ─── Checkup Packages ────────────────────────────────────────────────────────

export const activatePackageSchema = z.object({
    body: z.object({
        packageId: z.string().min(1, 'packageId majburiy'),
        clinicPrice: z.number().int().min(0),
        customNotes: z.string().max(500).optional(),
    }),
});

export const updatePackageSchema = z.object({
    params: z.object({
        id: z.string().min(1),
    }),
    body: z.object({
        clinicPrice: z.number().int().min(0).optional(),
        isActive: z.boolean().optional(),
        customNotes: z.string().max(500).optional(),
    }),
});

// ─── Settings ────────────────────────────────────────────────────────────────

const dayScheduleSchema = z.object({
    start: z.string().nullable(),
    end: z.string().nullable(),
    isDayOff: z.boolean(),
});

export const workingHoursSchema = z.object({
    body: z.object({
        monday: dayScheduleSchema,
        tuesday: dayScheduleSchema,
        wednesday: dayScheduleSchema,
        thursday: dayScheduleSchema,
        friday: dayScheduleSchema,
        saturday: dayScheduleSchema,
        sunday: dayScheduleSchema,
    }),
});

export const queueSettingsSchema = z.object({
    body: z.object({
        patientsPerSlot: z.number().int().min(1).max(5),
        slotDurationMinutes: z.number().int().refine(v => [15, 30, 45, 60].includes(v), 'Qiymat: 15, 30, 45 yoki 60'),
        bufferMinutes: z.number().int().refine(v => [0, 15, 30].includes(v), 'Qiymat: 0, 15 yoki 30'),
    }),
});
