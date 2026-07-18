import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth.middleware';
import { listBands, createBand, updateBand, deleteBand } from './ambulance-bands.controller';

const router = Router();
router.use(requireAuth, requireRole(['SUPER_ADMIN']));

router.get('/', listBands);
router.post('/', createBand);
router.patch('/:id', updateBand);
router.delete('/:id', deleteBand);

export default router;
