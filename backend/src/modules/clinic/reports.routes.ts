import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth.middleware';
import {
    getSummary,
    getRevenueSeries,
    getByMethod,
    getByService,
    getTransactions,
    exportCsv,
} from './reports.controller';

const router = Router();
router.use(requireAuth, requireRole(['CLINIC_ADMIN']));

router.get('/summary', getSummary);
router.get('/revenue', getRevenueSeries);
router.get('/by-method', getByMethod);
router.get('/by-service', getByService);
router.get('/transactions', getTransactions);
router.get('/export', exportCsv);

export default router;
