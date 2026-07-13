import { Router } from 'express';
import { ClinicPermission } from '@prisma/client';
import { requireAuth, requireRole } from '../../middleware/auth.middleware';
import { loadClinicContext, requireClinicPermission } from '../../middleware/clinic-permission.middleware';
import {
    getAlifConfig,
    putAlifConfig,
    patchAlifActive,
    patchAlifMode,
} from './alif-clinic.controller';

const router = Router();
router.use(requireAuth, requireRole(['CLINIC_ADMIN']), loadClinicContext);

const VIEW = requireClinicPermission(ClinicPermission.PAYMENT_VIEW);
const EDIT = requireClinicPermission(ClinicPermission.CLINIC_SETTINGS_EDIT);

router.get('/config', VIEW, getAlifConfig);
router.put('/config', EDIT, putAlifConfig);
router.patch('/config/active', EDIT, patchAlifActive);
router.patch('/config/mode', EDIT, patchAlifMode);

export default router;
