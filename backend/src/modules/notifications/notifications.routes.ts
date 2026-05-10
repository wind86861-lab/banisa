import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth.middleware';
import * as notificationsController from './notifications.controller';

const router = Router();

router.use(requireAuth, requireRole(['CLINIC_ADMIN', 'PENDING_CLINIC', 'SUPER_ADMIN']));

router.get('/', notificationsController.list);
router.get('/unread-count', notificationsController.unreadCount);
router.post('/:id/read', notificationsController.markRead);
router.patch('/:id/read', notificationsController.markRead); // legacy alias
router.post('/read-all', notificationsController.markAllRead);
router.post('/mark-all-read', notificationsController.markAllRead); // legacy alias

export default router;
