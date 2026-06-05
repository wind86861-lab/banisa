import { randomBytes } from 'crypto';
import prisma from '../../config/database';
import { getBot, getBotUsername } from './telegram.bot';

const LINK_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

export interface LinkInfo {
    token: string;
    deepLink: string;
    expiresAt: Date;
}

/**
 * Create a one-shot link token and return the t.me deep-link for the user
 * to open in Telegram. Token is consumed by the bot's /start handler.
 */
export async function createLinkToken(userId: string, ipAddress?: string): Promise<LinkInfo | null> {
    const username = await getBotUsername();
    if (!username) return null;

    const token = randomBytes(24).toString('base64url');
    const expiresAt = new Date(Date.now() + LINK_TOKEN_TTL_MS);

    await (prisma as any).telegramLoginToken.create({
        data: { token, userId, purpose: 'link', expiresAt, ipAddress: ipAddress || null },
    });

    return {
        token,
        deepLink: `https://t.me/${username}?start=${token}`,
        expiresAt,
    };
}

export async function getLinkStatus(userId: string): Promise<{ linked: boolean; username?: string | null; firstName?: string | null; linkedAt?: Date }> {
    const acc = await (prisma as any).telegramAccount.findUnique({ where: { userId } });
    if (!acc) return { linked: false };
    return {
        linked: !acc.isBlocked,
        username: acc.username,
        firstName: acc.firstName,
        linkedAt: acc.linkedAt,
    };
}

export async function unlink(userId: string): Promise<boolean> {
    const res = await (prisma as any).telegramAccount.deleteMany({ where: { userId } });
    return res.count > 0;
}

/**
 * Send a markdown message to a single chat. Marks isBlocked=true if the user
 * blocked the bot (Telegram error 403). Never throws.
 */
export async function sendMessage(chatId: bigint, text: string, link?: string): Promise<{ ok: boolean; messageId?: number; error?: string }> {
    const bot = getBot();
    if (!bot) return { ok: false, error: 'bot not configured' };
    try {
        const reply_markup = link
            ? { inline_keyboard: [[{ text: 'Ochish', url: absoluteLink(link) }]] }
            : undefined;
        const msg = await bot.api.sendMessage(Number(chatId), text, {
            parse_mode: 'Markdown',
            ...(reply_markup ? { reply_markup } : {}),
        });
        return { ok: true, messageId: msg.message_id };
    } catch (e: any) {
        const desc = e?.description || e?.message || 'send failed';
        // 403 → user blocked the bot
        if (e?.error_code === 403) {
            try {
                await (prisma as any).telegramAccount.updateMany({
                    where: { chatId },
                    data: { isBlocked: true },
                });
            } catch {}
        }
        return { ok: false, error: desc };
    }
}

function absoluteLink(path: string): string {
    if (/^https?:\/\//i.test(path)) return path;
    const base = process.env.PUBLIC_API_BASE_URL || 'https://banisa.uz';
    return base.replace(/\/+$/, '') + (path.startsWith('/') ? path : '/' + path);
}
