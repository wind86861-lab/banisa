import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth.middleware';
import {
    listSpecialties,
    createSpecialty,
    updateSpecialty,
    deleteSpecialty,
} from './specialty.controller';

const router = Router();
router.use(requireAuth, requireRole(['SUPER_ADMIN']));

router.get('/', listSpecialties);
router.post('/', createSpecialty);
router.patch('/:id', updateSpecialty);
router.delete('/:id', deleteSpecialty);

export default router;
