import { z } from 'zod';

// ─── Benefit schema (JSONB array items) ─────────────────────────────────────
const benefitSchema = z.object({
    uz: z.string().min(3).max(200),
    ru: z.string().min(3).max(200).optional(),
});

// ─── Time slot schema ───────────────────────────────────────────────────────
const timeSlotSchema = z.object({
    start: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Noto\'g\'ri vaqt formati (HH:MM)'),
    end: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Noto\'g\'ri vaqt formati (HH:MM)'),
});

const dayEnum = z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']);

const availableTimeSlotsSchema = z.record(
    dayEnum,
    z.array(timeSlotSchema).min(1),
).optional().nullable();

// ─── Main upsert schema ────────────────────────────────────────────────────
export const upsertCustomizationSchema = z.object({
    body: z.object({
        customNameUz: z.string().min(5).max(200).optional().nullable(),
        customNameRu: z.string().min(5).max(200).optional().nullable(),

        customDescriptionUz: z.string().min(10).max(2000).optional().nullable(),
        customDescriptionRu: z.string().min(10).max(2000).optional().nullable(),

        benefits: z.array(benefitSchema).max(10).optional().nullable(),

        preparationUz: z.string().min(10).max(1000).optional().nullable(),
        preparationRu: z.string().min(10).max(1000).optional().nullable(),

        customCategory: z.enum(['Standard', 'Premium', 'Express', 'VIP']).optional().nullable(),
        tags: z.array(z.string().min(2).max(30)).max(10).optional(),

        estimatedDurationMinutes: z.number().int().min(5).max(480).optional().nullable(),
        availableDays: z.array(dayEnum).min(1).max(7).optional(),
        availableTimeSlots: availableTimeSlotsSchema,

        requiresAppointment: z.boolean().optional(),
        requiresPrepayment: z.boolean().optional(),
        prepaymentPercentage: z.number().int().min(1).max(100).optional().nullable(),

        isHighlighted: z.boolean().optional(),
        displayOrder: z.number().int().min(1).max(1000).optional().nullable(),
    }).refine(
        (data) => !(data.requiresPrepayment && !data.prepaymentPercentage),
        { message: 'prepaymentPercentage majburiy agar requiresPrepayment = true', path: ['prepaymentPercentage'] },
    ),
});

// ─── Image upload alt text ──────────────────────────────────────────────────
export const uploadImageSchema = z.object({
    body: z.object({
        alt: z.string().max(200).optional(),
    }),
});

// ─── Image reorder ──────────────────────────────────────────────────────────
export const reorderImagesSchema = z.object({
    body: z.object({
        imageIds: z.array(z.string().min(1)).min(1),
    }),
});
