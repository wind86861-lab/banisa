import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../../config/database';
import { AppError, ErrorCodes } from '../../utils/errors';
import { env } from '../../config/env';

const BCRYPT_ROUNDS = 12;

// Normalize phone: remove spaces, dashes, parentheses
const normalizePhone = (phone: string): string => {
    return phone.replace(/[\s\-()]/g, '');
};

// Generate tokens
const generateAccessToken = (payload: { id: string; role: string }): string =>
    jwt.sign(payload, env.JWT_ACCESS_SECRET as jwt.Secret, {
        expiresIn: env.NODE_ENV === 'production' ? '15m' : '1h'
    } as jwt.SignOptions);

const generateRefreshToken = (payload: { id: string }): string =>
    jwt.sign(payload, env.JWT_REFRESH_SECRET as jwt.Secret, { expiresIn: '7d' } as jwt.SignOptions);

// ─── USER REGISTRATION ──────────────────────────────────────────────────────
export const registerUser = async (userData: {
    phone: string;
    password: string;
    firstName: string;
    lastName: string;
    email?: string;
}) => {
    const normalizedPhone = normalizePhone(userData.phone);

    // Check if phone already exists
    const existingUser = await prisma.user.findFirst({
        where: {
            OR: [
                { phone: normalizedPhone },
                { phone: userData.phone },
            ],
        },
    });

    if (existingUser) {
        throw new AppError('Bu telefon raqam allaqachon ro\'yxatdan o\'tgan', 400, ErrorCodes.DUPLICATE_ERROR);
    }

    // Hash password
    const passwordHash = await bcrypt.hash(userData.password, BCRYPT_ROUNDS);

    // Create user with PATIENT role
    const user = await prisma.user.create({
        data: {
            phone: normalizedPhone,
            passwordHash,
            firstName: userData.firstName,
            lastName: userData.lastName,
            email: userData.email || null,
            role: 'PATIENT',
            isActive: true,
        },
        select: {
            id: true,
            phone: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            createdAt: true,
        },
    });

    return user;
};

// ─── USER LOGIN ─────────────────────────────────────────────────────────────
export const loginUser = async (credentials: { phone: string; password: string }) => {
    const normalizedPhone = normalizePhone(credentials.phone);

    // Find user by phone (try both normalized and original)
    let user = await prisma.user.findFirst({
        where: {
            OR: [
                { phone: normalizedPhone },
                { phone: credentials.phone },
            ],
            role: 'PATIENT', // Only allow PATIENT role to login via user auth
            isActive: true,
        },
        select: {
            id: true,
            phone: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            passwordHash: true,
            isActive: true,
        },
    });

    if (!user) {
        throw new AppError('Telefon raqam yoki parol noto\'g\'ri', 401, ErrorCodes.UNAUTHORIZED);
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(credentials.password, user.passwordHash);
    if (!isPasswordValid) {
        throw new AppError('Telefon raqam yoki parol noto\'g\'ri', 401, ErrorCodes.UNAUTHORIZED);
    }

    // Generate tokens
    const accessToken = generateAccessToken({ id: user.id, role: user.role });
    const refreshToken = generateRefreshToken({ id: user.id });

    return {
        user: {
            id: user.id,
            phone: user.phone,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
        },
        accessToken,
        refreshToken,
    };
};

// ─── REFRESH ACCESS TOKEN ───────────────────────────────────────────────────
export const refreshAccessToken = async (refreshToken: string) => {
    try {
        // Verify refresh token
        const decoded = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET as jwt.Secret) as { id: string };

        // Get user
        const user = await prisma.user.findUnique({
            where: { id: decoded.id, isActive: true },
            select: {
                id: true,
                role: true,
            },
        });

        if (!user) {
            throw new AppError('Foydalanuvchi topilmadi', 401, ErrorCodes.UNAUTHORIZED);
        }

        // Generate new access token
        const accessToken = generateAccessToken({ id: user.id, role: user.role });

        return { accessToken };
    } catch (error) {
        throw new AppError('Token yaroqsiz yoki muddati o\'tgan', 401, ErrorCodes.UNAUTHORIZED);
    }
};

// ─── GET USER PROFILE ───────────────────────────────────────────────────────
export const getUserProfile = async (userId: string) => {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            phone: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            createdAt: true,
        },
    });

    if (!user) {
        throw new AppError('Foydalanuvchi topilmadi', 404, ErrorCodes.NOT_FOUND);
    }

    return user;
};
