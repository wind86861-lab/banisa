import { Router } from 'express';
import * as userAuthController from './user-auth.controller';
import { validate } from '../../middleware/validate.middleware';
import { requireAuth } from '../../middleware/auth.middleware';
import { userRegisterSchema, userLoginSchema } from './user-auth.validation';
import { loginLimiter, registerLimiter } from '../../middleware/rateLimiter';

const router = Router();

// ─── PUBLIC ROUTES ──────────────────────────────────────────────────────────
router.post('/register', registerLimiter, validate(userRegisterSchema), userAuthController.register);
router.post('/login', loginLimiter, validate(userLoginSchema), userAuthController.login);
router.post('/refresh', userAuthController.refresh); // Refresh token endpoint

// ─── PROTECTED ROUTES ───────────────────────────────────────────────────────
router.get('/profile', requireAuth, userAuthController.getProfile);
router.post('/logout', requireAuth, userAuthController.logout);

export default router;
