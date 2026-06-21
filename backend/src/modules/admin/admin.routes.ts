import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth.middleware';
import * as adminController from './admin.controller';
import { getGlobalFiscal, updateGlobalFiscal } from './global-fiscal.controller';

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

// User list (includes TelegramAccount join for source/last-seen).
router.get('/users', adminController.listUsers);

// Global fiscal defaults (super-admin sets MXIK / package_code / vat_percent
// used by every Payme receipt unless the per-service override on a
// clinic-service join row replaces it).
router.get('/settings/fiscal', getGlobalFiscal);
router.put('/settings/fiscal', updateGlobalFiscal);

export default router;
