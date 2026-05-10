import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import { patientAppointmentController } from './patient.controller';
import { operatorAppointmentController } from './operator.controller';
import { clinicAppointmentController } from './clinic.controller';
import {
    createBookingSchema,
    cancelBookingSchema,
    operatorConfirmSchema,
    operatorCancelSchema,
    clinicAcceptSchema,
    clinicRescheduleSchema,
    clinicCompleteSchema,
    setClinicDiscountSchema,
    patientCheckInSchema,
    scanCheckInSchema,
    confirmCashSchema,
} from './appointment.validation';

// ─── Patient routes — mounted under /api/user/appointments ───────────────────
export const patientAppointmentRouter = Router();
patientAppointmentRouter.use(requireAuth);
// Read-only ownership-checked routes: any authenticated role can read their own appointment
const ANY_OWNER = requireRole(['PATIENT', 'CLINIC_ADMIN', 'SUPER_ADMIN']);
patientAppointmentRouter.get('/:id', ANY_OWNER, patientAppointmentController.getById);
patientAppointmentRouter.get('/:id/qr.png', ANY_OWNER, patientAppointmentController.getQrImage);
// Patient-only mutating actions
const PATIENT_ONLY = requireRole(['PATIENT']);
patientAppointmentRouter.post('/', PATIENT_ONLY, validate(createBookingSchema), patientAppointmentController.create);
patientAppointmentRouter.post('/:id/cancel', PATIENT_ONLY, validate(cancelBookingSchema), patientAppointmentController.cancel);
patientAppointmentRouter.post('/:id/patient-checkin', PATIENT_ONLY, validate(patientCheckInSchema), patientAppointmentController.patientCheckIn);
patientAppointmentRouter.post('/scan-checkin', PATIENT_ONLY, validate(scanCheckInSchema), patientAppointmentController.scanCheckIn);

// ─── Operator/Super Admin routes — mounted under /api/admin/appointments ─────
export const operatorAppointmentRouter = Router();
operatorAppointmentRouter.use(requireAuth, requireRole(['SUPER_ADMIN']));
operatorAppointmentRouter.get('/stats', operatorAppointmentController.stats);
operatorAppointmentRouter.get('/', operatorAppointmentController.list);
operatorAppointmentRouter.get('/:id', operatorAppointmentController.getById);
operatorAppointmentRouter.post('/:id/confirm', validate(operatorConfirmSchema), operatorAppointmentController.confirm);
operatorAppointmentRouter.post('/:id/cancel', validate(operatorCancelSchema), operatorAppointmentController.cancel);
operatorAppointmentRouter.put('/clinic/:clinicId/discount', validate(setClinicDiscountSchema), operatorAppointmentController.setClinicDiscount);

// ─── Clinic admin routes — mounted under /api/clinic/appointments ────────────
export const clinicAppointmentRouter = Router();
clinicAppointmentRouter.use(requireAuth, requireRole(['CLINIC_ADMIN']));
clinicAppointmentRouter.get('/', clinicAppointmentController.list);
clinicAppointmentRouter.get('/checkin-qr', clinicAppointmentController.getCheckInQr);
clinicAppointmentRouter.get('/:id', clinicAppointmentController.getById);
clinicAppointmentRouter.post('/:id/accept', validate(clinicAcceptSchema), clinicAppointmentController.accept);
clinicAppointmentRouter.post('/:id/reschedule', validate(clinicRescheduleSchema), clinicAppointmentController.reschedule);
clinicAppointmentRouter.post('/:id/start', clinicAppointmentController.start);
clinicAppointmentRouter.post('/:id/complete', validate(clinicCompleteSchema), clinicAppointmentController.complete);
clinicAppointmentRouter.post('/:id/no-show', clinicAppointmentController.noShow);
clinicAppointmentRouter.post('/:id/confirm-cash', validate(confirmCashSchema), clinicAppointmentController.confirmCash);
