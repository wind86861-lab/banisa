import prisma from '../../config/database';

export type NotifyType =
    | 'CHECK_IN'
    | 'PAYMENT_RECEIVED'
    | 'NEW_BOOKING'
    | 'GENERAL';

interface NotifyClinicParams {
    clinicId: string;
    type: NotifyType;
    title: string;
    body: string;
    data?: Record<string, any>;
    link?: string;
    priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
}

/**
 * Create a notification row for every active CLINIC_ADMIN of the clinic.
 * One row per recipient so each admin can mark-as-read independently.
 */
export async function notifyClinicAdmins(params: NotifyClinicParams) {
    const { clinicId, type, title, body, data, link, priority = 'NORMAL' } = params;

    const admins = await prisma.user.findMany({
        where: {
            clinicId,
            role: { in: ['CLINIC_ADMIN', 'PENDING_CLINIC'] },
            isActive: true,
        },
        select: { id: true },
    });

    if (admins.length === 0) {
        // still record one clinic-scoped row so it can be retrieved by clinicId fallback
        await (prisma as any).notification.create({
            data: {
                recipientClinicId: clinicId,
                type,
                title,
                body,
                data: data || undefined,
                link,
                priority,
            },
        });
        return;
    }

    await (prisma as any).notification.createMany({
        data: admins.map((a) => ({
            recipientUserId: a.id,
            recipientClinicId: clinicId,
            type,
            title,
            body,
            data: data || undefined,
            link,
            priority,
        })),
    });
}

interface NotifyUserParams {
    userId: string;
    type: NotifyType;
    title: string;
    body: string;
    data?: Record<string, any>;
    link?: string;
    priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
}

/** Create a single notification row for one user. */
export async function notifyUser(params: NotifyUserParams) {
    const { userId, type, title, body, data, link, priority = 'NORMAL' } = params;
    await (prisma as any).notification.create({
        data: {
            recipientUserId: userId,
            type,
            title,
            body,
            data: data || undefined,
            link,
            priority,
        },
    });
}

interface ListParams {
    userId: string;
    unreadOnly?: boolean;
    limit?: number;
    cursor?: string;
}

export async function listForUser(params: ListParams) {
    const limit = Math.min(50, Math.max(1, params.limit ?? 20));
    const where: any = { recipientUserId: params.userId };
    if (params.unreadOnly) where.isRead = false;

    const items = await (prisma as any).notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit + 1,
        ...(params.cursor ? { cursor: { id: params.cursor }, skip: 1 } : {}),
    });

    let nextCursor: string | null = null;
    if (items.length > limit) {
        nextCursor = items[limit].id;
        items.length = limit;
    }
    return { items, nextCursor };
}

export async function unreadCountForUser(userId: string) {
    const [count, latest] = await Promise.all([
        (prisma as any).notification.count({
            where: { recipientUserId: userId, isRead: false },
        }),
        (prisma as any).notification.findFirst({
            where: { recipientUserId: userId },
            orderBy: { createdAt: 'desc' },
            select: { createdAt: true },
        }),
    ]);
    return {
        count,
        latestAt: latest?.createdAt?.toISOString() || null,
    };
}

export async function markRead(userId: string, notificationId: string) {
    return (prisma as any).notification.updateMany({
        where: { id: notificationId, recipientUserId: userId },
        data: { isRead: true, readAt: new Date() },
    });
}

export async function markAllRead(userId: string) {
    return (prisma as any).notification.updateMany({
        where: { recipientUserId: userId, isRead: false },
        data: { isRead: true, readAt: new Date() },
    });
}
