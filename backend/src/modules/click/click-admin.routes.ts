import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth.middleware';
import {
    listClinics,
    getClinic,
    forceDisable,
    getOverview,
    getAudit,
} from './click-admin.controller';
import {
    getGlobalConfig,
    putGlobalConfig,
    listSplitClinics,
    patchClinicSplitActive,
} from './click-split-admin.controller';

const router = Router();
router.use(requireAuth, requireRole(['SUPER_ADMIN']));

router.get('/overview', getOverview);
router.get('/audit', getAudit);
router.get('/clinics', listClinics);
router.get('/clinics/:clinicId', getClinic);
router.post('/clinics/:clinicId/force-disable', forceDisable);

// SHOP SPLIT — single global Banisa config + per-clinic activation gate.
router.get('/split/config', getGlobalConfig);
router.put('/split/config', putGlobalConfig);
router.get('/split/clinics', listSplitClinics);
router.patch('/split/clinics/:clinicId/active', patchClinicSplitActive);

export default router;
