import { Router } from 'express';
import { ClinicPermission } from '@prisma/client';
import { requireAuth, requireRole } from '../../middleware/auth.middleware';
import { loadClinicContext, requireClinicPermission } from '../../middleware/clinic-permission.middleware';
import {
    getSummary,
    getRevenueSeries,
    getByMethod,
    getByService,
    getTransactions,
    exportCsv,
} from './reports.controller';

const router = Router();
router.use(requireAuth, requireRole(['CLINIC_ADMIN']), loadClinicContext);

// Viewing reports needs REPORTS_DAILY; CSV export additionally needs REPORTS_EXPORT.
const VIEW = requireClinicPermission(ClinicPermission.REPORTS_DAILY);

router.get('/summary', VIEW, getSummary);
router.get('/revenue', VIEW, getRevenueSeries);
router.get('/by-method', VIEW, getByMethod);
router.get('/by-service', VIEW, getByService);
router.get('/transactions', VIEW, getTransactions);
router.get('/export', requireClinicPermission(ClinicPermission.REPORTS_EXPORT), exportCsv);

export default router;
