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
    getSkoryPayment,
    initiateSkoryPayment,
    getSkoryHistory,
} from './skory.controller';

const router = Router();

// Public helpers — used by the wizard's price/clinic previews before submit.
router.get('/price-range', getSkoryPriceRange);
router.get('/nearby-clinics', getSkoryNearbyClinics);
router.get('/bands', getSkoryBands);
// Public payment-page data (keyed by the hard-to-guess request UUID; also the
// target the dispatcher's QR points at). Reconciles online payment on read.
router.get('/:id/payment', getSkoryPayment);

// Authenticated patient endpoints
router.post('/request', requireAuth, requireRole(['PATIENT']), createSkoryRequest);
router.get('/active', requireAuth, requireRole(['PATIENT']), getActiveSkory);
router.get('/last', requireAuth, requireRole(['PATIENT']), getLastSkory);
router.get('/history', requireAuth, requireRole(['PATIENT']), getSkoryHistory);
router.post('/:id/cancel', requireAuth, requireRole(['PATIENT']), cancelSkoryRequest);
router.post('/:id/pay', requireAuth, requireRole(['PATIENT']), initiateSkoryPayment);

export default router;
