import bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import jwt from 'jsonwebtoken';
import prisma from '../../config/database';
import { env } from '../../config/env';
import { verifyInitData } from '../telegram/miniapp.auth';
import { AppError, ErrorCodes } from '../../utils/errors';
import { dispatch as dispatchNotification } from '../notifications/notification.dispatcher';
import { priceClinicService } from '../cart/cart.service';

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

// ─── Recommendations (approved doctor) ───────────────────────────────────────

/** Find a bot-bound PATIENT by phone (tolerant to formatting). */
export async function lookupPatient(phone: string) {
    const clean = String(phone || '').replace(/\s+/g, '');
    const last9 = clean.replace(/\D/g, '').slice(-9);
    if (last9.length < 7) return { found: false };
    const user: any = await prisma.user.findFirst({
        where: { role: 'PATIENT', OR: [{ phone: clean }, { phone: { endsWith: last9 } }] },
        include: { telegramAccount: true } as any,
    });
    if (!user || !user.telegramAccount) return { found: false };
    return {
        found: true,
        patientId: user.id,
        name: [user.firstName, user.lastName].filter(Boolean).join(' ') || null,
        phone: user.phone,
    };
}

const VALID_TYPES = new Set(['DIAGNOSTIC', 'SURGICAL', 'SANATORIUM', 'CHECKUP']);

export interface RecommendationInput {
    patientPhone: string;
    clinicId: string;
    note?: string;
    items: Array<{ serviceType: string; serviceId: string; name?: string; price?: number; quantity?: number }>;
}

export async function createRecommendation(doctorId: string, input: RecommendationInput) {
    const doctor = await prisma.user.findUnique({ where: { id: doctorId } });
    if (!doctor || doctor.role !== 'DOCTOR') throw new AppError('Shifokor topilmadi', 404, ErrorCodes.NOT_FOUND);
    if (doctor.status !== 'APPROVED') throw new AppError('Avval admin arizangizni tasdiqlashi kerak', 403, ErrorCodes.FORBIDDEN);

    const lk = await lookupPatient(input.patientPhone);
    if (!lk.found) throw new AppError('Bu raqam bilan bemor botda topilmadi', 404, ErrorCodes.NOT_FOUND);

    const clinic = await prisma.clinic.findUnique({ where: { id: input.clinicId } });
    if (!clinic) throw new AppError('Klinika topilmadi', 404, ErrorCodes.NOT_FOUND);

    const rawItems = (input.items || []).filter(i => i && i.serviceId && VALID_TYPES.has(i.serviceType));
    if (!rawItems.length) throw new AppError('Kamida bitta xizmat qo\'shing', 400, ErrorCodes.VALIDATION_ERROR);

    // Server-side validation + re-pricing: never trust the client's price, and
    // reject any service the clinic doesn't actually offer. Without this a stale
    // or tampered client could store a dangling serviceId that silently vanishes
    // at checkout (leaving the patient with an empty 0-som booking) or a fake
    // price that misleads the patient on the review screen. Deduplicate on
    // (type:id) so quantities merge instead of creating duplicate lines.
    const merged = new Map<string, { serviceType: string; serviceId: string; quantity: number }>();
    for (const i of rawItems) {
        const key = `${i.serviceType}:${i.serviceId}`;
        const qty = Math.max(1, Math.min(20, Math.floor(Number(i.quantity) || 1)));
        const ex = merged.get(key);
        if (ex) ex.quantity += qty;
        else merged.set(key, { serviceType: i.serviceType, serviceId: String(i.serviceId), quantity: qty });
    }

    const priced = await Promise.all(
        [...merged.values()].map(async (i) => {
            const p = await priceClinicService(clinic.id, i.serviceType as any, i.serviceId);
            return p ? { ...i, name: p.name, price: p.price } : null;
        }),
    );
    const items = priced.filter((x): x is NonNullable<typeof x> => x !== null);
    if (!items.length) throw new AppError('Tanlangan xizmatlar bu klinikada mavjud emas', 400, ErrorCodes.VALIDATION_ERROR);

    const total = items.reduce((s, i) => s + i.price * i.quantity, 0);
    const expiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

    const rec = await prisma.$transaction(async (tx: any) => {
        const r = await tx.recommendation.create({
            data: {
                doctorId, patientId: lk.patientId!, clinicId: clinic.id,
                status: 'PENDING', totalAmount: total, note: input.note || null, expiresAt,
            },
        });
        await tx.recommendationItem.createMany({
            data: items.map(i => ({
                recommendationId: r.id,
                serviceType: i.serviceType as any,
                serviceId: i.serviceId,
                nameSnapshot: i.name,
                priceSnapshot: i.price,
                quantity: i.quantity,
            })),
        });
        return r;
    });

    // Notify the patient (in-app + bot). Best-effort — never block creation.
    try {
        await dispatchNotification({
            type: 'recommendation_received',
            userId: lk.patientId!,
            recommendationId: rec.id,
            doctorName: [doctor.firstName, doctor.lastName].filter(Boolean).join(' ') || 'Shifokor',
            clinicName: clinic.nameUz,
            itemCount: items.length,
            total,
            link: `/user/recommendation/${rec.id}`,
            priority: 'HIGH',
        } as any);
    } catch (e) {
        console.error('[recommendation] notify failed', e);
    }

    return { id: rec.id, status: rec.status, totalAmount: total, expiresAt, patientName: lk.name };
}

export async function listMyRecommendations(doctorId: string) {
    const rows: any[] = await (prisma as any).recommendation.findMany({
        where: { doctorId },
        orderBy: { createdAt: 'desc' },
        include: {
            clinic: { select: { nameUz: true } },
            patient: { select: { firstName: true, lastName: true, phone: true } },
            items: { select: { id: true } },
        },
    });
    return rows.map(r => ({
        id: r.id, status: r.status, total: r.totalAmount,
        createdAt: r.createdAt, expiresAt: r.expiresAt,
        clinicName: r.clinic?.nameUz ?? null,
        patientName: [r.patient?.firstName, r.patient?.lastName].filter(Boolean).join(' ') || r.patient?.phone || '—',
        itemCount: r.items.length,
    }));
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
