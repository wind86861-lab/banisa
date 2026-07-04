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

        // Per-user booking stats for just this page's users (cheap groupBy on
        // the indexed patientId column). Gives the admin an at-a-glance
        // "how active is this patient" without a per-row query.
        const pageIds = items.map((u) => u.id);
        const [apptGroups, apptLastRows, skoryGroups] = pageIds.length
            ? await Promise.all([
                  prisma.appointment.groupBy({
                      by: ['patientId'],
                      where: { patientId: { in: pageIds } },
                      _count: { _all: true },
                  }),
                  prisma.appointment.findMany({
                      where: { patientId: { in: pageIds } },
                      distinct: ['patientId'],
                      orderBy: [{ patientId: 'asc' }, { createdAt: 'desc' }],
                      select: { patientId: true, createdAt: true },
                  }),
                  prisma.ambulanceRequest.groupBy({
                      by: ['patientId'],
                      where: { patientId: { in: pageIds } },
                      _count: { _all: true },
                  }),
              ])
            : [[], [], []];

        const apptCountMap = new Map(apptGroups.map((g) => [g.patientId, g._count._all]));
        const apptLastMap = new Map(apptLastRows.map((r) => [r.patientId, r.createdAt]));
        const skoryCountMap = new Map(skoryGroups.map((g) => [g.patientId, g._count._all]));

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
                orderCount: apptCountMap.get(u.id) ?? 0,
                skoryCount: skoryCountMap.get(u.id) ?? 0,
                lastOrderAt: apptLastMap.get(u.id) ?? null,
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

/**
 * GET /api/admin/users/:id
 *
 * Full patient dossier for the super-admin panel: identity + telegram link,
 * lifetime booking stats (count, status breakdown, total paid), the distinct
 * clinics they've visited, and their most recent appointments + ambulance
 * requests. Read-only aggregation — touches no data.
 */
export const getUserDetail = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const id = String(req.params.id);

        const user = await prisma.user.findUnique({
            where: { id },
            select: {
                id: true,
                phone: true,
                email: true,
                firstName: true,
                lastName: true,
                role: true,
                status: true,
                isActive: true,
                createdAt: true,
                updatedAt: true,
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
        });

        if (!user) {
            return res.status(404).json({ success: false, message: 'Foydalanuvchi topilmadi' });
        }

        const [statusGroups, paidAgg, clinicGroups, recentAppointments, skoryTotal, recentSkory] =
            await Promise.all([
                prisma.appointment.groupBy({
                    by: ['status'],
                    where: { patientId: id },
                    _count: { _all: true },
                }),
                prisma.appointment.aggregate({
                    where: { patientId: id },
                    _sum: { paidAmount: true, finalPrice: true },
                    _count: { _all: true },
                }),
                prisma.appointment.groupBy({
                    by: ['clinicId'],
                    where: { patientId: id },
                    _count: { _all: true },
                    _max: { createdAt: true },
                }),
                prisma.appointment.findMany({
                    where: { patientId: id },
                    orderBy: { createdAt: 'desc' },
                    take: 20,
                    select: {
                        id: true,
                        bookingNumber: true,
                        serviceType: true,
                        status: true,
                        paymentStatus: true,
                        scheduledAt: true,
                        createdAt: true,
                        finalPrice: true,
                        paidAmount: true,
                        clinic: { select: { id: true, nameUz: true } },
                        doctor: { select: { firstName: true, lastName: true } },
                    },
                }),
                prisma.ambulanceRequest.count({ where: { patientId: id } }),
                prisma.ambulanceRequest.findMany({
                    where: { patientId: id },
                    orderBy: { createdAt: 'desc' },
                    take: 10,
                    select: {
                        id: true,
                        status: true,
                        pickupAddress: true,
                        destAddress: true,
                        createdAt: true,
                        completedAt: true,
                        destClinic: { select: { nameUz: true } },
                    },
                }),
            ]);

        // Resolve clinic names for the "visited clinics" summary.
        const clinicIds = clinicGroups.map((g) => g.clinicId);
        const clinics = clinicIds.length
            ? await prisma.clinic.findMany({
                  where: { id: { in: clinicIds } },
                  select: { id: true, nameUz: true, logo: true },
              })
            : [];
        const clinicNameMap = new Map(clinics.map((c) => [c.id, c]));

        const statusBreakdown: Record<string, number> = {};
        for (const g of statusGroups) statusBreakdown[g.status] = g._count._all;

        sendSuccess(res, {
            id: user.id,
            phone: user.phone,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            status: user.status,
            isActive: user.isActive,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
            source: user.telegramAccount ? 'telegram' : 'web',
            telegram: user.telegramAccount
                ? {
                      telegramUserId: user.telegramAccount.telegramUserId?.toString() ?? null,
                      chatId: user.telegramAccount.chatId?.toString() ?? null,
                      username: user.telegramAccount.username,
                      firstName: user.telegramAccount.firstName,
                      language: user.telegramAccount.language,
                      linkedAt: user.telegramAccount.linkedAt,
                      lastSeenAt: user.telegramAccount.lastSeenAt,
                      isBlocked: user.telegramAccount.isBlocked,
                  }
                : null,
            stats: {
                orderCount: paidAgg._count._all,
                totalPaid: paidAgg._sum.paidAmount ?? 0,
                totalBilled: paidAgg._sum.finalPrice ?? 0,
                skoryCount: skoryTotal,
                statusBreakdown,
            },
            clinics: clinicGroups
                .map((g) => ({
                    id: g.clinicId,
                    name: clinicNameMap.get(g.clinicId)?.nameUz ?? '—',
                    logoUrl: clinicNameMap.get(g.clinicId)?.logo ?? null,
                    visits: g._count._all,
                    lastVisitAt: g._max.createdAt,
                }))
                .sort((a, b) => b.visits - a.visits),
            recentAppointments: recentAppointments.map((a) => ({
                id: a.id,
                bookingNumber: a.bookingNumber,
                serviceType: a.serviceType,
                status: a.status,
                paymentStatus: a.paymentStatus,
                scheduledAt: a.scheduledAt,
                createdAt: a.createdAt,
                finalPrice: a.finalPrice,
                paidAmount: a.paidAmount,
                clinicName: a.clinic?.nameUz ?? '—',
                doctorName: a.doctor
                    ? [a.doctor.firstName, a.doctor.lastName].filter(Boolean).join(' ')
                    : null,
            })),
            recentSkory: recentSkory.map((r) => ({
                id: r.id,
                status: r.status,
                pickupAddress: r.pickupAddress,
                destAddress: r.destAddress || r.destClinic?.nameUz || null,
                createdAt: r.createdAt,
                completedAt: r.completedAt,
            })),
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
