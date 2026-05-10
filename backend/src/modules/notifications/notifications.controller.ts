import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware';
import { sendSuccess } from '../../utils/response';
import * as notificationsService from './notifications.service';
import crypto from 'crypto';

export const list = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const unreadOnly = String(req.query.unread || req.query.isRead === 'false' || 'false') === 'true'
            || req.query.isRead === 'false';
        const limit = req.query.limit ? parseInt(String(req.query.limit)) : 20;
        const cursor = req.query.cursor ? String(req.query.cursor) : undefined;

        const { items, nextCursor } = await notificationsService.listForUser({ userId, unreadOnly, limit, cursor });
        const { count: unreadCount } = await notificationsService.unreadCountForUser(userId);

        // Shape items to satisfy both new (body) and legacy (message) consumers
        const shaped = items.map((n: any) => ({
            ...n,
            message: n.body,
        }));

        sendSuccess(res, {
            items: shaped,
            notifications: shaped,
            nextCursor,
            unreadCount,
            total: shaped.length,
        });
    } catch (err) {
        next(err);
    }
};

/**
 * Unread count + ETag-based caching for cheap polling.
 * Returns 304 if the (count, latestAt) pair hasn't changed.
 */
export const unreadCount = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const data = await notificationsService.unreadCountForUser(userId);

        const etag = `W/"${crypto
            .createHash('sha1')
            .update(`${data.count}:${data.latestAt || ''}`)
            .digest('hex')}"`;

        res.setHeader('ETag', etag);
        res.setHeader('Cache-Control', 'private, no-cache');

        if (req.headers['if-none-match'] === etag) {
            return res.status(304).end();
        }

        sendSuccess(res, data);
    } catch (err) {
        next(err);
    }
};

export const markRead = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        await notificationsService.markRead(req.user!.id, String(req.params.id));
        sendSuccess(res, { ok: true });
    } catch (err) {
        next(err);
    }
};

export const markAllRead = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        await notificationsService.markAllRead(req.user!.id);
        sendSuccess(res, { ok: true });
    } catch (err) {
        next(err);
    }
};
