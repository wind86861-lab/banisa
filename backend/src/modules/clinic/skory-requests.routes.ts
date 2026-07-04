import { Router } from 'express';
import { ClinicPermission } from '@prisma/client';
import { requireAuth, requireRole } from '../../middleware/auth.middleware';
import { loadClinicContext, requireClinicPermission } from '../../middleware/clinic-permission.middleware';
import { listSkoryRequests, getSkoryRequest, getSkoryStats } from './skory-requests.controller';

const router = Router();
router.use(requireAuth, requireRole(['CLINIC_ADMIN']), loadClinicContext);

// Read-only surface — any member with booking-view (incl. DIRECTOR) may look.
const VIEW = requireClinicPermission(ClinicPermission.BOOKING_VIEW);

router.get('/stats', VIEW, getSkoryStats);
router.get('/', VIEW, listSkoryRequests);
router.get('/:id', VIEW, getSkoryRequest);

export default router;
