import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth.middleware';
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
    testOrderHandler,
    testOrdersListHandler,
} from './payme-clinic.controller';

const router = Router();

router.use(requireAuth, requireRole(['CLINIC_ADMIN']));

router.get('/config', getConfig);
router.put('/config', putConfig);
router.patch('/config/mode', patchMode);
router.patch('/config/active', patchActive);
router.delete('/config', deleteConfig);

router.get('/stats', getStatsHandler);
router.get('/recent', getRecentHandler);
router.get('/versions', getVersionsHandler);
router.post('/test', selfTestHandler);
router.post('/test-order', testOrderHandler);
router.get('/test-orders', testOrdersListHandler);

export default router;
