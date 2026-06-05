import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth.middleware';
import { getStatus, generateLink, removeLink, miniAppLoginHandler } from './telegram.controller';

const router = Router();

// Public — initData itself is the credential.
export const telegramPublicRouter = Router();
telegramPublicRouter.post('/miniapp-login', miniAppLoginHandler);

router.use(requireAuth);
const ANY_OWNER = requireRole(['PATIENT', 'CLINIC_ADMIN', 'SUPER_ADMIN']);

router.get('/status', ANY_OWNER, getStatus);
router.post('/link-token', ANY_OWNER, generateLink);
router.delete('/link', ANY_OWNER, removeLink);

export default router;
