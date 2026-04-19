import { Response, NextFunction } from 'express';
import QRCode from 'qrcode';
import { AuthRequest } from '../../middleware/auth.middleware';
import { AppError, ErrorCodes } from '../../utils/errors';
import { sendSuccess } from '../../utils/response';
import { appointmentService } from './appointment.service';
import prisma from '../../config/database';

/**
 * Patient-facing appointment controller
 */
export const patientAppointmentController = {
    create: async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const appointment = await appointmentService.createBooking(req.user!.id, req.body);
            sendSuccess(res, appointment, null, 'Bron yaratildi', 201);
        } catch (err) {
            next(err);
        }
    },

    getById: async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const appt = await appointmentService.findByIdForPatient(
                String(req.params.id),
                req.user!.id
            );
            if (!appt) throw new AppError('Bron topilmadi', 404, ErrorCodes.NOT_FOUND);
            sendSuccess(res, appt);
        } catch (err) {
            next(err);
        }
    },

    cancel: async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const appt = await appointmentService.cancelByPatient(
                req.user!.id,
                String(req.params.id),
                req.body?.reason
            );
            sendSuccess(res, appt, null, 'Bron bekor qilindi');
        } catch (err) {
            next(err);
        }
    },

    /**
     * Stream QR code PNG — only if paid and belongs to this patient
     */
    getQrImage: async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const id = String(req.params.id);
            const appt = await prisma.appointment.findFirst({
                where: { id, patientId: req.user!.id },
                select: {
                    id: true,
                    qrToken: true,
                    paymentStatus: true,
                    bookingNumber: true,
                },
            });
            if (!appt) throw new AppError('Bron topilmadi', 404, ErrorCodes.NOT_FOUND);
            if (appt.paymentStatus !== 'PAID' || !appt.qrToken) {
                throw new AppError('QR kod faqat to\'lovdan keyin ko\'rinadi', 403, ErrorCodes.FORBIDDEN);
            }

            // QR content: JSON with token + booking number for security
            const payload = JSON.stringify({
                t: appt.qrToken,
                b: appt.bookingNumber,
            });
            const png = await QRCode.toBuffer(payload, {
                errorCorrectionLevel: 'M',
                margin: 2,
                width: 512,
                color: { dark: '#0f172a', light: '#ffffff' },
            });
            res.setHeader('Content-Type', 'image/png');
            res.setHeader('Cache-Control', 'private, max-age=300');
            res.send(png);
        } catch (err) {
            next(err);
        }
    },
};
