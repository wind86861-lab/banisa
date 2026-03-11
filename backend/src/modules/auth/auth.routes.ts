import { Router } from 'express';
import * as authController from './auth.controller';
import { clinicRegisterController } from './clinic-registration.controller';
import * as adminRegController from './clinic-registration-admin.controller';
import { validate } from '../../middleware/validate.middleware';
import { adminLoginSchema, clinicLoginSchema, registerSchema } from './auth.validation';
import { requireAuth, requireRole } from '../../middleware/auth.middleware';
import { loginLimiter, registerLimiter, refreshLimiter } from '../../middleware/rateLimiter';

const router = Router();

// ─── SHARED ──────────────────────────────────────────────────────────────────
router.post('/register', registerLimiter, validate(registerSchema), authController.register);
router.post('/refresh', refreshLimiter, authController.refresh);
router.post('/logout', authController.logout);
router.get('/me', requireAuth, authController.me);

// ─── SUPER ADMIN login — email + password → /api/auth/admin/login ────────────
router.post('/admin/login', loginLimiter, validate(adminLoginSchema), authController.adminLogin);

// ─── CLINIC ADMIN login — phone + password → /api/auth/login ─────────────────
router.post('/login', loginLimiter, validate(clinicLoginSchema), authController.clinicLogin);

// ─── CLINIC REGISTRATION ──────────────────────────────────────────────────────
router.post('/clinic-register', registerLimiter, clinicRegisterController);

// ─── ADMIN: Clinic Registration Management ────────────────────────────────────
router.get('/clinic-register/admin', requireAuth, requireRole(['SUPER_ADMIN']), adminRegController.getAllRegistrations);
router.get('/clinic-register/admin/:id', requireAuth, requireRole(['SUPER_ADMIN']), adminRegController.getRegistrationById);
router.patch('/clinic-register/admin/:id/review', requireAuth, requireRole(['SUPER_ADMIN']), adminRegController.reviewRegistration);
router.patch('/clinic-register/admin/:id/approve', requireAuth, requireRole(['SUPER_ADMIN']), adminRegController.approveRegistration);
router.patch('/clinic-register/admin/:id/reject', requireAuth, requireRole(['SUPER_ADMIN']), adminRegController.rejectRegistration);

export default router;
