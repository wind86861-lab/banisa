import { z } from 'zod';

// UUID format check — Prisma will throw later anyway, but a 400 here is
// friendlier than a 500.
const uuid = z.string().uuid('Identifikator noto\'g\'ri formatda');

const serviceType = z.enum(['DIAGNOSTIC', 'SURGICAL', 'SANATORIUM', 'CHECKUP', 'AMBULANCE']);

export const addToCartSchema = z.object({
    body: z.object({
        clinicId: uuid,
        serviceType,
        serviceId: uuid,
        // Allow up to a sane upper bound — anything past 99 of a single
        // service is almost certainly a typo or a script.
        quantity: z.number().int().min(1).max(99).optional(),
    }),
});

export const updateQuantitySchema = z.object({
    body: z.object({
        quantity: z.number().int().min(1).max(99),
    }),
});

export const checkoutSchema = z.object({
    body: z.object({
        scheduledAt: z.string().datetime({ message: 'Sana ISO formatda bo\'lishi kerak' }),
        notes: z.string().max(1000).optional(),
        // Frontend sends lowercase tokens — service maps to enum
        paymentMethod: z.enum(['naqd', 'payme', 'click']).optional(),
        ofertaVersionId: uuid.optional(),
    }),
});
