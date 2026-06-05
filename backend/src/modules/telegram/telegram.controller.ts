import { Request, Response } from 'express';
import { createLinkToken, getLinkStatus, unlink } from './telegram.service';
import { isTelegramConfigured } from './telegram.bot';

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
