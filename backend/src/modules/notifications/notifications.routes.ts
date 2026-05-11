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

// Patient-facing notifications router. Same controller — auth scope only.
// Mounted separately so PATIENT users can read THEIR OWN rows without
// loosening the clinic-admin router above.
export const patientNotificationsRouter = (() => {
    const r = Router();
    r.use(requireAuth, requireRole(['PATIENT']));
    r.get('/', notificationsController.list);
    r.get('/unread-count', notificationsController.unreadCount);
    r.post('/:id/read', notificationsController.markRead);
    r.patch('/:id/read', notificationsController.markRead);
    r.post('/read-all', notificationsController.markAllRead);
    r.post('/mark-all-read', notificationsController.markAllRead);
    return r;
})();
