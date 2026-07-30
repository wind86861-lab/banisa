import { z } from 'zod';

// ─── CREATE REVIEW ──────────────────────────────────────────────────────────
export const createReviewSchema = z.object({
    body: z.object({
        serviceId: z.string().uuid(),
        serviceType: z.enum(['diagnostic', 'surgical', 'sanatorium']),
        rating: z.number().int().min(1).max(5),
        // Comment is optional — a rating alone is a valid review, and short
        // genuine praise ("Zo'r", "Rahmat") must be accepted. The old min(10)
        // rejected those with an opaque "Validation failed"; only cap the max.
        comment: z.string().trim().min(1).max(1000).optional(),
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
