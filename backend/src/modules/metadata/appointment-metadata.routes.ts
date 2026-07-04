import { Router } from 'express';
import { ClinicPermission } from '@prisma/client';
import { AppointmentMetadataController } from './appointment-metadata.controller';
import { requireAuth, requireRole } from '../../middleware/auth.middleware';
import { requireClinicPermission } from '../../middleware/clinic-permission.middleware';

const router = Router();
const controller = new AppointmentMetadataController();

router.use(requireAuth, requireRole(['CLINIC_ADMIN', 'SUPER_ADMIN']));

// Reading required metadata is a view; writing appointment metadata is an
// operational booking action → BOOKING_ACCEPT (SUPER_ADMIN bypasses the
// clinic-permission check, so the operator flow keeps working).
router.get('/:id/required-metadata', controller.getRequiredMetadata.bind(controller));
router.post('/:id/metadata', requireClinicPermission(ClinicPermission.BOOKING_ACCEPT), controller.setMetadata.bind(controller));

export default router;
