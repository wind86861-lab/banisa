import { Request, Response } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware';
import { createInvoice, handleAlifWebhook } from './alif.service';

// POST /api/alif/webhook — Alif payment notification. Body is captured RAW
// (express.raw) because the Signature is an HMAC over the exact bytes.
export const alifWebhook = async (req: Request, res: Response) => {
    const raw: Buffer = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body ?? {}));
    const signature = (req.headers['signature'] || req.headers['Signature'] as any) as string | undefined;
    try {
        const result = await handleAlifWebhook(raw, signature);
        // Alif retries until it gets 200; only 200 on genuine accept/idempotent.
        return res.status(result.status).json({ ok: result.ok, note: result.note });
    } catch (e: any) {
        console.error('[alif.webhook] unhandled:', e);
        return res.status(500).json({ ok: false, note: 'server error' });
    }
};

// POST /api/alif/initiate — patient starts an Alif payment for their booking.
export const initiateAlifPayment = async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Avtorizatsiya kerak' });

    const appointmentId = String(req.body?.appointmentId || '').trim();
    if (!appointmentId) return res.status(400).json({ success: false, message: 'appointmentId kerak' });

    try {
        const result = await createInvoice(appointmentId, userId);
        return res.json({ success: true, data: result });
    } catch (e: any) {
        return res.status(400).json({ success: false, message: e?.message || 'Alif to\'lovini boshlab bo\'lmadi' });
    }
};
