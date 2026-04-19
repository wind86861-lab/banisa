import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware';
import { AppError, ErrorCodes } from '../../utils/errors';
import { sendSuccess } from '../../utils/response';
import { appointmentService } from './appointment.service';
import prisma from '../../config/database';
import { AppointmentStatus } from '@prisma/client';

async function resolveActor(req: AuthRequest) {
    const u = await prisma.user.findUnique({
        where: { id: req.user!.id },
        select: { firstName: true, lastName: true },
    });
    return {
        userId: req.user!.id,
        role: 'OPERATOR' as const,
        name: [u?.firstName, u?.lastName].filter(Boolean).join(' ') || undefined,
    };
}

export const operatorAppointmentController = {
    list: async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const result = await appointmentService.listForAdmin({
                status: (req.query.status as AppointmentStatus | 'ALL') ?? undefined,
                clinicId: req.query.clinicId ? String(req.query.clinicId) : undefined,
                search: req.query.search ? String(req.query.search) : undefined,
                page: req.query.page ? parseInt(String(req.query.page)) : undefined,
                limit: req.query.limit ? parseInt(String(req.query.limit)) : undefined,
            });
            sendSuccess(res, result.items, result.meta);
        } catch (err) {
            next(err);
        }
    },

    getById: async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const appt = await appointmentService.findById(String(req.params.id));
            if (!appt) throw new AppError('Bron topilmadi', 404, ErrorCodes.NOT_FOUND);
            sendSuccess(res, appt);
        } catch (err) {
            next(err);
        }
    },

    confirm: async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const actor = await resolveActor(req);
            const appt = await appointmentService.operatorConfirm(
                actor,
                String(req.params.id),
                req.body
            );
            sendSuccess(res, appt, null, 'Bron tasdiqlandi');
        } catch (err) {
            next(err);
        }
    },

    cancel: async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const actor = await resolveActor(req);
            const appt = await appointmentService.operatorCancel(
                actor,
                String(req.params.id),
                req.body.reason
            );
            sendSuccess(res, appt, null, 'Bron bekor qilindi');
        } catch (err) {
            next(err);
        }
    },

    stats: async (_req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const now = new Date();
            const dayStart = new Date(now); dayStart.setHours(0, 0, 0, 0);
            const dayEnd = new Date(now); dayEnd.setHours(23, 59, 59, 999);

            const [total, pending, operatorConfirmed, completed, cancelled, todayTotal] =
                await Promise.all([
                    prisma.appointment.count(),
                    prisma.appointment.count({ where: { status: 'PENDING' } }),
                    prisma.appointment.count({ where: { status: 'OPERATOR_CONFIRMED' } }),
                    prisma.appointment.count({ where: { status: 'COMPLETED' } }),
                    prisma.appointment.count({ where: { status: 'CANCELLED' } }),
                    prisma.appointment.count({
                        where: { createdAt: { gte: dayStart, lte: dayEnd } },
                    }),
                ]);
            sendSuccess(res, {
                total, pending, operatorConfirmed, completed, cancelled, todayTotal,
            });
        } catch (err) {
            next(err);
        }
    },

    setClinicDiscount: async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const clinicId = String(req.params.clinicId);
            const { defaultDiscountPercent } = req.body;
            const clinic = await prisma.clinic.update({
                where: { id: clinicId },
                data: { defaultDiscountPercent },
                select: { id: true, nameUz: true, defaultDiscountPercent: true },
            });
            sendSuccess(res, clinic, null, 'Chegirma saqlandi');
        } catch (err) {
            next(err);
        }
    },
};
