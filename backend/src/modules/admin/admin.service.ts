import prisma from '../../config/database';
import { AppError, ErrorCodes } from '../../utils/errors';
import bcrypt from 'bcrypt';

export const getProfile = async (userId: string) => {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
        },
    });

    if (!user) {
        throw new AppError('Admin not found', 404, ErrorCodes.NOT_FOUND);
    }
    // Mocking phone as it's not in the db schema yet, but UI expects it
    return { ...user, phone: '+998901234567' };
};

export const updateProfile = async (userId: string, data: { firstName: string; lastName: string; email: string; phone?: string }) => {
    const user = await prisma.user.update({
        where: { id: userId },
        data: {
            firstName: data.firstName,
            lastName: data.lastName,
            email: data.email,
        },
        select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
        },
    });

    return { ...user, phone: data.phone || '+998901234567' };
};

export const updatePassword = async (userId: string, currentPassword: string, newPassword: string) => {
    const user = await prisma.user.findUnique({
        where: { id: userId },
    });

    if (!user) {
        throw new AppError('Admin not found', 404, ErrorCodes.NOT_FOUND);
    }

    const isPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isPasswordValid) {
        throw new AppError('Hozirgi parol noto\'g\'ri', 400, ErrorCodes.VALIDATION_ERROR);
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
        where: { id: userId },
        data: { passwordHash: hashedPassword },
    });

    return { success: true };
};

// Mocking notifications since there is no Notification model
const mockNotifications = [
    { id: 1, title: 'Yangi Bemor Ro\'yxati', message: 'Klinikaga yangi bemor ro\'yxatdan o\'tdi.', type: 'info', createdAt: new Date().toISOString(), isRead: false },
    { id: 2, title: 'Tizim xabarnomasi', message: 'Haftalik hisobot tayyor.', type: 'success', createdAt: new Date(Date.now() - 3600000).toISOString(), isRead: false },
];

export const getNotifications = async (userId: string) => {
    return mockNotifications;
};

export const markNotificationAsRead = async (userId: string, notificationId: string) => {
    return { success: true };
};

export const markAllNotificationsAsRead = async (userId: string) => {
    return { success: true };
};
