import { Request, Response, Router } from 'express';
import { webhookCallback } from 'grammy';
import { getBot } from './telegram.bot';

const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET || '';

/**
 * Mount as: app.use('/api/telegram', telegramWebhookRouter)
 * Telegram POSTs to /api/telegram/webhook.
 *
 * Security:
 * - When TELEGRAM_WEBHOOK_SECRET is set, Telegram sends it back in the
 *   X-Telegram-Bot-Api-Secret-Token header. We reject mismatches.
 * - When unset (dev), we accept any request — register webhook accordingly.
 */
export const telegramWebhookRouter = Router();

telegramWebhookRouter.post('/webhook', async (req: Request, res: Response) => {
    if (WEBHOOK_SECRET) {
        const provided = req.header('X-Telegram-Bot-Api-Secret-Token') || '';
        if (provided !== WEBHOOK_SECRET) {
            return res.status(401).json({ ok: false });
        }
    }

    const bot = getBot();
    if (!bot) {
        return res.status(503).json({ ok: false, message: 'bot not configured' });
    }

    // grammy's webhookCallback handles update parsing, dispatching to handlers,
    // and writing the response. We instantiate per-request so config is fresh.
    try {
        const handler = webhookCallback(bot, 'express');
        // Await so async handler rejections are caught here — otherwise they
        // escaped to Express and returned 500, making Telegram retry the same
        // update forever (error-log spam).
        await handler(req, res);
    } catch (e) {
        console.error('[telegram] webhook error:', e);
        // 200 so Telegram doesn't retry forever. Guard headersSent — grammy may
        // have already written the response before the error surfaced.
        if (!res.headersSent) res.status(200).json({ ok: false });
    }
});
