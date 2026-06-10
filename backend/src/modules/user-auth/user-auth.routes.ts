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
// Password reset via Telegram bot deep link. Reuses loginLimiter so
// brute-forcing the phone field gets the same throttle as login.
router.post('/forgot-password', loginLimiter, userAuthController.forgotPassword);
router.get('/reset-password/check', userAuthController.checkResetToken);
router.post('/reset-password', userAuthController.resetPassword);

// ─── PROTECTED ROUTES ───────────────────────────────────────────────────────
router.get('/profile', requireAuth, userAuthController.getProfile);
router.post('/logout', requireAuth, userAuthController.logout);

export default router;
