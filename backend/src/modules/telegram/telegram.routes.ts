import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth.middleware';
import { getStatus, generateLink, removeLink } from './telegram.controller';

const router = Router();

router.use(requireAuth);
const ANY_OWNER = requireRole(['PATIENT', 'CLINIC_ADMIN', 'SUPER_ADMIN']);

router.get('/status', ANY_OWNER, getStatus);
router.post('/link-token', ANY_OWNER, generateLink);
router.delete('/link', ANY_OWNER, removeLink);

export default router;
