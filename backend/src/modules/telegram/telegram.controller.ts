import { Request, Response } from 'express';
import { createLinkToken, getLinkStatus, unlink } from './telegram.service';
import { isTelegramConfigured } from './telegram.bot';
import { miniAppLogin } from './miniapp.auth';
import { widgetLogin, WidgetPayload } from './widget.auth';
import { env } from '../../config/env';

// auth.middleware.ts puts the authenticated user on req.user as
// { id, role }. The earlier signature on this file said `userId` — that
// silently produced undefined and made every Prisma write below fail with
// "Argument `user` is missing", so the link-token + status + unlink
// endpoints never worked for any signed-in user.
interface AuthedRequest extends Request {
    user?: { id: string; role: string };
}

export const getStatus = async (req: AuthedRequest, res: Response) => {
    const userId = req.user!.id;
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
    const userId = req.user!.id;
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
    const userId = req.user!.id;
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
        secure: env.NODE_ENV === 'production',
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

/**
 * Telegram Login Widget callback handler.
 * Body: { id, first_name, last_name?, username?, photo_url?, auth_date, hash }
 * — exactly the shape Telegram posts to data-auth-url / onTelegramAuth.
 */
export const widgetLoginHandler = async (req: Request, res: Response) => {
    const payload = req.body as WidgetPayload;
    const result = await widgetLogin(payload);
    if (!result.success) {
        const status = result.code === 'not_bound' ? 404
            : result.code === 'expired' ? 401
            : result.code === 'config_error' ? 503
            : 401;
        return res.status(status).json({
            success: false,
            code: result.code,
            // Echo the Telegram user id so the SPA can prefill signup with it.
            telegramUserId: payload?.id,
            firstName: payload?.first_name,
            username: payload?.username,
        });
    }

    res.cookie('user_refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: env.NODE_ENV === 'production',
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
