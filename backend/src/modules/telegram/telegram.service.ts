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
/**
 * Map a destination path coming from the notification dispatcher into a
 * t.me/<bot>?startapp=<param> deep link. Plain web_app inline buttons would
 * also open the Mini App, but on at least one mobile Telegram client they
 * reload back to the configured root URL — the patient lands on the home
 * services page instead of the booking/profile/notifications screen the
 * notification was about. The deep-link path goes through Telegram's
 * official Mini-App handler so the patient reliably ends up where intended.
 *
 * Unknown paths fall back to a plain web_app button (still safer than a
 * url button — which opens the in-app browser with no initData / no cookie).
 */
function destinationButton(link: string): any {
    const path = link.startsWith('http')
        ? new URL(link).pathname + new URL(link).search
        : link.startsWith('/') ? link : '/' + link;

    const botUsername = process.env.TELEGRAM_BOT_USERNAME || 'banisauzbot';
    const deep = (p: string) => ({ text: 'Ochish', url: `https://t.me/${botUsername}?startapp=${encodeURIComponent(p)}` });

    if (path === '/user/appointments') return deep('appointments');
    if (path === '/user/cart' || path === '/user/cart/checkout') return deep(path.endsWith('checkout') ? 'checkout' : 'cart');
    if (path === '/user/notifications') return deep('notifications');
    if (path === '/user/profile') return deep('profile');
    if (path === '/user/notification-settings') return deep('notification-settings');
    if (path === '/user/scan-checkin') return deep('scan-checkin');
    if (path === '/xizmatlar') return deep('services');
    if (path === '/klinikalar') return deep('clinics');
    if (path === '/doktorlar') return deep('doctors');
    if (path === '/skory') return deep('skory');
    const apptMatch = path.match(/^\/user\/appointments\/([^/?]+)/);
    if (apptMatch) return deep(`appt-${apptMatch[1]}`);
    const clinicCashier = path.match(/^\/clinic\/cashier/);
    if (clinicCashier) return { text: 'Ochish', web_app: { url: absoluteLink(link) } };
    // Default for unknown user-side paths: also a deep link so it opens
    // the Mini App at root rather than the browser.
    if (path.startsWith('/user/')) return deep(path.slice(1).replace(/\//g, '-'));
    return { text: 'Ochish', web_app: { url: absoluteLink(link) } };
}

export async function sendMessage(chatId: bigint, text: string, link?: string): Promise<{ ok: boolean; messageId?: number; error?: string }> {
    const bot = getBot();
    if (!bot) return { ok: false, error: 'bot not configured' };
    try {
        const reply_markup = link
            ? { inline_keyboard: [[destinationButton(link)]] }
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
