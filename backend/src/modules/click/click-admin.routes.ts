import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth.middleware';
import {
    listClinics,
    getClinic,
    forceDisable,
    getOverview,
    getAudit,
} from './click-admin.controller';

const router = Router();
router.use(requireAuth, requireRole(['SUPER_ADMIN']));

router.get('/overview', getOverview);
router.get('/audit', getAudit);
router.get('/clinics', listClinics);
router.get('/clinics/:clinicId', getClinic);
router.post('/clinics/:clinicId/force-disable', forceDisable);

export default router;
