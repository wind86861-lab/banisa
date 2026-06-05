import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import prisma from '../../config/database';
import { env } from '../../config/env';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const MAX_AUTH_AGE_S = 24 * 60 * 60; // 24 hours

export interface WidgetPayload {
    id: number;
    first_name?: string;
    last_name?: string;
    username?: string;
    photo_url?: string;
    auth_date: number;
    hash: string;
}

export interface WidgetLoginResult {
    success: boolean;
    code?: 'not_bound' | 'invalid_signature' | 'expired' | 'config_error' | 'missing_fields';
    accessToken?: string;
    refreshToken?: string;
    user?: any;
}

/**
 * Verify Telegram Login Widget payload per official spec:
 *   secret = SHA256(BOT_TOKEN)           ← differs from Mini App!
 *   data_check_string = sorted "key=value" joined "\n" (hash excluded)
 *   expected = HMAC_SHA256(secret, data_check_string)
 *
 * Reject payloads older than 24h.
 */
export function verifyWidget(payload: WidgetPayload): boolean {
    if (!BOT_TOKEN) return false;
    if (!payload?.hash || !payload?.auth_date) return false;
    if (Math.floor(Date.now() / 1000) - payload.auth_date > MAX_AUTH_AGE_S) return false;

    const { hash, ...rest } = payload;
    const dataCheckString = Object.entries(rest)
        .filter(([, v]) => v !== undefined && v !== null)
        .map(([k, v]) => [k, String(v)] as [string, string])
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => `${k}=${v}`)
        .join('\n');

    const secret = crypto.createHash('sha256').update(BOT_TOKEN).digest();
    const expected = crypto.createHmac('sha256', secret).update(dataCheckString).digest('hex');

    const a = Buffer.from(expected, 'hex');
    const b = Buffer.from(hash, 'hex');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
}

const signAccessToken = (payload: { id: string; role: string }) =>
    jwt.sign(payload, env.JWT_ACCESS_SECRET as jwt.Secret, {
        expiresIn: env.NODE_ENV === 'production' ? '15m' : '1h',
    } as jwt.SignOptions);

const signRefreshToken = (payload: { id: string }) =>
    jwt.sign(payload, env.JWT_REFRESH_SECRET as jwt.Secret, { expiresIn: '7d' } as jwt.SignOptions);

/**
 * Widget login. Same idea as Mini App: must already be bound via the web flow.
 * not_bound → frontend redirects to "bind first" / signup.
 */
export async function widgetLogin(payload: WidgetPayload): Promise<WidgetLoginResult> {
    if (!BOT_TOKEN) return { success: false, code: 'config_error' };
    if (!payload?.id || !payload?.hash) return { success: false, code: 'missing_fields' };

    if (!verifyWidget(payload)) {
        if (Math.floor(Date.now() / 1000) - (payload.auth_date || 0) > MAX_AUTH_AGE_S) {
            return { success: false, code: 'expired' };
        }
        return { success: false, code: 'invalid_signature' };
    }

    const acc = await (prisma as any).telegramAccount.findUnique({
        where: { telegramUserId: BigInt(payload.id) },
        include: { user: true },
    });
    if (!acc || !acc.user) return { success: false, code: 'not_bound' };

    try {
        await (prisma as any).telegramAccount.update({
            where: { id: acc.id },
            data: {
                lastSeenAt: new Date(),
                username: payload.username || acc.username,
                firstName: payload.first_name || acc.firstName,
                isBlocked: false,
            },
        });
    } catch (e) {
        console.error('[widget] touch failed:', e);
    }

    const accessToken = signAccessToken({ id: acc.user.id, role: acc.user.role });
    const refreshToken = signRefreshToken({ id: acc.user.id });

    return {
        success: true,
        accessToken,
        refreshToken,
        user: {
            id: acc.user.id,
            phone: acc.user.phone,
            firstName: acc.user.firstName,
            lastName: acc.user.lastName,
            email: acc.user.email,
            role: acc.user.role,
        },
    };
}
