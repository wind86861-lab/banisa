import { Router } from 'express';
import { requirePartnerKey } from '../../middleware/partner-auth.middleware';
import { getOperations } from './partner.controller';

/**
 * Partner API — read-only catalog feeds for trusted external platforms.
 * Every route is gated by a shared API key (X-API-Key / Bearer). See
 * partner-auth.middleware.
 */
export const partnerRouter = Router();

partnerRouter.use(requirePartnerKey);

// Surgical-operation catalog (categories + operation names), live from the
// master catalog — reflects super-admin additions/edits on the next pull.
partnerRouter.get('/operations', getOperations);

export default partnerRouter;
