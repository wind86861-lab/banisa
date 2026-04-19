import { Router } from 'express';
import * as userAuthController from './user-auth.controller';
import { validate } from '../../middleware/validate.middleware';
import { requireAuth } from '../../middleware/auth.middleware';
import { userRegisterSchema, userLoginSchema } from './user-auth.validation';
import rateLimit from 'express-rate-limit';

const router = Router();

// Rate limiters
const registerLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 requests per window
    message: 'Juda ko\'p so\'rov yuborildi. Iltimos, keyinroq urinib ko\'ring.',
});

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // 10 requests per window
    message: 'Juda ko\'p login urinishlari. Iltimos, keyinroq urinib ko\'ring.',
});

// ─── PUBLIC ROUTES ──────────────────────────────────────────────────────────
router.post('/register', registerLimiter, validate(userRegisterSchema), userAuthController.register);
router.post('/login', loginLimiter, validate(userLoginSchema), userAuthController.login);
router.post('/refresh', userAuthController.refresh); // Refresh token endpoint

// ─── PROTECTED ROUTES ───────────────────────────────────────────────────────
router.get('/profile', requireAuth, userAuthController.getProfile);
router.post('/logout', requireAuth, userAuthController.logout);

export default router;
