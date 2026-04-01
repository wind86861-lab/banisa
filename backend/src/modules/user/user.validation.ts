import { z } from 'zod';

/**
 * User Validation Schemas
 * Zod schemas for validating user-related requests
 */

export const createAppointmentSchema = z.object({
    body: z.object({
        clinicId: z.string().uuid('Noto\'g\'ri klinika ID'),
        serviceType: z.enum(['DIAGNOSTIC', 'SURGICAL', 'OTHER'] as const),
        diagnosticServiceId: z.string().uuid().optional(),
        surgicalServiceId: z.string().uuid().optional(),
        scheduledAt: z.string().min(1, 'Sana va vaqt kiritilishi shart'),
        notes: z.string().max(500, 'Izoh 500 belgidan oshmasligi kerak').optional(),
        price: z.number().int().positive('Narx musbat son bo\'lishi kerak'),
    }),
});

export const updateProfileSchema = z.object({
    body: z.object({
        firstName: z.string().min(2).max(100).optional(),
        lastName: z.string().min(2).max(100).optional(),
        email: z.string().email().optional(),
    }),
});

export const createReviewSchema = z.object({
    body: z.object({
        clinicId: z.string().uuid('Noto\'g\'ri klinika ID'),
        rating: z.number().min(1, 'Reyting 1 dan kam bo\'lmasligi kerak').max(5, 'Reyting 5 dan oshmasligi kerak'),
        comment: z.string().max(500, 'Sharh 500 belgidan oshmasligi kerak').optional(),
    }),
});
