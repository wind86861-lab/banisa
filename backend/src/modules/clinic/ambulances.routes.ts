import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth.middleware';
import {
    listAmbulances,
    createAmbulance,
    updateAmbulance,
    changeStatus,
    deleteAmbulance,
    getStatusHistory,
} from './ambulances.controller';

const router = Router();
router.use(requireAuth, requireRole(['CLINIC_ADMIN']));

router.get('/', listAmbulances);
router.post('/', createAmbulance);
router.patch('/:id', updateAmbulance);
router.patch('/:id/status', changeStatus);
router.delete('/:id', deleteAmbulance);
router.get('/:id/status-history', getStatusHistory);

export default router;
