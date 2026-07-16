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

    // Auth / account-recovery links MUST stay plain URL buttons opening the web
    // page. A Mini-App startapp deep-link silently drops the query string
    // (Telegram only allows [A-Za-z0-9_-] in startapp), so the ?token=… on a
    // password-reset link was lost → the page opened with no token → "link
    // invalid/expired". The user is logged out here anyway, so there's no
    // initData/cookie worth preserving via the Mini App.
    if (path.startsWith('/user/reset-password') || path.startsWith('/user/forgot-password')) {
        return { text: 'Parolni tiklash', url: absoluteLink(link) };
    }

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

/** Extra action button rendered alongside the deep-link destination button.
 *  Callback buttons fire the bot's own callbackQuery handlers (e.g. accept /
 *  reschedule), so a clinic admin can act on a booking without leaving chat.
 */
export interface InlineActionButton { text: string; callback_data: string; }

export async function sendMessage(
    chatId: bigint,
    text: string,
    link?: string,
    actions?: InlineActionButton[],
): Promise<{ ok: boolean; messageId?: number; error?: string }> {
    const bot = getBot();
    if (!bot) return { ok: false, error: 'bot not configured' };
    try {
        const rows: any[][] = [];
        if (actions && actions.length) {
            // One action button per row keeps long Uzbek labels readable.
            for (const a of actions) rows.push([{ text: a.text, callback_data: a.callback_data }]);
        }
        if (link) rows.push([destinationButton(link)]);
        const reply_markup = rows.length ? { inline_keyboard: rows } : undefined;
        // HTML mode: templates emit <b>/<code>/<i>; only <, >, & need escaping
        // (handled per-field by esc() in notification.templates.ts). Markdown
        // was silently 400ing on any clinic/patient name with an apostrophe.
        const msg = await bot.api.sendMessage(Number(chatId), text, {
            parse_mode: 'HTML',
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
