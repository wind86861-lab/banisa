import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth.middleware';
import * as adminController from './admin.controller';

const router = Router();

// Protect all routes with auth and SUPER_ADMIN role validation
router.use(requireAuth);
router.use(requireRole(['SUPER_ADMIN']));

// Profile routes
router.get('/profile', adminController.getProfile);
router.put('/profile', adminController.updateProfile);
router.put('/password', adminController.updatePassword);

// Notification routes
router.get('/notifications', adminController.getNotifications);
router.patch('/notifications/read-all', adminController.markAllNotificationsAsRead);
router.patch('/notifications/:id/read', adminController.markNotificationAsRead);

// Dashboard stats
router.get('/dashboard/stats', adminController.getDashboardStats);

export default router;
