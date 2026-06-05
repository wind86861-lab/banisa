import { NotificationEvent } from '../notification.types';
import { NotificationChannel, DeliveryResult } from './channel';

/**
 * Telegram channel — STUB for Phase 1.
 * Returns skipped=true until the bot/binding system lands (Phase 2).
 * Once TelegramAccount table + grammy bot are wired, this becomes a real sender.
 */
export const telegramChannel: NotificationChannel = {
    name: 'telegram',
    async send(_event: NotificationEvent): Promise<DeliveryResult> {
        return { ok: false, skipped: true, error: 'telegram not configured' };
    },
};
