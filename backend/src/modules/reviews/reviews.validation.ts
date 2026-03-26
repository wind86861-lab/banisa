import { z } from 'zod';

// ─── CREATE REVIEW ──────────────────────────────────────────────────────────
export const createReviewSchema = z.object({
    body: z.object({
        serviceId: z.string().uuid(),
        serviceType: z.enum(['diagnostic', 'surgical', 'sanatorium']),
        rating: z.number().int().min(1).max(5),
        comment: z.string().min(10).max(1000).optional(),
    }),
});

// ─── APPROVE/REJECT REVIEW ──────────────────────────────────────────────────
export const moderateReviewSchema = z.object({
    body: z.object({
        rejectionReason: z.string().min(10, 'Rejection reason must be at least 10 characters').optional(),
    }),
});

// ─── GET REVIEWS QUERY ──────────────────────────────────────────────────────
export const getReviewsQuerySchema = z.object({
    query: z.object({
        status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
        page: z.string().regex(/^\d+$/).transform(Number).optional(),
        limit: z.string().regex(/^\d+$/).transform(Number).optional(),
    }),
});
