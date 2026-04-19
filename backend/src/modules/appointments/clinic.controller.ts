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
    if (!u?.clinicId) throw new AppError('Klinika topilmadi', 404, ErrorCodes.NOT_FOUND);
    return {
        clinicId: u.clinicId,
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
            if (statusParam && statusParam !== 'ALL') {
                where.status = statusParam as AppointmentStatus;
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
                    orderBy: { scheduledAt: 'asc' },
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

    scan: async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const { clinicId, actor } = await resolveClinicActor(req);
            let token: string = req.body?.qrToken ?? '';
            // Accept JSON-encoded payload from QR (produced by patient QR): { t, b }
            if (token.startsWith('{')) {
                try {
                    const parsed = JSON.parse(token);
                    if (typeof parsed?.t === 'string') token = parsed.t;
                } catch { /* noop */ }
            }
            if (!token) throw new AppError('QR kod noto\'g\'ri', 400, ErrorCodes.VALIDATION_ERROR);
            const appt = await appointmentService.clinicScanQr(actor, clinicId, token);
            sendSuccess(res, appt, null, 'Bemor ro\'yxatga olindi');
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
};
