import { Router } from 'express';
import { ClinicPermission } from '@prisma/client';
import { requireAuth, requireRole } from '../../middleware/auth.middleware';
import { loadClinicContext, requireClinicPermission } from '../../middleware/clinic-permission.middleware';
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
router.use(requireAuth, requireRole(['CLINIC_ADMIN']), loadClinicContext);

// Reads are member-only (incl. read-only DIRECTOR); mutations need DOCTOR_MANAGE.
const MANAGE = requireClinicPermission(ClinicPermission.DOCTOR_MANAGE);

router.get('/', listDoctors);
router.post('/lookup', lookupDoctor); // read-only search
router.post('/', MANAGE, createOrAttach);
router.patch('/:doctorClinicId', MANAGE, updateAttachment);
router.patch('/:doctorClinicId/profile', MANAGE, updateDoctorProfile);
router.put('/:doctorClinicId/schedule', MANAGE, replaceSchedule);
router.delete('/:doctorClinicId', MANAGE, detachDoctor);

export default router;
