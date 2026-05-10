import { z } from 'zod';

export const createBookingSchema = z.object({
    body: z.object({
        clinicId: z.string().uuid('Noto\'g\'ri klinika ID'),
        serviceType: z.enum(['DIAGNOSTIC', 'SURGICAL', 'OTHER']),
        diagnosticServiceId: z.string().uuid().optional(),
        surgicalServiceId: z.string().uuid().optional(),
        scheduledAt: z.string().min(1, 'Sana va vaqt kiritilishi shart'),
        notes: z.string().max(500).optional(),
        price: z.number().int().positive('Narx musbat son bo\'lishi kerak'),
    }),
});

export const cancelBookingSchema = z.object({
    body: z.object({
        reason: z.string().max(500).optional(),
    }),
});

export const operatorConfirmSchema = z.object({
    body: z.object({
        callNote: z.string().max(1000).optional(),
        discountPercent: z.number().int().min(0).max(100).optional(),
    }),
});

export const operatorCancelSchema = z.object({
    body: z.object({
        reason: z.string().min(1, 'Sabab kiritilishi shart').max(1000),
    }),
});

export const clinicAcceptSchema = z.object({
    body: z.object({
        notes: z.string().max(1000).optional(),
    }),
});

export const clinicRescheduleSchema = z.object({
    body: z.object({
        scheduledAt: z.string().min(1, 'Yangi sana kiritilishi shart'),
        reason: z.string().min(1, 'Sabab kiritilishi shart').max(1000),
    }),
});

export const clinicCompleteSchema = z.object({
    body: z.object({
        note: z.string().max(1000).optional(),
    }),
});

export const setClinicDiscountSchema = z.object({
    body: z.object({
        defaultDiscountPercent: z.number().int().min(0).max(100),
    }),
});

export const patientCheckInSchema = z.object({
    body: z.object({
        clinicSecret: z.string().min(5, 'QR kod noto\'g\'ri'),
        lat: z.number().optional(),
        lng: z.number().optional(),
    }),
});

export const scanCheckInSchema = z.object({
    body: z.object({
        secret: z.string().min(5, 'QR kod noto\'g\'ri'),
    }),
});

export const confirmCashSchema = z.object({
    body: z.object({
        amount: z.number().int().nonnegative('Summa musbat son bo\'lishi kerak'),
        note: z.string().max(500).optional(),
    }),
});

