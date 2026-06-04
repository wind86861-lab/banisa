import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth.middleware';
import {
    listDoctors,
    lookupDoctor,
    createOrAttach,
    updateAttachment,
    updateDoctorProfile,
    replaceSchedule,
    detachDoctor,
} from './doctors.controller';

const router = Router();
router.use(requireAuth, requireRole(['CLINIC_ADMIN']));

router.get('/', listDoctors);
router.post('/lookup', lookupDoctor);
router.post('/', createOrAttach);
router.patch('/:doctorClinicId', updateAttachment);
router.patch('/:doctorClinicId/profile', updateDoctorProfile);
router.put('/:doctorClinicId/schedule', replaceSchedule);
router.delete('/:doctorClinicId', detachDoctor);

export default router;
