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
