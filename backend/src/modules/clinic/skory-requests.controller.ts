import { Response } from 'express';
import prisma from '../../config/database';
import { AuthRequest } from '../../middleware/auth.middleware';

async function resolveClinicId(userId: string): Promise<string | null> {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { clinicId: true } });
    return user?.clinicId ?? null;
}

const STATUS_VALUES = ['PENDING', 'DISPATCHED', 'ON_ROUTE', 'ARRIVED', 'COMPLETED', 'CANCELLED'] as const;
type Status = typeof STATUS_VALUES[number];

/**
 * GET /api/clinic/skory-requests?status=&from=&to=&limit=
 *
 * Lists ambulance requests handled by this clinic's ambulances. PENDING
 * rows are only shown if at least one fanout offer went to one of this
 * clinic's ambulances (so the dashboard can show "currently being offered").
 */
export const listSkoryRequests = async (req: AuthRequest, res: Response) => {
    const clinicId = await resolveClinicId(req.user!.id);
    if (!clinicId) return res.status(404).json({ success: false, message: 'Klinika topilmadi' });

    const status = String(req.query.status || '').toUpperCase() as Status | '';
    const from = req.query.from ? new Date(String(req.query.from)) : null;
    const to = req.query.to ? new Date(String(req.query.to)) : null;
    const limit = Math.min(200, Math.max(1, parseInt(String(req.query.limit || '50'), 10) || 50));

    const dateFilter: any = {};
    if (from && !isNaN(from.getTime())) dateFilter.gte = from;
    if (to && !isNaN(to.getTime())) dateFilter.lte = to;

    const where: any = {
        OR: [
            { acceptedAmbulance: { clinicId } },
            { offers: { some: { ambulance: { clinicId } } } },
        ],
    };
    if (status && (STATUS_VALUES as readonly string[]).includes(status)) where.status = status;
    if (Object.keys(dateFilter).length > 0) where.createdAt = dateFilter;

    const items = await prisma.ambulanceRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: {
            patient: { select: { firstName: true, lastName: true, phone: true } },
            acceptedAmbulance: { select: { id: true, callSign: true, vehicleModel: true, clinicId: true } },
            destClinic: { select: { id: true, nameUz: true } },
            offers: {
                where: { ambulance: { clinicId } },
                select: { id: true, ambulanceId: true, status: true, sentAt: true, respondedAt: true, ambulance: { select: { callSign: true } } },
            },
            _count: { select: { offers: true } },
        },
    });

    return res.json({ success: true, data: { items } });
};

/**
 * GET /api/clinic/skory-requests/:id
 */
export const getSkoryRequest = async (req: AuthRequest, res: Response) => {
    const clinicId = await resolveClinicId(req.user!.id);
    if (!clinicId) return res.status(404).json({ success: false, message: 'Klinika topilmadi' });

    const id = String(req.params.id || '');
    const req2 = await prisma.ambulanceRequest.findFirst({
        where: {
            id,
            OR: [
                { acceptedAmbulance: { clinicId } },
                { offers: { some: { ambulance: { clinicId } } } },
            ],
        },
        include: {
            patient: { select: { firstName: true, lastName: true, phone: true } },
            acceptedAmbulance: { include: { clinic: { select: { nameUz: true } } } },
            destClinic: { select: { nameUz: true } },
            offers: {
                include: { ambulance: { select: { id: true, callSign: true, clinicId: true } } },
                orderBy: { sentAt: 'asc' },
            },
            review: true,
        },
    });
    if (!req2) return res.status(404).json({ success: false, message: 'Topilmadi' });
    return res.json({ success: true, data: req2 });
};

/**
 * GET /api/clinic/skory-requests/stats
 * Lightweight aggregate for the page header.
 */
export const getSkoryStats = async (req: AuthRequest, res: Response) => {
    const clinicId = await resolveClinicId(req.user!.id);
    if (!clinicId) return res.status(404).json({ success: false, message: 'Klinika topilmadi' });

    const fromIso = new Date();
    fromIso.setDate(fromIso.getDate() - 30);

    const where = { acceptedAmbulance: { clinicId }, createdAt: { gte: fromIso } };
    const [total, completed, cancelled, dispatched] = await Promise.all([
        prisma.ambulanceRequest.count({ where }),
        prisma.ambulanceRequest.count({ where: { ...where, status: 'COMPLETED' } }),
        prisma.ambulanceRequest.count({ where: { ...where, status: 'CANCELLED' } }),
        prisma.ambulanceRequest.count({
            where: {
                acceptedAmbulance: { clinicId },
                status: { in: ['DISPATCHED', 'ON_ROUTE', 'ARRIVED'] },
            },
        }),
    ]);
    // Average rating across this clinic's ambulances (all-time, capped to last 90 days).
    const ninetyAgo = new Date(); ninetyAgo.setDate(ninetyAgo.getDate() - 90);
    const ratingAgg = await prisma.ambulanceReview.aggregate({
        where: { clinicId, createdAt: { gte: ninetyAgo } },
        _avg: { rating: true },
        _count: { rating: true },
    });

    return res.json({
        success: true,
        data: {
            last30Days: { total, completed, cancelled },
            activeNow: dispatched,
            rating: {
                avg: ratingAgg._avg.rating != null ? Number(ratingAgg._avg.rating.toFixed(2)) : null,
                count: ratingAgg._count.rating,
            },
        },
    });
};
