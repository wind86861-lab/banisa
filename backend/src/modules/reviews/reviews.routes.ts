import { Router } from 'express';
import { reviewsController } from './reviews.controller';
import { requireAuth, requireRole } from '../../middleware/auth.middleware';
import { createReviewSchema, moderateReviewSchema, getReviewsQuerySchema } from './reviews.validation';

const router = Router();

// ─── PUBLIC ROUTES ──────────────────────────────────────────────────────────
// Get reviews for a specific service (with stats)
router.get('/services/:serviceId', reviewsController.getReviewsByService);

// ─── AUTHENTICATED USER ROUTES ──────────────────────────────────────────────
// Create a review (requires authentication)
router.post('/', requireAuth, reviewsController.createReview);

// Get user's own review for a service
router.get('/my-review/:serviceId', requireAuth, reviewsController.getUserReviewForService);

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
