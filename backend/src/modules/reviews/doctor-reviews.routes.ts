import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth.middleware';
import { getEligibility, createReview, removeReview } from './doctor-reviews.controller';

const router = Router();
router.use(requireAuth, requireRole(['PATIENT']));

router.get('/eligibility', getEligibility);
router.post('/', createReview);
router.delete('/:id', removeReview);

export default router;
