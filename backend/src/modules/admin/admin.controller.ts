import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware';
import { sendSuccess } from '../../utils/response';
import * as adminService from './admin.service';
import prisma from '../../config/database';

/**
 * GET /api/admin/users
 *
 * Patient-focused user list for the super-admin panel. Returns every User
 * with their TelegramAccount link (if any) so the admin can tell at a glance
 * which patients came in through the bot vs the web sign-up form, plus the
 * Telegram username/last-seen needed for direct outreach.
 *
 * Query params:
 *   q           free-text on phone / first / last / username
 *   role        filter by role (default PATIENT)
 *   source      'telegram' | 'web' (presence of TelegramAccount)
 *   page,limit  pagination (defaults 1, 50)
 */
export const listUsers = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const q = String(req.query.q || '').trim();
        const role = req.query.role ? String(req.query.role) : 'PATIENT';
        const source = req.query.source ? String(req.query.source) : null;
        const page = Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1);
        const limit = Math.min(200, Math.max(1, parseInt(String(req.query.limit || '50'), 10) || 50));

        const where: any = {};
        if (role && role !== 'ALL') where.role = role;
        if (source === 'telegram') where.telegramAccount = { isNot: null };
        if (source === 'web') where.telegramAccount = { is: null };
        if (q) {
            where.OR = [
                { phone: { contains: q, mode: 'insensitive' } },
                { firstName: { contains: q, mode: 'insensitive' } },
                { lastName: { contains: q, mode: 'insensitive' } },
                { email: { contains: q, mode: 'insensitive' } },
                { telegramAccount: { username: { contains: q, mode: 'insensitive' } } },
            ];
        }

        const [items, total, telegramCount, webCount] = await Promise.all([
            prisma.user.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
                select: {
                    id: true,
                    phone: true,
                    email: true,
                    firstName: true,
                    lastName: true,
                    role: true,
                    isActive: true,
                    createdAt: true,
                    telegramAccount: {
                        select: {
                            telegramUserId: true,
                            chatId: true,
                            username: true,
                            firstName: true,
                            language: true,
                            linkedAt: true,
                            lastSeenAt: true,
                            isBlocked: true,
                        },
                    },
                },
            }),
            prisma.user.count({ where }),
            prisma.user.count({ where: { ...where, telegramAccount: { isNot: null } } }),
            prisma.user.count({ where: { ...where, telegramAccount: { is: null } } }),
        ]);

        sendSuccess(res, {
            items: items.map((u) => ({
                id: u.id,
                phone: u.phone,
                email: u.email,
                firstName: u.firstName,
                lastName: u.lastName,
                role: u.role,
                isActive: u.isActive,
                createdAt: u.createdAt,
                source: u.telegramAccount ? 'telegram' : 'web',
                telegram: u.telegramAccount
                    ? {
                          telegramUserId: u.telegramAccount.telegramUserId?.toString() ?? null,
                          chatId: u.telegramAccount.chatId?.toString() ?? null,
                          username: u.telegramAccount.username,
                          firstName: u.telegramAccount.firstName,
                          language: u.telegramAccount.language,
                          linkedAt: u.telegramAccount.linkedAt,
                          lastSeenAt: u.telegramAccount.lastSeenAt,
                          isBlocked: u.telegramAccount.isBlocked,
                      }
                    : null,
            })),
            meta: {
                total,
                page,
                limit,
                pages: Math.ceil(total / limit),
                telegramCount,
                webCount,
            },
        });
    } catch (error) {
        next(error);
    }
};

export const getProfile = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const profile = await adminService.getProfile(userId);
        sendSuccess(res, profile);
    } catch (error) {
        next(error);
    }
};

export const updateProfile = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const profile = await adminService.updateProfile(userId, req.body);
        sendSuccess(res, profile);
    } catch (error) {
        next(error);
    }
};

export const updatePassword = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const { currentPassword, newPassword } = req.body;
        const result = await adminService.updatePassword(userId, currentPassword, newPassword);
        sendSuccess(res, result);
    } catch (error) {
        next(error);
    }
};

export const getNotifications = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const notifications = await adminService.getNotifications(userId);
        sendSuccess(res, notifications);
    } catch (error) {
        next(error);
    }
};

export const markNotificationAsRead = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const id = req.params.id as string;
        const result = await adminService.markNotificationAsRead(userId, id);
        sendSuccess(res, result);
    } catch (error) {
        next(error);
    }
};

export const markAllNotificationsAsRead = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const result = await adminService.markAllNotificationsAsRead(req.user!.id);
        sendSuccess(res, result);
    } catch (error) {
        next(error);
    }
};

export const getDashboardStats = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const stats = await adminService.getDashboardStats();
        sendSuccess(res, stats);
    } catch (error) {
        next(error);
    }
};
