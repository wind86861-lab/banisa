import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth.middleware';
import { listSkoryRequests, getSkoryRequest, getSkoryStats } from './skory-requests.controller';

const router = Router();
router.use(requireAuth, requireRole(['CLINIC_ADMIN']));

router.get('/stats', getSkoryStats);
router.get('/', listSkoryRequests);
router.get('/:id', getSkoryRequest);

export default router;
