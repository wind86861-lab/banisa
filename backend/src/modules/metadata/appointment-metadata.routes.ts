import { Router } from 'express';
import { AppointmentMetadataController } from './appointment-metadata.controller';
import { requireAuth } from '../../middleware/auth.middleware';

const router = Router();
const controller = new AppointmentMetadataController();

router.use(requireAuth);

router.get('/:id/required-metadata', controller.getRequiredMetadata.bind(controller));
router.post('/:id/metadata', controller.setMetadata.bind(controller));

export default router;
