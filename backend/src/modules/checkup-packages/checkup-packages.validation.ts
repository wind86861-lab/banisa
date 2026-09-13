import { z } from 'zod';
import { CheckupCategory } from '@prisma/client';

/**
 * Upper bound on services in one checkup package.
 *
 * This is a payload/transaction guard, not a business rule: express.json caps
 * request bodies at 100kb and every item is created in a single transaction.
 * At ~200 bytes of JSON per item, 200 items is ~40kb — comfortably inside the
 * body limit. Raised from 50, which real packages routinely exceed; hitting
 * the old cap failed the whole save with no visible reason.
 */
export const MAX_PACKAGE_ITEMS = 200;

// Every rule an admin can realistically trip carries an Uzbek message: the
// validate() middleware reports schema failures as a flat "Validation failed"
// and puts the real reason in `details`, so the message here is what the
// panel actually shows the user.
const basePackageBody = z.object({
    nameUz: z.string()
        .min(3, 'Paket nomi kamida 3 ta belgidan iborat bo\'lishi kerak')
        .max(255, 'Paket nomi 255 belgidan oshmasligi kerak'),
    nameRu: z.string().max(255, 'Ruscha nomi 255 belgidan oshmasligi kerak').optional(),
    nameEn: z.string().max(255, 'Inglizcha nomi 255 belgidan oshmasligi kerak').optional(),
    slug: z.string().regex(/^[a-z0-9-]+$/, 'Slug faqat kichik lotin harflari, raqam va chiziqchadan iborat bo\'lishi kerak').optional(),
    category: z.nativeEnum(CheckupCategory),
    shortDescription: z.string().max(200, 'Qisqa tavsif 200 belgidan oshmasligi kerak').optional(),
    fullDescription: z.string().optional(),
    targetAudience: z.string().max(100, 'Maqsadli auditoriya 100 belgidan oshmasligi kerak').optional(),
    items: z.array(z.object({
        diagnosticServiceId: z.string().min(1),
        serviceName: z.string().optional(),
        servicePrice: z.number().int().min(0).optional(),
        quantity: z.number().int().min(1).default(1),
        isRequired: z.boolean().default(true),
        notes: z.string().max(255).optional()
    }))
        .min(1, 'Kamida 1 ta tekshiruv tanlanishi kerak')
        .max(MAX_PACKAGE_ITEMS, `Bitta paketga eng ko'pi ${MAX_PACKAGE_ITEMS} ta tekshiruv qo'shish mumkin`),
    recommendedPrice: z.number().int().min(0).optional(),
    priceMin: z.number().int().min(0).optional(),
    priceMax: z.number().int().min(0).optional(),
    imageUrl: z.string().max(500).optional().nullable()
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
        // Clinic sets per-item prices keyed by CheckupPackageItem.id.
        // clinicPrice is auto-derived from sum(itemPrices). Accepted but recomputed server-side.
        itemPrices: z.record(z.string(), z.number().int().min(0)).optional(),
        clinicPrice: z.number().int().min(0).optional(),
        customNotes: z.string().optional(),
        customizationData: z.any().optional()
    })
});

export const updateClinicPackageSchema = z.object({
    body: z.object({
        itemPrices: z.record(z.string(), z.number().int().min(0)).optional(),
        clinicPrice: z.number().int().min(0).optional(),
        customNotes: z.string().optional(),
        customizationData: z.any().optional()
    })
});
