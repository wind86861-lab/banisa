import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth.middleware';
import {
    createSkoryRequest,
    getActiveSkory,
    getLastSkory,
    cancelSkoryRequest,
    getSkoryPriceRange,
    getSkoryNearbyClinics,
    getSkoryBands,
} from './skory.controller';

const router = Router();

// Public helpers — used by the wizard's price/clinic previews before submit.
router.get('/price-range', getSkoryPriceRange);
router.get('/nearby-clinics', getSkoryNearbyClinics);
router.get('/bands', getSkoryBands);

// Authenticated patient endpoints
router.post('/request', requireAuth, requireRole(['PATIENT']), createSkoryRequest);
router.get('/active', requireAuth, requireRole(['PATIENT']), getActiveSkory);
router.get('/last', requireAuth, requireRole(['PATIENT']), getLastSkory);
router.post('/:id/cancel', requireAuth, requireRole(['PATIENT']), cancelSkoryRequest);

export default router;
