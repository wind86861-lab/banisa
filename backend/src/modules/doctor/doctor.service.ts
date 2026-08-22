import bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import jwt from 'jsonwebtoken';
import prisma from '../../config/database';
import { env } from '../../config/env';
import { verifyInitData } from '../telegram/miniapp.auth';
import { AppError, ErrorCodes } from '../../utils/errors';

const BCRYPT_ROUNDS = 12;

const signAccessToken = (payload: { id: string; role: string }) =>
    jwt.sign(payload, env.JWT_ACCESS_SECRET as jwt.Secret, {
        expiresIn: env.NODE_ENV === 'production' ? '1h' : '4h',
    } as jwt.SignOptions);

const signRefreshToken = (payload: { id: string }) =>
    jwt.sign(payload, env.JWT_REFRESH_SECRET as jwt.Secret, { expiresIn: '7d' } as jwt.SignOptions);

const publicUser = (u: any) => ({
    id: u.id, phone: u.phone, firstName: u.firstName, lastName: u.lastName,
    email: u.email, role: u.role, status: u.status,
});

function issueForUser(u: any) {
    return {
        accessToken: signAccessToken({ id: u.id, role: u.role }),
        refreshToken: signRefreshToken({ id: u.id }),
        user: publicUser(u),
    };
}

export interface DoctorRegisterInput {
    initDataRaw: string;
    firstName?: string;
    lastName?: string;
    phone: string;
    specialty?: string;
    bio?: string;
    documents?: Array<{ url: string; name?: string; type?: string }>;
}

/**
 * Register a Telegram user as a DOCTOR (status=PENDING) from inside the Mini App.
 * Verifies the initData signature, then creates User(role=DOCTOR) + DoctorProfile
 * + TelegramAccount. MVP rule: one Telegram account = one role — a Telegram
 * already bound to a patient can't also become a doctor.
 */
export async function registerDoctor(input: DoctorRegisterInput) {
    const verify = verifyInitData(input.initDataRaw);
    if (!verify.ok) throw new AppError('Init data yaroqsiz', 401, ErrorCodes.UNAUTHORIZED);

    const tgUserId = BigInt(verify.user.id);
    const phone = String(input.phone || '').replace(/\s+/g, '');
    if (!phone) throw new AppError('Telefon raqami kerak', 400, ErrorCodes.VALIDATION_ERROR);

    // Already bound? — one role per Telegram in MVP.
    const existing = await (prisma as any).telegramAccount.findUnique({
        where: { telegramUserId: tgUserId },
        include: { user: true },
    });
    if (existing?.user) {
        if (existing.user.role === 'DOCTOR') return issueForUser(existing.user); // idempotent
        throw new AppError('Bu Telegram allaqachon boshqa rol bilan band', 409, ErrorCodes.DUPLICATE_ERROR);
    }

    const passwordHash = await bcrypt.hash(randomBytes(24).toString('base64url'), BCRYPT_ROUNDS);
    let user: any;
    try {
        user = await prisma.$transaction(async (tx: any) => {
            const u = await tx.user.create({
                data: {
                    phone,
                    passwordHash,
                    firstName: input.firstName || null,
                    lastName: input.lastName || null,
                    role: 'DOCTOR',
                    status: 'PENDING',
                    isActive: true,
                },
            });
            await tx.doctorProfile.create({
                data: {
                    userId: u.id,
                    specialty: input.specialty || null,
                    bio: input.bio || null,
                    documents: Array.isArray(input.documents) ? input.documents : [],
                },
            });
            await tx.telegramAccount.create({
                data: {
                    userId: u.id,
                    chatId: tgUserId, // private chat: chatId == user id
                    telegramUserId: tgUserId,
                    username: verify.user.username || null,
                    firstName: verify.user.first_name || null,
                    language: verify.user.language_code === 'ru' ? 'ru' : 'uz',
                },
            });
            return u;
        });
    } catch (e: any) {
        if (e?.code === 'P2002') throw new AppError('Bu telefon allaqachon ro\'yxatda', 409, ErrorCodes.DUPLICATE_ERROR);
        throw e;
    }
    return issueForUser(user);
}

/** Doctor's own profile + approval status (for the Mini App dashboard/pending screen). */
export async function getMyDoctor(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.role !== 'DOCTOR') throw new AppError('Shifokor topilmadi', 404, ErrorCodes.NOT_FOUND);
    const profile = await (prisma as any).doctorProfile.findUnique({ where: { userId } });
    return {
        ...publicUser(user),
        specialty: profile?.specialty ?? null,
        bio: profile?.bio ?? null,
        documents: profile?.documents ?? [],
        rejectionReason: profile?.rejectionReason ?? null,
    };
}

/** Doctor updates their own profile (specialty / bio / documents) — pre-approval. */
export async function updateMyDoctor(userId: string, patch: { specialty?: string; bio?: string; documents?: any[]; firstName?: string; lastName?: string }) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.role !== 'DOCTOR') throw new AppError('Shifokor topilmadi', 404, ErrorCodes.NOT_FOUND);

    const userData: any = {};
    if (patch.firstName !== undefined) userData.firstName = patch.firstName || null;
    if (patch.lastName !== undefined) userData.lastName = patch.lastName || null;
    if (Object.keys(userData).length) await prisma.user.update({ where: { id: userId }, data: userData });

    const profData: any = {};
    if (patch.specialty !== undefined) profData.specialty = patch.specialty || null;
    if (patch.bio !== undefined) profData.bio = patch.bio || null;
    if (patch.documents !== undefined) profData.documents = Array.isArray(patch.documents) ? patch.documents : [];
    if (Object.keys(profData).length) {
        await (prisma as any).doctorProfile.upsert({
            where: { userId },
            update: profData,
            create: { userId, ...profData },
        });
    }
    return getMyDoctor(userId);
}

// ─── Admin ───────────────────────────────────────────────────────────────────

export async function adminListDoctors(status?: string) {
    const where: any = { role: 'DOCTOR' };
    if (status) where.status = status;
    const rows = await prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: { doctorProfile: true } as any,
    });
    return rows.map((u: any) => ({
        id: u.id, firstName: u.firstName, lastName: u.lastName, phone: u.phone,
        status: u.status, createdAt: u.createdAt,
        specialty: u.doctorProfile?.specialty ?? null,
        documentsCount: Array.isArray(u.doctorProfile?.documents) ? u.doctorProfile.documents.length : 0,
    }));
}

export async function adminGetDoctor(id: string) {
    const u: any = await prisma.user.findUnique({ where: { id }, include: { doctorProfile: true } as any });
    if (!u || u.role !== 'DOCTOR') throw new AppError('Shifokor topilmadi', 404, ErrorCodes.NOT_FOUND);
    return {
        id: u.id, firstName: u.firstName, lastName: u.lastName, phone: u.phone, email: u.email,
        status: u.status, createdAt: u.createdAt,
        specialty: u.doctorProfile?.specialty ?? null,
        bio: u.doctorProfile?.bio ?? null,
        documents: u.doctorProfile?.documents ?? [],
        rejectionReason: u.doctorProfile?.rejectionReason ?? null,
    };
}

export async function adminApproveDoctor(id: string) {
    const u = await prisma.user.findUnique({ where: { id } });
    if (!u || u.role !== 'DOCTOR') throw new AppError('Shifokor topilmadi', 404, ErrorCodes.NOT_FOUND);
    await prisma.$transaction(async (tx: any) => {
        await tx.user.update({ where: { id }, data: { status: 'APPROVED' } });
        await tx.doctorProfile.updateMany({ where: { userId: id }, data: { rejectionReason: null } });
    });
    return { id, status: 'APPROVED' };
}

export async function adminRejectDoctor(id: string, reason: string) {
    const u = await prisma.user.findUnique({ where: { id } });
    if (!u || u.role !== 'DOCTOR') throw new AppError('Shifokor topilmadi', 404, ErrorCodes.NOT_FOUND);
    await prisma.$transaction(async (tx: any) => {
        await tx.user.update({ where: { id }, data: { status: 'REJECTED' } });
        await tx.doctorProfile.updateMany({ where: { userId: id }, data: { rejectionReason: reason || null } });
    });
    return { id, status: 'REJECTED' };
}
