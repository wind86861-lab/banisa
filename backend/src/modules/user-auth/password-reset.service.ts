import bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import prisma from '../../config/database';
import { AppError, ErrorCodes } from '../../utils/errors';
import { sendMessage } from '../telegram/telegram.service';
import { sendRawSms } from '../notifications/channels/eskiz.channel';

const TOKEN_TTL_MS = 15 * 60 * 1000; // 15 minutes
const BCRYPT_ROUNDS = 12;

/**
 * Normalize a phone string to "+998XXXXXXXXX" form. Accepts:
 *   "+998 90 123 45 67", "998901234567", "+998-90-123-45-67", etc.
 * Returns null when the result doesn't look like an E.164-ish phone.
 */
function normalizePhone(raw: string | undefined): string | null {
    if (!raw) return null;
    let s = String(raw).trim().replace(/[\s\-()]/g, '');
    if (!s) return null;
    if (!s.startsWith('+')) {
        if (/^\d{9,15}$/.test(s)) s = '+' + s;
    }
    if (!/^\+\d{9,15}$/.test(s)) return null;
    return s;
}

/**
 * Send a password-reset link to a patient. Tries the bot first (deep-link
 * the patient taps inside Telegram), falls back to SMS later if we wire
 * Eskiz here. Never reveals whether the phone is registered — every
 * normalized phone receives the same 200 response so this can't be used
 * to enumerate accounts.
 */
export async function requestPasswordReset(rawPhone: string, ipAddress?: string): Promise<{ sent: boolean; channel: 'telegram' | 'sms' | 'none' }> {
    const phone = normalizePhone(rawPhone);
    if (!phone) {
        throw new AppError('Telefon raqami noto\'g\'ri', 400, ErrorCodes.VALIDATION_ERROR);
    }

    const user = await prisma.user.findFirst({
        where: { phone, role: 'PATIENT' as any, isActive: true },
        select: { id: true },
    });
    if (!user) return { sent: false, channel: 'none' };

    // Invalidate any previous live reset tokens for this user so the patient
    // can't get confused by older links sitting in their chat.
    try {
        await (prisma as any).telegramLoginToken.deleteMany({
            where: { userId: user.id, purpose: 'reset' },
        });
    } catch { /* not fatal */ }

    const token = randomBytes(24).toString('base64url');
    const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);
    await (prisma as any).telegramLoginToken.create({
        data: { token, userId: user.id, purpose: 'reset', expiresAt, ipAddress: ipAddress || null },
    });

    const base = (process.env.PUBLIC_API_BASE_URL || 'https://banisa.uz').replace(/\/+$/, '');
    const link = `${base}/user/reset-password?token=${encodeURIComponent(token)}`;

    // Channel pick: Telegram-bound patients get the rich bot message; everyone
    // else falls back to SMS. Without this fallback, password-less recovery
    // was impossible for the majority of patients (no bot link).
    const tg = await (prisma as any).telegramAccount.findUnique({
        where: { userId: user.id },
        select: { chatId: true, language: true, isBlocked: true },
    });

    if (tg && !tg.isBlocked) {
        const lang = tg.language === 'ru' ? 'ru' : 'uz';
        const body = lang === 'ru'
            ? '🔐 <b>Сброс пароля</b>\n\nНажмите кнопку ниже, чтобы задать новый пароль. Срок действия — 15 минут.\n\nЕсли вы не запрашивали сброс, проигнорируйте это сообщение.'
            : '🔐 <b>Parolni tiklash</b>\n\nYangi parol o\'rnatish uchun pastdagi tugmani bosing. Havola 15 daqiqa amal qiladi.\n\nAgar siz so\'ramagan bo\'lsangiz — e\'tibor bermang.';
        await sendMessage(BigInt(tg.chatId), body, link);
        return { sent: true, channel: 'telegram' };
    }

    // SMS fallback — keep the message tight so it stays within one Latin
    // segment (160 chars). The link itself is ~80 chars depending on host.
    const smsText = `Banisa: parolni tiklash uchun ${link} (15 daqiqa).`;
    const smsResult = await sendRawSms(phone, smsText);
    if (smsResult.ok) return { sent: true, channel: 'sms' };

    return { sent: false, channel: 'none' };
}

/**
 * Consume a reset token and set a new password. Bcrypt-hashes the
 * password and marks the token used in the same transaction so it can't
 * be replayed.
 */
export async function consumeResetToken(rawToken: string, newPassword: string): Promise<{ ok: true }> {
    if (!rawToken || typeof rawToken !== 'string') {
        throw new AppError('Havola noto\'g\'ri', 400, ErrorCodes.VALIDATION_ERROR);
    }
    if (!newPassword || newPassword.length < 6 || newPassword.length > 128) {
        throw new AppError('Parol kamida 6 ta belgi bo\'lishi kerak', 400, ErrorCodes.VALIDATION_ERROR);
    }

    await prisma.$transaction(async (tx) => {
        const row = await (tx as any).telegramLoginToken.findUnique({ where: { token: rawToken } });
        if (!row || row.purpose !== 'reset') throw new AppError('Havola noto\'g\'ri yoki muddati o\'tgan', 400, ErrorCodes.VALIDATION_ERROR);
        if (row.usedAt) throw new AppError('Havola allaqachon ishlatilgan', 400, ErrorCodes.VALIDATION_ERROR);
        if (row.expiresAt < new Date()) throw new AppError('Havola muddati tugagan', 400, ErrorCodes.VALIDATION_ERROR);

        const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
        await tx.user.update({ where: { id: row.userId }, data: { passwordHash } });
        await (tx as any).telegramLoginToken.update({
            where: { token: rawToken },
            data: { usedAt: new Date() },
        });
    });

    return { ok: true };
}

/**
 * Cheap "is this token still usable" check so the SPA can branch between
 * "show password form" and "show expired-link error" without hitting the
 * mutating consume path.
 */
export async function validateResetToken(rawToken: string): Promise<{ valid: boolean }> {
    if (!rawToken || typeof rawToken !== 'string') return { valid: false };
    const row = await (prisma as any).telegramLoginToken.findUnique({ where: { token: rawToken } });
    if (!row || row.purpose !== 'reset' || row.usedAt || row.expiresAt < new Date()) return { valid: false };
    return { valid: true };
}
