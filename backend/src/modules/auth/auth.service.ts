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

export const login = async (credentials: {
    phone?: string;
    email?: string;
    password: string;
    loginType: 'SUPER_ADMIN' | 'CLINIC_ADMIN' | 'PATIENT';
}) => {
    let user: any = null;

    if (credentials.loginType === 'SUPER_ADMIN') {
        // SUPER_ADMIN logs in with EMAIL
        if (!credentials.email) {
            throw new AppError('Email kiritilmagan', 400, ErrorCodes.VALIDATION_ERROR);
        }
        user = await prisma.user.findFirst({
            where: { email: credentials.email, role: 'SUPER_ADMIN', isActive: true },
        });
    } else {
        // CLINIC_ADMIN / PATIENT login with PHONE
        if (!credentials.phone) {
            throw new AppError('Telefon raqam kiritilmagan', 400, ErrorCodes.VALIDATION_ERROR);
        }
        const normalizedPhone = normalizePhone(credentials.phone);
        user = await prisma.user.findFirst({
            where: {
                OR: [{ phone: normalizedPhone }, { phone: credentials.phone }],
                isActive: true,
                role: credentials.loginType === 'PATIENT'
                    ? 'PATIENT'
                    : { in: ['CLINIC_ADMIN', 'PENDING_CLINIC'] },
            },
        });
    }

    if (!user || !user.isActive) {
        throw new AppError('Login yoki parol noto\'g\'ri', 401, ErrorCodes.UNAUTHORIZED);
    }

    const isPasswordValid = await bcrypt.compare(credentials.password, user.passwordHash);
    if (!isPasswordValid) {
        throw new AppError('Login yoki parol noto\'g\'ri', 401, ErrorCodes.UNAUTHORIZED);
    }

    // Strict cross-login guards
    if (credentials.loginType === 'SUPER_ADMIN' && user.role !== 'SUPER_ADMIN') {
        throw new AppError('Bu endpoint faqat Super Admin uchun', 403, ErrorCodes.FORBIDDEN);
    }
    if (credentials.loginType === 'CLINIC_ADMIN' && user.role === 'SUPER_ADMIN') {
        throw new AppError('Admin hisobi uchun /admin/login sahifasidan foydalaning', 403, ErrorCodes.FORBIDDEN);
    }
    if (credentials.loginType === 'CLINIC_ADMIN' && user.role === 'PATIENT') {
        throw new AppError('Bu login klinikalar uchun', 403, ErrorCodes.FORBIDDEN);
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

    // SECURITY: Patient tokens must not be refreshed via clinic/admin endpoint
    if (user.role === 'PATIENT') {
        throw new AppError('Invalid refresh token for this endpoint', 403, ErrorCodes.FORBIDDEN);
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
