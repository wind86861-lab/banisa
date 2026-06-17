import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware';
import { AppError, ErrorCodes } from '../../utils/errors';
import { sendSuccess } from '../../utils/response';
import { appointmentService } from './appointment.service';
import prisma from '../../config/database';
import { AppointmentStatus, Prisma } from '@prisma/client';

async function resolveClinicActor(req: AuthRequest) {
    const u = await prisma.user.findUnique({
        where: { id: req.user!.id },
        select: { firstName: true, lastName: true, clinicId: true },
    });

    // Multi-clinic admins invited via the team flow only set User.clinicId
    // the first time they're added. Subsequent invites only add a
    // ClinicMembership row, so without this fallback their list would 404
    // for any clinic except the very first one.
    let clinicId = u?.clinicId
        || (req.headers['x-clinic-id'] as string | undefined)
        || (req.query?.clinicId as string | undefined);
    if (!clinicId) {
        const membership = await prisma.clinicMembership.findFirst({
            where: { userId: req.user!.id, isActive: true },
            select: { clinicId: true },
            orderBy: { joinedAt: 'asc' },
        });
        clinicId = membership?.clinicId;
    }
    if (!clinicId) throw new AppError('Klinika topilmadi', 404, ErrorCodes.NOT_FOUND);
    return {
        clinicId,
        actor: {
            userId: req.user!.id,
            role: 'CLINIC' as const,
            name: [u?.firstName, u?.lastName].filter(Boolean).join(' ') || undefined,
        },
    };
}

export const clinicAppointmentController = {
    list: async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const { clinicId } = await resolveClinicActor(req);
            const page = Math.max(1, parseInt(String(req.query.page ?? '1')));
            const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? '20'))));
            const skip = (page - 1) * limit;
            const statusParam = String(req.query.status ?? 'ALL');
            const search = String(req.query.search ?? '');

            const where: Prisma.AppointmentWhereInput = { clinicId };
            // Stale bookmarks / cached URLs from before the 13→7 status
            // reduction can still carry old enum values (SENT_TO_CLINIC,
            // PENDING_ARRIVAL, …). Validate against the live enum and just
            // ignore anything unknown — preferable to letting Prisma throw
            // a 500 that the SPA renders as a generic "400" toast.
            if (statusParam && statusParam !== 'ALL') {
                const validStatuses = Object.values(AppointmentStatus) as string[];
                if (validStatuses.includes(statusParam)) {
                    where.status = statusParam as AppointmentStatus;
                }
            }
            if (search) {
                where.OR = [
                    { bookingNumber: { contains: search, mode: 'insensitive' } },
                    { patient: { firstName: { contains: search, mode: 'insensitive' } } },
                    { patient: { lastName: { contains: search, mode: 'insensitive' } } },
                    { patient: { phone: { contains: search } } },
                ];
            }

            const [items, total] = await Promise.all([
                prisma.appointment.findMany({
                    where,
                    // Newest first — without this, the page was sorted by
                    // scheduledAt asc and a freshly-created booking with a
                    // future scheduledAt dropped to the bottom (past
                    // NO_SHOW rows hogged page 1).
                    orderBy: [{ createdAt: 'desc' }],
                    skip,
                    take: limit,
                    include: {
                        patient: { select: { id: true, firstName: true, lastName: true, phone: true } },
                        diagnosticService: { select: { id: true, nameUz: true } },
                        surgicalService: { select: { id: true, nameUz: true } },
                    },
                }),
                prisma.appointment.count({ where }),
            ]);
            sendSuccess(res, items, {
                total, page, limit, totalPages: Math.ceil(total / limit),
            });
        } catch (err) {
            next(err);
        }
    },

    getById: async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const { clinicId } = await resolveClinicActor(req);
            const appt = await appointmentService.findByIdForClinic(String(req.params.id), clinicId);
            if (!appt) throw new AppError('Bron topilmadi', 404, ErrorCodes.NOT_FOUND);
            sendSuccess(res, appt);
        } catch (err) {
            next(err);
        }
    },

    // Real-time cashier queue: AWAITING_CASH (CHECKED_IN + UNPAID + CASH).
    cashierQueue: async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const { clinicId } = await resolveClinicActor(req);
            const items = await prisma.appointment.findMany({
                where: {
                    clinicId,
                    status: 'CHECKED_IN',
                    paymentStatus: 'UNPAID',
                    paymentMethod: 'CASH',
                },
                orderBy: { checkedInAt: 'asc' },
                include: {
                    patient: { select: { id: true, firstName: true, lastName: true, phone: true } },
                    diagnosticService: { select: { id: true, nameUz: true } },
                    surgicalService: { select: { id: true, nameUz: true } },
                },
            });
            sendSuccess(res, items, { total: items.length });
        } catch (err) {
            next(err);
        }
    },

    accept: async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const { clinicId, actor } = await resolveClinicActor(req);
            const appt = await appointmentService.clinicAccept(
                actor, clinicId, String(req.params.id), req.body?.notes
            );
            sendSuccess(res, appt, null, 'Bron qabul qilindi');
        } catch (err) {
            next(err);
        }
    },

    reschedule: async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const { clinicId, actor } = await resolveClinicActor(req);
            const appt = await appointmentService.clinicReschedule(
                actor, clinicId, String(req.params.id), req.body.scheduledAt, req.body.reason
            );
            sendSuccess(res, appt, null, 'Vaqt o\'zgartirish taklif qilindi');
        } catch (err) {
            next(err);
        }
    },

    start: async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const { clinicId, actor } = await resolveClinicActor(req);
            const appt = await appointmentService.clinicStart(actor, clinicId, String(req.params.id));
            sendSuccess(res, appt, null, 'Xizmat boshlandi');
        } catch (err) {
            next(err);
        }
    },

    complete: async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const { clinicId, actor } = await resolveClinicActor(req);
            const appt = await appointmentService.clinicComplete(
                actor, clinicId, String(req.params.id), req.body
            );
            sendSuccess(res, appt, null, 'Xizmat tugadi');
        } catch (err) {
            next(err);
        }
    },

    noShow: async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const { clinicId, actor } = await resolveClinicActor(req);
            const appt = await appointmentService.markNoShow(actor, String(req.params.id), clinicId);
            sendSuccess(res, appt, null, 'NO_SHOW deb belgilandi');
        } catch (err) {
            next(err);
        }
    },

    confirmCash: async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const { clinicId, actor } = await resolveClinicActor(req);
            const appt = await appointmentService.clinicConfirmCash(
                actor, clinicId, String(req.params.id), req.body
            );
            sendSuccess(res, appt, null, 'Naqd to\'lov tasdiqlandi');
        } catch (err) {
            next(err);
        }
    },

    /**
     * GET /api/clinic/checkin-qr
     * Returns clinic's check-in QR URL and secret for printing
     */
    getCheckInQr: async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const { clinicId } = await resolveClinicActor(req);
            const clinic = await prisma.clinic.findUnique({
                where: { id: clinicId },
                select: { id: true, nameUz: true, checkInSecret: true },
            });
            if (!clinic) throw new AppError('Klinika topilmadi', 404, ErrorCodes.NOT_FOUND);

            // Generate secret if not yet set
            let secret = (clinic as any).checkInSecret;
            if (!secret) {
                const crypto = require('crypto');
                secret = crypto.randomBytes(16).toString('hex');
                await prisma.clinic.update({ where: { id: clinicId }, data: { checkInSecret: secret } as any });
            }

            const baseUrl = process.env.FRONTEND_URL || 'https://banisa.uz';
            const qrUrl = `${baseUrl}/checkin/${secret}`;

            sendSuccess(res, { clinicId, clinicName: clinic.nameUz, secret, qrUrl });
        } catch (err) {
            next(err);
        }
    },
};
