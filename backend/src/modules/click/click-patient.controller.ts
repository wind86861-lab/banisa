import { Response } from 'express';
import prisma from '../../config/database';
import { AuthRequest } from '../../middleware/auth.middleware';
import { getActiveConfigForClinic } from './click-config.service';
import { getGlobalSplitConfig, getClinicSplitConfig } from './click-split-config.service';
import { buildPaymentUrl } from './payment-url-builder';
import { env } from '../../config/env';

// POST /api/click/initiate — patient hits this from the SPA after the booking
// has been created (cart flow). We look up the clinic's active CLICK config
// and return the redirect URL the browser should jump to. No state is written
// here: the ClickTransaction row is created on the first Prepare webhook.
export const initiateClickPayment = async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Avtorizatsiya kerak' });

    const appointmentId = String(req.body?.appointmentId || '').trim();
    if (!appointmentId) {
        return res.status(400).json({ success: false, message: 'appointmentId kerak' });
    }

    const appointment = await prisma.appointment.findUnique({
        where: { id: appointmentId },
        select: {
            id: true, patientId: true, clinicId: true,
            price: true, finalPrice: true, paymentStatus: true,
        },
    });
    if (!appointment) {
        return res.status(404).json({ success: false, message: 'Buyurtma topilmadi' });
    }
    if (appointment.patientId !== userId) {
        return res.status(403).json({ success: false, message: 'Ruxsat yo\'q' });
    }
    if (appointment.paymentStatus === 'PAID') {
        return res.status(409).json({ success: false, message: 'Buyurtma allaqachon to\'langan' });
    }

    const amount = Number(appointment.finalPrice ?? appointment.price ?? 0);
    if (!Number.isFinite(amount) || amount <= 0) {
        return res.status(400).json({ success: false, message: 'Buyurtma summasi noto\'g\'ri' });
    }

    // Where CLICK redirects the user back after the card-entry flow.
    // PUBLIC_API_BASE_URL doubles as the frontend origin in production
    // (banisa.uz serves both API and SPA from the same host).
    const returnBase = env.PUBLIC_API_BASE_URL.replace(/\/$/, '');
    const returnUrl = `${returnBase}/payment/result?order_id=${appointment.id}`;

    // SHOP SPLIT (opt-in per clinic): when the clinic has an active split
    // rekvizit AND the global Banisa split service is live, route the payment
    // through Banisa's single split service_id so the commission auto-splits.
    // Falls back to the legacy per-clinic flow otherwise → no live impact until
    // a clinic is explicitly activated.
    const [splitGlobal, clinicSplit] = await Promise.all([
        getGlobalSplitConfig(),
        getClinicSplitConfig(appointment.clinicId),
    ]);
    if (splitGlobal?.isActive && clinicSplit?.isActive && clinicSplit?.isConfigured) {
        const paymentUrl = buildPaymentUrl({
            serviceId: splitGlobal.serviceId,
            merchantId: splitGlobal.merchantId,
            amount,
            appointmentId: appointment.id,
            returnUrl,
        });
        return res.json({
            success: true,
            data: { paymentUrl, appointmentId: appointment.id, amount, isTestMode: splitGlobal.isTestMode, split: true },
        });
    }

    // Legacy per-clinic flow.
    const config = await getActiveConfigForClinic(appointment.clinicId);
    if (!config) {
        return res.status(400).json({
            success: false,
            message: 'Bu klinika CLICK to\'lovini qo\'llab-quvvatlamaydi',
        });
    }

    const paymentUrl = buildPaymentUrl({
        serviceId: config.serviceId,
        merchantId: config.merchantId,
        amount,
        appointmentId: appointment.id,
        returnUrl,
    });

    return res.json({
        success: true,
        data: {
            paymentUrl,
            appointmentId: appointment.id,
            amount,
            isTestMode: config.isTestMode,
        },
    });
};
