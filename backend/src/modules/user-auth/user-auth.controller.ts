import { Request, Response, NextFunction } from 'express';
import { registerUser, loginUser, getUserProfile, refreshAccessToken } from './user-auth.service';
import { sendSuccess } from '../../utils/response';
import { AuthRequest } from '../../middleware/auth.middleware';

// ─── USER REGISTRATION ──────────────────────────────────────────────────────
export const register = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = await registerUser(req.body);
        sendSuccess(res, user, undefined, 'Ro\'yxatdan o\'tish muvaffaqiyatli yakunlandi', 201);
    } catch (error) {
        next(error);
    }
};

// ─── USER LOGIN ─────────────────────────────────────────────────────────────
export const login = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await loginUser(req.body);

        // Set refresh token as HttpOnly cookie — path restricted to user-auth only
        res.cookie('user_refreshToken', result.refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
            path: '/api/user/auth',
        });

        sendSuccess(res, {
            user: result.user,
            accessToken: result.accessToken,
        }, undefined, 'Tizimga kirish muvaffaqiyatli');
    } catch (error) {
        next(error);
    }
};

// ─── GET USER PROFILE ───────────────────────────────────────────────────────
export const getProfile = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const user = await getUserProfile(req.user!.id);
        sendSuccess(res, user);
    } catch (error) {
        next(error);
    }
};

// ─── REFRESH TOKEN ──────────────────────────────────────────────────────────
export const refresh = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const refreshToken = req.cookies.user_refreshToken;

        if (!refreshToken) {
            return res.status(401).json({
                success: false,
                error: {
                    code: 'UNAUTHORIZED',
                    message: 'Refresh token topilmadi',
                },
            });
        }

        const result = await refreshAccessToken(refreshToken);

        // Rotate refresh token cookie
        res.cookie('user_refreshToken', result.refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
            path: '/api/user/auth',
        });

        sendSuccess(res, {
            accessToken: result.accessToken,
            user: result.user,
        });
    } catch (error) {
        // Clear invalid cookie
        res.clearCookie('user_refreshToken', { path: '/api/user/auth' });
        next(error);
    }
};

// ─── LOGOUT ─────────────────────────────────────────────────────────────────
export const logout = async (req: Request, res: Response, next: NextFunction) => {
    try {
        res.clearCookie('user_refreshToken', { path: '/api/user/auth' });
        sendSuccess(res, null, undefined, 'Tizimdan chiqish muvaffaqiyatli');
    } catch (error) {
        next(error);
    }
};
