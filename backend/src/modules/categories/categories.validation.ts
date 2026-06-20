import { z } from 'zod';

const categoryBody = z.object({
    nameUz: z.string().min(1).max(255),
    nameRu: z.string().max(255).optional().nullable(),
    nameEn: z.string().max(255).optional().nullable(),
    slug: z.string().min(1).max(255),
    level: z.number().int().min(0),
    parentId: z.string().uuid().optional().nullable(),
    icon: z.string().max(10).optional().nullable(),
    imageUrl: z.string().max(500).optional().nullable(),
    sortOrder: z.number().int().optional(),
    // Fiscal codes for Payme / Click / Alif receipts. Digit-only; empty
    // string and null both mean "fall back to GlobalFiscalSettings".
    fiscalMxikCode: z.string().regex(/^\d{1,32}$/, 'MXIK kodi faqat raqamlardan').optional().nullable(),
    fiscalPackageCode: z.string().regex(/^\d{1,32}$/, 'package_code faqat raqamlardan').optional().nullable(),
    fiscalVatPercent: z.number().int().min(0).max(100).optional().nullable(),
});

export const createCategorySchema = z.object({
    body: categoryBody,
});

export const updateCategorySchema = z.object({
    params: z.object({
        id: z.string().uuid(),
    }),
    body: categoryBody.partial(),
});

export const deleteCategorySchema = z.object({
    params: z.object({
        id: z.string().uuid(),
    }),
});
