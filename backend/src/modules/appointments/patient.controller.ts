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
     * Stream QR code PNG — for paid bookings (clinic staff scans)
     * or for cash bookings at CHECKED_IN status (staff confirms cash)
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
                    paymentMethod: true,
                    status: true,
                    bookingNumber: true,
                },
            });
            if (!appt) throw new AppError('Bron topilmadi', 404, ErrorCodes.NOT_FOUND);

            const isCash = appt.paymentMethod === 'CASH';
            const cashReady = isCash && ['CHECKED_IN', 'IN_PROGRESS', 'COMPLETED'].includes(appt.status as string);
            const onlinePaid = appt.paymentStatus === 'PAID';

            if (!cashReady && !onlinePaid) {
                throw new AppError('QR kod hali tayyor emas', 403, ErrorCodes.FORBIDDEN);
            }
            if (!appt.qrToken) {
                throw new AppError('QR token topilmadi', 500, ErrorCodes.SERVER_ERROR);
            }

            const payload = JSON.stringify({ t: appt.qrToken, b: appt.bookingNumber });
            const png = await QRCode.toBuffer(payload, {
                errorCorrectionLevel: 'M',
                margin: 2,
                width: 512,
                color: { dark: '#0f172a', light: '#ffffff' },
            });
            res.setHeader('Content-Type', 'image/png');
            res.setHeader('Cache-Control', 'private, max-age=60');
            res.send(png);
        } catch (err) {
            next(err);
        }
    },

    /**
     * POST /api/appointments/:id/patient-checkin
     * Patient scans clinic QR → PENDING_ARRIVAL → CHECKED_IN
     */
    patientCheckIn: async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const appt = await appointmentService.patientCheckIn(
                req.user!.id,
                String(req.params.id),
                req.body.clinicSecret,
                req.body.lat,
                req.body.lng,
            );
            sendSuccess(res, appt, null, 'Klinikaga kelish tasdiqlandi');
        } catch (err) {
            next(err);
        }
    },

    /**
     * POST /api/user/appointments/scan-checkin
     * Smart QR check-in: resolves clinic from secret, finds patient's eligible
     * appointment(s) at THAT clinic, and checks in if exactly one.
     *
     * Response shape:
     *   { kind: 'checked_in', appointment }      // single eligible booking → done
     *   { kind: 'already',    appointment }      // already CHECKED_IN/IN_PROGRESS/COMPLETED → idempotent
     *   { kind: 'multiple',   appointments, clinic } // user must pick
     *   { kind: 'none',       clinic }           // no eligible booking at this clinic
     */
    scanCheckIn: async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const result = await appointmentService.scanCheckIn(req.user!.id, req.body.secret);
            sendSuccess(res, result);
        } catch (err) {
            next(err);
        }
    },
};
