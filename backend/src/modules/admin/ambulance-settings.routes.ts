import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth.middleware';
import { getAmbulanceSettings, putAmbulanceSettings } from './ambulance-settings.controller';

const router = Router();
router.use(requireAuth, requireRole(['SUPER_ADMIN']));

router.get('/', getAmbulanceSettings);
router.put('/', putAmbulanceSettings);

export default router;
