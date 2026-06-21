import bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import jwt from 'jsonwebtoken';
import prisma from '../../config/database';
import { env } from '../../config/env';

/**
 * Register-or-login a patient using a Telegram-shared contact.
 *
 * Trigger paths:
 *   • Bot's `message:contact` handler — user tapped the request_contact button.
 *   • Mini App's requestContact() → the bot still receives the contact message
 *     and processes it identically.
 *
 * Phone matching wins over telegramUserId — i.e. if a User already exists
 * with this phone (registered via the web), we LINK the Telegram account
 * to that existing User rather than creating a duplicate.
 */

const BCRYPT_ROUNDS = 12;

export interface ContactRegisterInput {
    telegramUserId: bigint;
    chatId: bigint;
    phone: string;          // raw from Telegram contact.phone_number (e.g. "998997654321" or "+998997654321")
    firstName?: string | null;
    lastName?: string | null;
    username?: string | null;
    language?: string | null;
}

export interface ContactRegisterResult {
    success: boolean;
    code?: 'invalid_phone' | 'db_error';
    /** Whether a brand-new User was created (vs linked to an existing phone). */
    created?: boolean;
    accessToken?: string;
    refreshToken?: string;
    user?: { id: string; phone: string; firstName: string | null; lastName: string | null; role: string };
}

function normalizePhone(raw: string): string | null {
    // Strip everything except digits and a leading +
    let s = (raw || '').trim().replace(/[\s\-()]/g, '');
    if (!s) return null;
    if (!s.startsWith('+')) {
        // Telegram contact often returns "998997654321" without the plus
        if (/^\d{9,15}$/.test(s)) s = '+' + s;
    }
    if (!/^\+\d{9,15}$/.test(s)) return null;
    return s;
}

const signAccessToken = (payload: { id: string; role: string }) =>
    jwt.sign(payload, env.JWT_ACCESS_SECRET as jwt.Secret, {
        expiresIn: env.NODE_ENV === 'production' ? '15m' : '1h',
    } as jwt.SignOptions);

const signRefreshToken = (payload: { id: string }) =>
    jwt.sign(payload, env.JWT_REFRESH_SECRET as jwt.Secret, { expiresIn: '7d' } as jwt.SignOptions);

export async function registerOrLoginViaContact(input: ContactRegisterInput): Promise<ContactRegisterResult> {
    const phone = normalizePhone(input.phone);
    if (!phone) return { success: false, code: 'invalid_phone' };

    const lang = input.language === 'ru' ? 'ru' : 'uz';

    try {
        // Phone is unique across ALL roles in the schema, so we have to look
        // it up role-agnostically. Filtering by role: 'PATIENT' (the old
        // behavior) silently misses existing DOCTOR / CLINIC_ADMIN / etc.
        // accounts and then the create() below crashes on the unique
        // constraint — that was the bug behind the live "Произошла ошибка"
        // shown to users sharing their contact via the bot.
        let user = await prisma.user.findFirst({
            where: { phone },
            select: { id: true, phone: true, firstName: true, lastName: true, role: true, isActive: true },
        });

        let created = false;

        if (!user) {
            // No User with this phone — create a fresh patient account.
            // Password is random + bcrypt'd; the user can later reset it via
            // SMS/forgot-password if they ever want phone+password login.
            const randomPassword = randomBytes(24).toString('base64url');
            const passwordHash = await bcrypt.hash(randomPassword, BCRYPT_ROUNDS);
            try {
                user = await prisma.user.create({
                    data: {
                        phone,
                        passwordHash,
                        firstName: input.firstName || null,
                        lastName: input.lastName || null,
                        email: null,
                        role: 'PATIENT' as any,
                        isActive: true,
                        status: 'APPROVED' as any,
                    },
                    select: { id: true, phone: true, firstName: true, lastName: true, role: true, isActive: true },
                });
                created = true;
            } catch (e: any) {
                // P2002 = unique constraint. Lost a race with another
                // concurrent contact-share for the same phone — just re-read.
                if (e?.code === 'P2002') {
                    user = await prisma.user.findFirst({
                        where: { phone },
                        select: { id: true, phone: true, firstName: true, lastName: true, role: true, isActive: true },
                    });
                    if (!user) throw e;
                } else {
                    throw e;
                }
            }
        } else if (!user.isActive) {
            return { success: false, code: 'db_error' };
        }

        // Upsert the TelegramAccount linking this user ↔ chatId.
        await (prisma as any).telegramAccount.upsert({
            where: { userId: user.id },
            update: {
                chatId: input.chatId,
                telegramUserId: input.telegramUserId,
                username: input.username || null,
                firstName: input.firstName || null,
                language: lang,
                isBlocked: false,
                lastSeenAt: new Date(),
            },
            create: {
                userId: user.id,
                chatId: input.chatId,
                telegramUserId: input.telegramUserId,
                username: input.username || null,
                firstName: input.firstName || null,
                language: lang,
            },
        });

        const accessToken = signAccessToken({ id: user.id, role: user.role });
        const refreshToken = signRefreshToken({ id: user.id });

        return {
            success: true,
            created,
            accessToken,
            refreshToken,
            user: {
                id: user.id,
                phone: user.phone,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role,
            },
        };
    } catch (e) {
        console.error('[telegram] registerOrLoginViaContact failed:', e);
        return { success: false, code: 'db_error' };
    }
}
