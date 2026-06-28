import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware';
import { AppError, ErrorCodes } from '../../utils/errors';
import { sendSuccess } from '../../utils/response';
import { appointmentService } from './appointment.service';

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

    /**
     * GET /api/user/appointments/:id/payment-status
     * Minimal payload for polling flows (check-in cashier wait,
     * AppointmentDetailPage). Returns only the few fields a poller needs
     * to flip its UI; full appointment refetch happens once on landing.
     */
    getPaymentStatus: async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const result = await appointmentService.getPaymentStatusForPatient(
                String(req.params.id),
                req.user!.id,
            );
            if (!result) throw new AppError('Bron topilmadi', 404, ErrorCodes.NOT_FOUND);
            sendSuccess(res, result);
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
     * POST /api/user/appointments/scan-checkin
     * Patient scans clinic QR; backend auto-checks-in the earliest eligible
     * booking at that clinic. Response: { kind, appointment?, clinic? }.
     */
    scanCheckIn: async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const result = await appointmentService.scanCheckIn(
                req.user!.id, req.body.secret, req.body.lat, req.body.lng,
            );
            sendSuccess(res, result);
        } catch (err) {
            next(err);
        }
    },

    scanCheckInPick: async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const appt = await appointmentService.scanCheckInPick(
                req.user!.id, req.body.secret, req.body.appointmentId, req.body.lat, req.body.lng,
            );
            sendSuccess(res, appt);
        } catch (err) {
            next(err);
        }
    },
};
