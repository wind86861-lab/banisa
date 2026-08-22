import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth.middleware';
import * as ctrl from './doctor.controller';

// ─── /api/doctor — doctor Mini App ───────────────────────────────────────────
export const doctorRouter = Router();

// Public: register from inside the Mini App (auth is the signed Telegram initData).
doctorRouter.post('/register', ctrl.register);

// Authenticated doctor.
doctorRouter.get('/me', requireAuth, requireRole(['DOCTOR']), ctrl.me);
doctorRouter.patch('/me', requireAuth, requireRole(['DOCTOR']), ctrl.updateMe);

// Recommendation builder (approval enforced in the service).
doctorRouter.get('/patient-lookup', requireAuth, requireRole(['DOCTOR']), ctrl.patientLookup);
doctorRouter.post('/recommendations', requireAuth, requireRole(['DOCTOR']), ctrl.createRecommendation);
doctorRouter.get('/recommendations', requireAuth, requireRole(['DOCTOR']), ctrl.listRecommendations);

// ─── /api/admin/doctors — super-admin approval ───────────────────────────────
export const adminDoctorRouter = Router();
adminDoctorRouter.use(requireAuth, requireRole(['SUPER_ADMIN']));
adminDoctorRouter.get('/', ctrl.adminList);
adminDoctorRouter.get('/:id', ctrl.adminGet);
adminDoctorRouter.post('/:id/approve', ctrl.adminApprove);
adminDoctorRouter.post('/:id/reject', ctrl.adminReject);
