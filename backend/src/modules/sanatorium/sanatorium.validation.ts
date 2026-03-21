import { z } from 'zod';

const SanatoriumServiceType = z.enum(['ACCOMMODATION', 'MEDICAL', 'NUTRITION', 'PROGRAM']);

const sanatoriumServiceBody = z.object({
    nameUz: z.string().min(3).max(255),
    nameRu: z.string().max(255).optional().nullable(),
    nameEn: z.string().max(255).optional().nullable(),
    categoryId: z.string().uuid(),
    shortDescription: z.string().max(200).optional().nullable(),
    fullDescription: z.string().optional().nullable(),
    imageUrl: z.string().url().optional().nullable(),

    serviceType: SanatoriumServiceType,

    priceRecommended: z.number().min(0),
    priceMin: z.number().min(0),
    priceMax: z.number().min(0),
    pricePer: z.string().max(50).default('session'),

    durationMinutes: z.number().min(0).default(0),
    durationDays: z.number().min(0).optional().nullable(),
    sessionsCount: z.number().min(0).optional().nullable(),

    capacity: z.number().min(0).optional().nullable(),

    includes: z.any().optional().nullable(),
    contraindications: z.string().optional().nullable(),
    preparation: z.string().optional().nullable(),

    isActive: z.boolean().optional(),
});

export const sanatoriumServiceSchema = z.object({
    body: sanatoriumServiceBody.refine(
        (data) => data.priceMin <= data.priceRecommended && data.priceRecommended <= data.priceMax,
        {
            message: 'Price validation: min <= recommended <= max',
            path: ['priceRecommended'],
        }
    ),
});

export const updateSanatoriumSchema = z.object({
    body: sanatoriumServiceBody.partial(),
});
