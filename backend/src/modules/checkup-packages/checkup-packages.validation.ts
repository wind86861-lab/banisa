import { z } from 'zod';
import { CheckupCategory } from '@prisma/client';

const basePackageBody = z.object({
    nameUz: z.string().min(3).max(255),
    nameRu: z.string().max(255).optional(),
    nameEn: z.string().max(255).optional(),
    slug: z.string().regex(/^[a-z0-9-]+$/).optional(),
    category: z.nativeEnum(CheckupCategory),
    shortDescription: z.string().max(200).optional(),
    fullDescription: z.string().optional(),
    targetAudience: z.string().max(100).optional(),
    items: z.array(z.object({
        diagnosticServiceId: z.string().min(1),
        serviceName: z.string().optional(),
        servicePrice: z.number().int().min(0).optional(),
        quantity: z.number().int().min(1).default(1),
        isRequired: z.boolean().default(true),
        notes: z.string().max(255).optional()
    })).min(1).max(50),
    recommendedPrice: z.number().int().min(0).optional(),
    priceMin: z.number().int().min(0).optional(),
    priceMax: z.number().int().min(0).optional(),
    imageUrl: z.string().url().optional()
});

export const createCheckupPackageSchema = z.object({
    body: basePackageBody.refine(data => {
        // If price min/max/recommended are all provided, check relationships
        if (data.priceMin && data.recommendedPrice && data.priceMax) {
            return data.priceMin <= data.recommendedPrice && data.recommendedPrice <= data.priceMax;
        }
        return true;
    }, {
        message: "Tavsiya narx min va max oralig'ida bo'lishi kerak",
        path: ['recommendedPrice']
    })
});

export const updateCheckupPackageSchema = z.object({
    body: basePackageBody.partial()
});

export const activateClinicPackageSchema = z.object({
    body: z.object({
        packageId: z.string().cuid(),
        clinicPrice: z.number().int().min(0),
        customNotes: z.string().optional()
    })
});

export const updateClinicPackageSchema = z.object({
    body: z.object({
        clinicPrice: z.number().int().min(0).optional(),
        customNotes: z.string().optional()
    })
});
