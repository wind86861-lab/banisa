import { Router } from 'express';
import { ClinicPermission } from '@prisma/client';
import { requireAuth, requireRole } from '../../middleware/auth.middleware';
import { loadClinicContext, requireClinicPermission } from '../../middleware/clinic-permission.middleware';
import { validate } from '../../middleware/validate.middleware';
import { scanCheckInLimiter } from '../../middleware/rateLimiter';
import { patientAppointmentController } from './patient.controller';
import { createDoctorBooking } from './doctor-booking.controller';
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
    scanCheckInSchema,
    scanCheckInPickSchema,
    confirmCashSchema,
} from './appointment.validation';

// ─── Patient routes — mounted under /api/user/appointments ───────────────────
export const patientAppointmentRouter = Router();
patientAppointmentRouter.use(requireAuth);
// Read-only ownership-checked routes: any authenticated role can read their own appointment
const ANY_OWNER = requireRole(['PATIENT', 'CLINIC_ADMIN', 'SUPER_ADMIN']);
patientAppointmentRouter.get('/:id', ANY_OWNER, patientAppointmentController.getById);
patientAppointmentRouter.get('/:id/payment-status', ANY_OWNER, patientAppointmentController.getPaymentStatus);
// Patient-only mutating actions
const PATIENT_ONLY = requireRole(['PATIENT']);
patientAppointmentRouter.post('/', PATIENT_ONLY, validate(createBookingSchema), patientAppointmentController.create);
// Doctor-specific booking with global slot lock (Sprint 5.5)
patientAppointmentRouter.post('/doctor', PATIENT_ONLY, createDoctorBooking);
patientAppointmentRouter.post('/:id/cancel', PATIENT_ONLY, validate(cancelBookingSchema), patientAppointmentController.cancel);
patientAppointmentRouter.post('/scan-checkin', PATIENT_ONLY, scanCheckInLimiter, validate(scanCheckInSchema), patientAppointmentController.scanCheckIn);
patientAppointmentRouter.post('/scan-checkin/pick', PATIENT_ONLY, scanCheckInLimiter, validate(scanCheckInPickSchema), patientAppointmentController.scanCheckInPick);

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
clinicAppointmentRouter.use(requireAuth, requireRole(['CLINIC_ADMIN']), loadClinicContext);

// Reads need BOOKING_VIEW (incl. DIRECTOR). State changes need BOOKING_ACCEPT;
// reschedule needs BOOKING_RESCHEDULE; cash confirmation needs PAYMENT_CONFIRM_CASH.
const V_VIEW = requireClinicPermission(ClinicPermission.BOOKING_VIEW);
const V_ACCEPT = requireClinicPermission(ClinicPermission.BOOKING_ACCEPT);

clinicAppointmentRouter.get('/', V_VIEW, clinicAppointmentController.list);
clinicAppointmentRouter.get('/cashier-queue', V_VIEW, clinicAppointmentController.cashierQueue);
clinicAppointmentRouter.get('/checkin-qr', V_VIEW, clinicAppointmentController.getCheckInQr);
clinicAppointmentRouter.get('/patient-stats/:id', V_VIEW, clinicAppointmentController.patientStats);
clinicAppointmentRouter.get('/:id', V_VIEW, clinicAppointmentController.getById);
clinicAppointmentRouter.post('/:id/accept', V_ACCEPT, validate(clinicAcceptSchema), clinicAppointmentController.accept);
clinicAppointmentRouter.post('/:id/reschedule', requireClinicPermission(ClinicPermission.BOOKING_RESCHEDULE), validate(clinicRescheduleSchema), clinicAppointmentController.reschedule);
clinicAppointmentRouter.post('/:id/start', V_ACCEPT, clinicAppointmentController.start);
clinicAppointmentRouter.post('/:id/complete', V_ACCEPT, validate(clinicCompleteSchema), clinicAppointmentController.complete);
clinicAppointmentRouter.post('/:id/no-show', V_ACCEPT, clinicAppointmentController.noShow);
clinicAppointmentRouter.post('/:id/confirm-cash', requireClinicPermission(ClinicPermission.PAYMENT_CONFIRM_CASH), validate(confirmCashSchema), clinicAppointmentController.confirmCash);
