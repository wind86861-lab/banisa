import { Response } from 'express';
import prisma from '../../config/database';
import { AuthRequest } from '../../middleware/auth.middleware';
import { AppError, ErrorCodes } from '../../utils/errors';
import { generateBookingNumber } from '../appointments/appointment.utils';
import { getSkoryPaymentInfo, markSkoryPaid } from './skory.service';

const ONLINE = ['CLICK', 'PAYME', 'ALIF'];

/**
 * POST /api/skory/:id/pay  { method }
 * Patient picks how to pay the skory trip.
 *   • CASH   → nothing to initiate; the dispatcher confirms receipt in the bot.
 *   • online → reuse the ambulance-clinic's existing provider. We mint a bridge
 *     Appointment (marked [SKORY], kept out of clinic dashboards) so the whole
 *     existing Payme/Click/Alif flow + webhooks work unchanged, then hand the
 *     SPA the appointmentId to open /payment/<provider>. The skory row is
 *     reconciled PAID from that appointment on the next payment-info read.
 */
export const initiateSkoryPayment = async (req: AuthRequest, res: Response) => {
    const requestId = String(req.params.id || '');
    const method = String(req.body?.method || '').toUpperCase();
    const patientId = req.user!.id;

    const reqRow = await prisma.ambulanceRequest.findUnique({
        where: { id: requestId },
        include: { acceptedAmbulance: { include: { clinic: { select: { id: true, nameUz: true, paymentMethods: true } } } } },
    });
    if (!reqRow) throw new AppError('So\'rov topilmadi', 404, ErrorCodes.NOT_FOUND);
    if (reqRow.patientId !== patientId) throw new AppError('Ruxsat yo\'q', 403, ErrorCodes.FORBIDDEN);
    if (reqRow.paymentStatus === 'PAID') {
        return res.status(409).json({ success: false, message: 'Allaqachon to\'langan' });
    }
    const clinic = reqRow.acceptedAmbulance?.clinic;
    if (!clinic) throw new AppError('Ambulans klinikasi topilmadi', 400, ErrorCodes.VALIDATION_ERROR);

    const supported = Array.isArray(clinic.paymentMethods) ? (clinic.paymentMethods as any[]) : [];
    if (method !== 'CASH' && !supported.includes(method)) {
        return res.status(400).json({ success: false, message: 'Bu usul mavjud emas' });
    }

    const total = reqRow.totalPrice ?? ((reqRow.tripFee ?? 0) + (reqRow.waitingFee ?? 0));
    if (!total || total <= 0) {
        return res.status(400).json({ success: false, message: 'Summa hali hisoblanmagan' });
    }

    // Cash — just record the intended method; the dispatcher confirms receipt.
    if (method === 'CASH') {
        await prisma.ambulanceRequest.update({ where: { id: requestId }, data: { paymentMethod: 'CASH' } });
        return res.json({ success: true, data: { method: 'CASH' } });
    }

    if (!ONLINE.includes(method)) {
        return res.status(400).json({ success: false, message: 'Noto\'g\'ri usul' });
    }

    // Reuse (or create) the bridge appointment that carries the online payment.
    let appointmentId = reqRow.paymentAppointmentId;
    if (appointmentId) {
        const existing = await prisma.appointment.findUnique({ where: { id: appointmentId }, select: { id: true, paymentStatus: true } });
        if (!existing) appointmentId = null;
    }
    if (!appointmentId) {
        const bookingNumber = await generateBookingNumber();
        const appt = await prisma.appointment.create({
            data: {
                clinicId: clinic.id,
                patientId,
                scheduledAt: new Date(),
                status: 'CONFIRMED' as any,
                paymentStatus: 'UNPAID' as any,
                paymentMethod: method as any,
                price: total,
                finalPrice: total,
                bookingNumber,
                notes: `[SKORY] ${requestId}`,
            },
            select: { id: true },
        });
        appointmentId = appt.id;
    } else {
        // Keep amount + method in sync on the existing bridge appointment.
        await prisma.appointment.update({
            where: { id: appointmentId },
            data: { price: total, finalPrice: total, paymentMethod: method as any },
        });
    }

    await prisma.ambulanceRequest.update({
        where: { id: requestId },
        data: { paymentMethod: method, paymentAppointmentId: appointmentId },
    });

    return res.json({
        success: true,
        data: { method, appointmentId, clinicId: clinic.id, clinicName: clinic.nameUz, price: total },
    });
};

/**
 * Mirror a paid bridge appointment onto the skory request. Safe + idempotent —
 * only completes the skory trip AFTER the provider's own verified webhook has
 * marked the linked appointment PAID. Returns true when it just transitioned.
 */
export async function reconcileSkoryPayment(requestId: string): Promise<boolean> {
    const reqRow = await prisma.ambulanceRequest.findUnique({
        where: { id: requestId },
        select: { paymentStatus: true, paymentAppointmentId: true, paymentMethod: true },
    });
    if (!reqRow || reqRow.paymentStatus === 'PAID' || !reqRow.paymentAppointmentId) return false;
    const appt = await prisma.appointment.findUnique({
        where: { id: reqRow.paymentAppointmentId },
        select: { paymentStatus: true, paidAmount: true, paymentMethod: true },
    });
    if (!appt || appt.paymentStatus !== 'PAID') return false;
    const r = await markSkoryPaid(requestId, reqRow.paymentMethod || appt.paymentMethod || 'ONLINE', appt.paidAmount ?? null);
    return r.ok;
}

// Get payment info for the public page, reconciling any completed online
// payment first so the page flips to PAID as soon as the provider confirms.
export const getSkoryPaymentWithReconcile = async (requestId: string) => {
    await reconcileSkoryPayment(requestId).catch(() => {});
    return getSkoryPaymentInfo(requestId);
};
