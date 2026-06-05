import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import prisma from '../../config/database';
import { env } from '../../config/env';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const INIT_DATA_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours per Telegram guidance

export interface TelegramWebAppUser {
    id: number;
    first_name?: string;
    last_name?: string;
    username?: string;
    language_code?: string;
}

export interface VerifyResult {
    ok: true;
    user: TelegramWebAppUser;
    authDate: number;
}

export interface VerifyError {
    ok: false;
    reason: 'no_hash' | 'no_user' | 'no_auth_date' | 'expired' | 'invalid_signature' | 'no_bot_token';
}

/**
 * Verify Telegram WebApp initData per official spec:
 *   secret = HMAC_SHA256(key="WebAppData", message=BOT_TOKEN)
 *   data_check_string = sorted "key=value" pairs joined with "\n" (hash excluded)
 *   expected_hash = HMAC_SHA256(key=secret, message=data_check_string)
 *
 * Rejects payloads older than 24 hours.
 */
export function verifyInitData(initDataRaw: string): VerifyResult | VerifyError {
    if (!BOT_TOKEN) return { ok: false, reason: 'no_bot_token' };

    const params = new URLSearchParams(initDataRaw);
    const hash = params.get('hash');
    if (!hash) return { ok: false, reason: 'no_hash' };

    const authDateStr = params.get('auth_date');
    if (!authDateStr) return { ok: false, reason: 'no_auth_date' };
    const authDate = parseInt(authDateStr, 10);
    if (!Number.isFinite(authDate)) return { ok: false, reason: 'no_auth_date' };
    if (Date.now() - authDate * 1000 > INIT_DATA_MAX_AGE_MS) {
        return { ok: false, reason: 'expired' };
    }

    const userRaw = params.get('user');
    if (!userRaw) return { ok: false, reason: 'no_user' };

    // Build data_check_string
    params.delete('hash');
    const dataCheckString = Array.from(params.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => `${k}=${v}`)
        .join('\n');

    const secret = crypto.createHmac('sha256', 'WebAppData').update(BOT_TOKEN).digest();
    const expected = crypto.createHmac('sha256', secret).update(dataCheckString).digest('hex');

    // Constant-time compare
    const a = Buffer.from(expected, 'hex');
    const b = Buffer.from(hash, 'hex');
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
        return { ok: false, reason: 'invalid_signature' };
    }

    try {
        const user = JSON.parse(userRaw) as TelegramWebAppUser;
        return { ok: true, user, authDate };
    } catch {
        return { ok: false, reason: 'no_user' };
    }
}

export interface MiniAppLoginResult {
    success: boolean;
    code?: 'not_bound' | 'invalid_init_data' | 'expired' | 'config_error';
    accessToken?: string;
    refreshToken?: string;
    user?: any;
}

const signAccessToken = (payload: { id: string; role: string }) =>
    jwt.sign(payload, env.JWT_ACCESS_SECRET as jwt.Secret, {
        expiresIn: env.NODE_ENV === 'production' ? '15m' : '1h',
    } as jwt.SignOptions);

const signRefreshToken = (payload: { id: string }) =>
    jwt.sign(payload, env.JWT_REFRESH_SECRET as jwt.Secret, { expiresIn: '7d' } as jwt.SignOptions);

/**
 * Look up the bound user by Telegram user_id and issue patient tokens.
 * Returns `not_bound` when the Telegram user has never bound their account
 * via the web link flow — frontend should redirect to "bind first" UX.
 */
export async function miniAppLogin(initDataRaw: string): Promise<MiniAppLoginResult> {
    const verify = verifyInitData(initDataRaw);
    if (!verify.ok) {
        if (verify.reason === 'expired') return { success: false, code: 'expired' };
        if (verify.reason === 'no_bot_token') return { success: false, code: 'config_error' };
        return { success: false, code: 'invalid_init_data' };
    }

    const tgUserId = BigInt(verify.user.id);
    const acc = await (prisma as any).telegramAccount.findUnique({
        where: { telegramUserId: tgUserId },
        include: { user: true },
    });

    if (!acc || !acc.user) return { success: false, code: 'not_bound' };

    // Touch lastSeenAt — useful for analytics + churn signals.
    try {
        await (prisma as any).telegramAccount.update({
            where: { id: acc.id },
            data: {
                lastSeenAt: new Date(),
                username: verify.user.username || acc.username,
                firstName: verify.user.first_name || acc.firstName,
                language: verify.user.language_code === 'ru' ? 'ru' : (acc.language || 'uz'),
                isBlocked: false,
            },
        });
    } catch (e) {
        console.error('[miniapp] touch failed:', e);
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
