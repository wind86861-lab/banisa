import { Router } from 'express';
import { ClinicPermission } from '@prisma/client';
import { requireAuth, requireRole } from '../../../middleware/auth.middleware';
import { loadClinicContext, requireClinicPermission } from '../../../middleware/clinic-permission.middleware';
import { getDates, putDates } from './unavailable-dates.controller';

// Mounted at /api/clinic/service-unavailable-dates
const router = Router();
router.use(requireAuth, requireRole(['CLINIC_ADMIN']), loadClinicContext);

const EDIT = requireClinicPermission(ClinicPermission.CLINIC_SETTINGS_EDIT);

router.get('/', EDIT, getDates);
router.put('/', EDIT, putDates);

export default router;
