import { Router } from 'express';
import { ClinicPermission } from '@prisma/client';
import { requireAuth, requireRole } from '../../middleware/auth.middleware';
import { loadClinicContext, requireClinicPermission } from '../../middleware/clinic-permission.middleware';
import {
    listAmbulances,
    createAmbulance,
    updateAmbulance,
    changeStatus,
    deleteAmbulance,
    getStatusHistory,
} from './ambulances.controller';

const router = Router();
router.use(requireAuth, requireRole(['CLINIC_ADMIN']), loadClinicContext);

// Reads are member-only; fleet mutations need AMBULANCE_MANAGE.
const MANAGE = requireClinicPermission(ClinicPermission.AMBULANCE_MANAGE);

router.get('/', listAmbulances);
router.post('/', MANAGE, createAmbulance);
router.patch('/:id', MANAGE, updateAmbulance);
router.patch('/:id/status', MANAGE, changeStatus);
router.delete('/:id', MANAGE, deleteAmbulance);
router.get('/:id/status-history', getStatusHistory);

export default router;
