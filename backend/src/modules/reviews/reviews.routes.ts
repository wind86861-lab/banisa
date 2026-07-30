import { Router } from 'express';
import { reviewsController } from './reviews.controller';
import { requireAuth, requireRole } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import { createReviewSchema, moderateReviewSchema, getReviewsQuerySchema } from './reviews.validation';

const router = Router();

// ─── PUBLIC ROUTES ──────────────────────────────────────────────────────────
// Get reviews for a specific service (with stats)
router.get('/services/:serviceId', reviewsController.getReviewsByService);

// ─── AUTHENTICATED USER ROUTES ──────────────────────────────────────────────
// Create a review — patient only, and now actually wired through the
// Zod schema (createReviewSchema was imported but never installed,
// which left rating min/max and the 1000-char comment cap unenforced).
// Clinic admins are excluded so a clinic can't pad its own rating from
// their own admin account.
router.post(
    '/',
    requireAuth,
    requireRole(['PATIENT']),
    validate(createReviewSchema),
    reviewsController.createReview,
);

// Get user's own review for a service
router.get('/my-review/:serviceId', requireAuth, reviewsController.getUserReviewForService);

// Can the current patient review this service? (used-service + not-yet-reviewed)
router.get('/eligibility', requireAuth, requireRole(['PATIENT']), reviewsController.eligibility);

// ─── ADMIN ROUTES ───────────────────────────────────────────────────────────
// Get all reviews (with filters)
router.get('/', requireAuth, requireRole(['SUPER_ADMIN']), reviewsController.getAllReviews);

// Approve a review
router.patch('/:reviewId/approve', requireAuth, requireRole(['SUPER_ADMIN']), reviewsController.approveReview);

// Reject a review
router.patch('/:reviewId/reject', requireAuth, requireRole(['SUPER_ADMIN']), reviewsController.rejectReview);

// Delete a review
router.delete('/:reviewId', requireAuth, requireRole(['SUPER_ADMIN']), reviewsController.deleteReview);

export default router;
