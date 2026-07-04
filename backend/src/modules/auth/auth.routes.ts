import { Router } from 'express';
import * as authController from './auth.controller';
import { clinicRegisterController } from './clinic-registration.controller';
import { validate } from '../../middleware/validate.middleware';
import { adminLoginSchema, clinicLoginSchema, registerSchema } from './auth.validation';
import { requireAuth } from '../../middleware/auth.middleware';
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
// Self-registration writes straight to the Clinic table (pendingPersons); admin
// review/approve happens via /api/admin/clinics/:id/approve (admin-clinics).
router.post('/clinic-register', registerLimiter, clinicRegisterController);

export default router;
