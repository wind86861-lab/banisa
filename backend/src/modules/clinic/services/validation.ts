import { z } from 'zod';

// ─── Diagnostic Services ─────────────────────────────────────────────────────

export const activateServiceSchema = z.object({
    body: z.object({
        serviceId: z.string().min(1, 'serviceId majburiy'),
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
