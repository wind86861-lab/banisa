import { Router } from 'express';
import { ClinicPermission } from '@prisma/client';
import { requireAuth, requireRole } from '../../middleware/auth.middleware';
import { loadClinicContext, requireClinicPermission } from '../../middleware/clinic-permission.middleware';
import {
    getConfig,
    putConfig,
    patchMode,
    patchActive,
    deleteConfig,
    getStatsHandler,
    getRecentHandler,
    getVersionsHandler,
    selfTestHandler,
    getSplitConfig,
    putSplitConfig,
} from './click-clinic.controller';

const router = Router();

router.use(requireAuth, requireRole(['CLINIC_ADMIN']), loadClinicContext);

// Viewing config/stats needs PAYMENT_VIEW. Editing the payment-gateway config
// is sensitive clinic configuration → CLINIC_SETTINGS_EDIT.
const VIEW = requireClinicPermission(ClinicPermission.PAYMENT_VIEW);
const EDIT = requireClinicPermission(ClinicPermission.CLINIC_SETTINGS_EDIT);

router.get('/config', VIEW, getConfig);
router.put('/config', EDIT, putConfig);
router.patch('/config/mode', EDIT, patchMode);
router.patch('/config/active', EDIT, patchActive);
router.delete('/config', EDIT, deleteConfig);

router.get('/stats', VIEW, getStatsHandler);
router.get('/recent', VIEW, getRecentHandler);
router.get('/versions', VIEW, getVersionsHandler);
router.post('/test', VIEW, selfTestHandler);

// SHOP SPLIT bank rekvizit — clinic can view/edit anytime, but only Banisa
// (super-admin) can flip isActive to actually route payments through split.
router.get('/split-config', VIEW, getSplitConfig);
router.put('/split-config', EDIT, putSplitConfig);

export default router;
