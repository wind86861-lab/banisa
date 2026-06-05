import { Request, Response } from 'express';
import { createLinkToken, getLinkStatus, unlink } from './telegram.service';
import { isTelegramConfigured } from './telegram.bot';
import { miniAppLogin } from './miniapp.auth';

interface AuthedRequest extends Request {
    user?: { userId: string };
}

export const getStatus = async (req: AuthedRequest, res: Response) => {
    const userId = req.user!.userId;
    const status = await getLinkStatus(userId);
    return res.json({
        success: true,
        data: { ...status, configured: isTelegramConfigured() },
    });
};

export const generateLink = async (req: AuthedRequest, res: Response) => {
    if (!isTelegramConfigured()) {
        return res.status(503).json({ success: false, message: 'Telegram bot not configured' });
    }
    const userId = req.user!.userId;
    const ip = req.ip;
    const info = await createLinkToken(userId, ip);
    if (!info) {
        return res.status(503).json({ success: false, message: 'Unable to create link (bot username unknown)' });
    }
    return res.json({
        success: true,
        data: {
            deepLink: info.deepLink,
            expiresAt: info.expiresAt,
        },
    });
};

export const removeLink = async (req: AuthedRequest, res: Response) => {
    const userId = req.user!.userId;
    const removed = await unlink(userId);
    return res.json({ success: true, data: { removed } });
};

/**
 * Mini App auto-login. Body: { initData: <window.Telegram.WebApp.initData> }.
 * Public — no requireAuth — because the initData itself is the credential.
 * On success: sets refresh cookie + returns access token (mirrors /user/auth/login).
 */
export const miniAppLoginHandler = async (req: Request, res: Response) => {
    const initData = req.body?.initData;
    if (!initData || typeof initData !== 'string') {
        return res.status(400).json({ success: false, code: 'missing_init_data' });
    }
    const result = await miniAppLogin(initData);
    if (!result.success) {
        const status = result.code === 'not_bound' ? 404
            : result.code === 'expired' ? 401
            : result.code === 'config_error' ? 503
            : 401;
        return res.status(status).json({ success: false, code: result.code });
    }

    res.cookie('user_refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: '/api/user/auth',
    });

    return res.json({
        success: true,
        data: {
            user: result.user,
            accessToken: result.accessToken,
        },
    });
};
