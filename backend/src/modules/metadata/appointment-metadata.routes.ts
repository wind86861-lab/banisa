import { Router } from 'express';
import { AppointmentMetadataController } from './appointment-metadata.controller';
import { requireAuth, requireRole } from '../../middleware/auth.middleware';

const router = Router();
const controller = new AppointmentMetadataController();

router.use(requireAuth, requireRole(['CLINIC_ADMIN', 'SUPER_ADMIN']));

router.get('/:id/required-metadata', controller.getRequiredMetadata.bind(controller));
router.post('/:id/metadata', controller.setMetadata.bind(controller));

export default router;
