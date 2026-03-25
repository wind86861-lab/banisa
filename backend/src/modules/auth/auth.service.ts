import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../../config/database';
import { AppError, ErrorCodes } from '../../utils/errors';
import { env } from '../../config/env';

// Normalize phone: remove spaces, dashes, parentheses
const normalizePhone = (phone: string): string => {
    return phone.replace(/[\s\-()]/g, '');
};

// VULN-06: increased from 10 to 12 — meaningfully slower for attackers
const BCRYPT_ROUNDS = 12;

// VULN-03: separate secrets + short-lived access token
export const generateAccessToken = (payload: { id: string; role: string; status: string }): string =>
    jwt.sign(payload, env.JWT_ACCESS_SECRET as jwt.Secret, { expiresIn: env.NODE_ENV === 'production' ? '15m' : '1h' } as jwt.SignOptions);

export const generateRefreshToken = (payload: { id: string }): string =>
    jwt.sign(payload, env.JWT_REFRESH_SECRET as jwt.Secret, { expiresIn: '7d' } as jwt.SignOptions);

export const register = async (userData: any) => {
    const existingUser = await prisma.user.findUnique({
        where: { phone: userData.phone },
    });

    if (existingUser) {
        throw new AppError('Phone number already registered', 400, ErrorCodes.DUPLICATE_ERROR);
    }

    const hashedPassword = await bcrypt.hash(userData.password, BCRYPT_ROUNDS);

    const user = await prisma.user.create({
        data: {
            phone: userData.phone,
            email: userData.email,
            passwordHash: hashedPassword,
            firstName: userData.firstName,
            lastName: userData.lastName,
            role: userData.role || 'PATIENT',
            status: userData.status || 'PENDING',
        },
        select: { id: true, phone: true, email: true, firstName: true, lastName: true, role: true, status: true },
    });

    return user;
};

export const login = async (credentials: { phone: string; password: string; isAdminLogin?: boolean }) => {
    const normalizedPhone = normalizePhone(credentials.phone);

    // Try exact match first, then normalized match
    let user: any = await prisma.user.findUnique({ where: { phone: normalizedPhone } });
    if (!user) {
        user = await prisma.user.findUnique({ where: { phone: credentials.phone } });
    }
    if (!user) {
        // Fallback: find by normalized phone across all users
        const allUsers = await prisma.user.findMany({
            where: { isActive: true },
            select: { id: true, phone: true, passwordHash: true, role: true, status: true, isActive: true, email: true, firstName: true, lastName: true, clinicId: true },
        });
        user = allUsers.find(u => normalizePhone(u.phone) === normalizedPhone);
    }

    if (!user || !user.isActive) {
        throw new AppError('Login yoki parol noto\'g\'ri', 401, ErrorCodes.UNAUTHORIZED);
    }

    const isPasswordValid = await bcrypt.compare(credentials.password, user.passwordHash);
    if (!isPasswordValid) {
        throw new AppError('Login yoki parol noto\'g\'ri', 401, ErrorCodes.UNAUTHORIZED);
    }

    // Role-based cross-login protection
    if (credentials.isAdminLogin && user.role !== 'SUPER_ADMIN') {
        throw new AppError('Bu endpoint faqat Super Admin uchun', 403, ErrorCodes.FORBIDDEN);
    }
    if (!credentials.isAdminLogin && user.role === 'SUPER_ADMIN') {
        throw new AppError('Admin hisobi uchun /admin/login sahifasidan foydalaning', 403, ErrorCodes.FORBIDDEN);
    }

    const accessToken = generateAccessToken({ id: user.id, role: user.role, status: user.status });
    const refreshToken = generateRefreshToken({ id: user.id });

    return {
        user: {
            id: user.id,
            phone: user.phone,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            status: user.status,
            clinicId: user.clinicId,
        },
        accessToken,
        refreshToken,
    };
};

export const refreshAccessToken = async (token: string) => {
    let payload: { id: string };
    try {
        payload = jwt.verify(token, env.JWT_REFRESH_SECRET as jwt.Secret) as { id: string };
    } catch {
        throw new AppError('Invalid or expired refresh token', 401, ErrorCodes.UNAUTHORIZED);
    }

    const user = await prisma.user.findUnique({
        where: { id: payload.id },
        select: {
            id: true,
            phone: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            status: true,
            isActive: true,
            clinicId: true,
        },
    });
    if (!user || !user.isActive) {
        throw new AppError('User not found or inactive', 401, ErrorCodes.UNAUTHORIZED);
    }

    const newAccessToken = generateAccessToken({ id: user.id, role: user.role, status: user.status });
    const newRefreshToken = generateRefreshToken({ id: user.id }); // rotate

    return {
        newAccessToken,
        newRefreshToken,
        user: {
            id: user.id,
            phone: user.phone,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            status: user.status,
            clinicId: user.clinicId,
        },
    };
};

export const getMe = async (userId: string) => {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, firstName: true, lastName: true, role: true },
    });

    if (!user) throw new AppError('User not found', 404, ErrorCodes.NOT_FOUND);
    return user;
};
