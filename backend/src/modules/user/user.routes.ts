import { Router } from 'express';
import { userController } from './user.controller';
import { requireAuth, requireRole } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import { updateProfileSchema, createReviewSchema } from './user.validation';

/**
 * User Routes
 * Routes for user profile and patient-related operations
 */
const router = Router();

// All routes require authentication
router.use(requireAuth);

// Profile routes
router.get('/profile', userController.getProfile);
router.put('/profile', validate(updateProfileSchema), userController.updateProfile);

// Patient-specific routes
router.get('/appointments', requireRole(['PATIENT']), userController.getAppointments);
router.get('/reviews', requireRole(['PATIENT']), userController.getReviews);
router.post('/reviews', requireRole(['PATIENT']), validate(createReviewSchema), userController.createReview);

export default router;
