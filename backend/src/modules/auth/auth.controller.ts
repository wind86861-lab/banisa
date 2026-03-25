import { Request, Response, NextFunction } from 'express';
import { env } from '../../config/env';
import * as authService from './auth.service';
import { sendSuccess } from '../../utils/response';
import { AuthRequest } from '../../middleware/auth.middleware';

// VULN-03: HttpOnly + Secure + SameSite=Strict prevents JS access and CSRF
const REFRESH_COOKIE_OPTIONS = {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
    path: '/api/auth',              // cookie only sent to auth endpoints
};

export const register = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = await authService.register(req.body);
        sendSuccess(res, user, null, 'Registration successful', 201);
    } catch (error) {
        next(error);
    }
};

// ─── SUPER ADMIN login — phone + password ────────────────────────────────────
export const adminLogin = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { phone, password } = req.body;
        const result = await authService.login({ phone, password, isAdminLogin: true });

        if (result.user.role !== 'SUPER_ADMIN') {
            return res.status(403).json({ success: false, error: 'Bu endpoint faqat Super Admin uchun' });
        }

        res.cookie('refreshToken', result.refreshToken, REFRESH_COOKIE_OPTIONS);
        return sendSuccess(res, { user: result.user, accessToken: result.accessToken }, null, 'Login successful');
    } catch (error) {
        next(error);
    }
};

// ─── CLINIC ADMIN login — phone + password ───────────────────────────────────
export const clinicLogin = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { phone, password } = req.body;
        const result = await authService.login({ phone, password, isAdminLogin: false });

        res.cookie('refreshToken', result.refreshToken, REFRESH_COOKIE_OPTIONS);
        return sendSuccess(res, { user: result.user, accessToken: result.accessToken }, null, 'Login successful');
    } catch (error) {
        next(error);
    }
};

// POST /api/auth/refresh — silently issue new access token using HttpOnly refresh cookie
export const refresh = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const token = req.cookies?.refreshToken as string | undefined;
        if (!token) {
            return res.status(401).json({ success: false, error: 'No refresh token' });
        }

        const { newAccessToken, newRefreshToken, user } = await authService.refreshAccessToken(token);

        // Rotate refresh token
        res.cookie('refreshToken', newRefreshToken, REFRESH_COOKIE_OPTIONS);
        return res.json({
            success: true,
            data: {
                accessToken: newAccessToken,
                user: user,
            }
        });
    } catch (error) {
        res.clearCookie('refreshToken', REFRESH_COOKIE_OPTIONS);
        return res.status(401).json({ success: false, error: 'Invalid or expired refresh token' });
    }
};

export const logout = async (req: Request, res: Response, next: NextFunction) => {
    try {
        res.clearCookie('refreshToken', REFRESH_COOKIE_OPTIONS);
        sendSuccess(res, null, null, 'Logged out successfully');
    } catch (error) {
        next(error);
    }
};

export const me = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const user = await authService.getMe(req.user!.id);
        sendSuccess(res, user);
    } catch (error) {
        next(error);
    }
};
