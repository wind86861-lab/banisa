import { Router } from 'express';
import { userController } from './user.controller';
import { getHomeSummary } from './user-home-summary.controller';
import { favoritesController, toggleFavoriteSchema } from './favorites.controller';
import { getPreferences, updatePreferences } from '../notifications/preferences.controller';
import { requireAuth, requireRole } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import { updateProfileSchema, createReviewSchema, createAppointmentSchema } from './user.validation';

/**
 * User Routes
 * Routes for user profile and patient-related operations
 */
const router = Router();

// All routes require authentication
router.use(requireAuth);

// Profile routes
router.get('/home-summary', getHomeSummary);
router.get('/profile', userController.getProfile);
router.put('/profile', validate(updateProfileSchema), userController.updateProfile);

// Read-only routes — any authenticated user can view their own data (ownership enforced by controller)
const ANY_OWNER = requireRole(['PATIENT', 'CLINIC_ADMIN', 'SUPER_ADMIN']);
router.get('/appointments', ANY_OWNER, userController.getAppointments);
router.get('/reviews', ANY_OWNER, userController.getReviews);
// Mutating actions are PATIENT-only
router.post('/appointments', requireRole(['PATIENT']), validate(createAppointmentSchema), userController.createAppointment);
router.post('/reviews', requireRole(['PATIENT']), validate(createReviewSchema), userController.createReview);

// Favorites — patient bookmarks of services
router.get('/favorites', requireRole(['PATIENT']), favoritesController.list);
router.get('/favorites/ids', requireRole(['PATIENT']), favoritesController.ids);
router.post('/favorites/toggle', requireRole(['PATIENT']), validate(toggleFavoriteSchema), favoritesController.toggle);
router.delete('/favorites/:id', requireRole(['PATIENT']), favoritesController.remove);

// Notification preferences — channel toggles per event
router.get('/notification-preferences', ANY_OWNER, getPreferences);
router.put('/notification-preferences', ANY_OWNER, updatePreferences);

export default router;
