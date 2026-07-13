import crypto from 'crypto';
import prisma from '../../config/database';
import { dispatch as dispatchNotification } from '../notifications/notification.dispatcher';
import { env } from '../../config/env';
import {
    getActiveAlifConfigForClinic,
    getAlifConfigForClinic,
    touchAlifLastUsed,
    ResolvedAlifConfig,
} from './alif-config.service';

// ─── Alif (Nasiya) checkout ─────────────────────────────────────────────────
// Create an itemised invoice on Alif; the customer completes it on Alif's
// hosted page (card OR Nasiya installment). Alif posts a signed webhook back on
// completion. Amounts are in TIYIN (som × 100). Per-clinic — each clinic uses
// its own Alif merchant Token/Key.

function normalizePhone(phone?: string | null): string | undefined {
    if (!phone) return undefined;
    const d = String(phone).replace(/\D/g, '');
    if (d.length === 12 && d.startsWith('998')) return d;
    if (d.length === 9) return '998' + d;
    return undefined;
}

export interface CreateInvoiceResult {
    checkoutUrl: string;
    invoiceId: string;
    amountTiyin: number;
    isTestMode: boolean;
}

export async function createInvoice(appointmentId: string, patientId: string): Promise<CreateInvoiceResult> {
    const appointment = await prisma.appointment.findUnique({
        where: { id: appointmentId },
        select: {
            id: true, patientId: true, clinicId: true, bookingNumber: true,
            price: true, finalPrice: true, paymentStatus: true,
            patient: { select: { phone: true } },
            clinic: { select: { nameUz: true } },
        },
    });
    if (!appointment) throw new Error('Buyurtma topilmadi');
    if (appointment.patientId !== patientId) throw new Error('Ruxsat yo\'q');
    if (appointment.paymentStatus === 'PAID') throw new Error('Buyurtma allaqachon to\'langan');

    const cfg = await getActiveAlifConfigForClinic(appointment.clinicId);
    if (!cfg) throw new Error('Bu klinika Alif to\'lovini qo\'llab-quvvatlamaydi');

    const som = Number(appointment.finalPrice ?? appointment.price ?? 0);
    if (!Number.isFinite(som) || som <= 0) throw new Error('Buyurtma summasi noto\'g\'ri');
    const priceTiyin = Math.round(som * 100);

    const returnBase = env.PUBLIC_API_BASE_URL.replace(/\/$/, '');
    const body: any = {
        // Itemised so Alif can offer Nasiya (installment needs the goods list).
        items: [
            {
                name: `Tibbiy xizmat — ${appointment.clinic?.nameUz ?? ''} (#${appointment.bookingNumber})`.slice(0, 250),
                amount: 1,
                price: priceTiyin,
            },
        ],
        phone: normalizePhone(appointment.patient?.phone),
        webhook_url: `${returnBase}/api/alif/webhook`,
        redirect_url: `${returnBase}/payment/result?order_id=${appointment.id}`,
        cancel_url: `${returnBase}/payment/result?order_id=${appointment.id}&cancelled=1`,
        // meta echoes back in the webhook — how we match the payment to the order.
        meta: { appointmentId: appointment.id, clinicId: appointment.clinicId },
    };

    const resp = await fetch(`${cfg.baseUrl}/invoice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Token': cfg.token },
        body: JSON.stringify(body),
    });
    const text = await resp.text();
    if (!resp.ok) {
        console.error('[alif.createInvoice] non-200', resp.status, text);
        throw new Error(`Alif invoice yaratilmadi (${resp.status})`);
    }
    let data: any;
    try { data = JSON.parse(text); } catch { throw new Error('Alif javobi noto\'g\'ri'); }
    const invoiceId = data?.id;
    if (!invoiceId) throw new Error('Alif invoice id qaytmadi');

    await prisma.alifTransaction.create({
        data: {
            invoiceId: String(invoiceId),
            appointmentId: appointment.id,
            amount: priceTiyin,
            status: 'PENDING',
            clinicId: appointment.clinicId,
            isTestMode: cfg.isTestMode,
        },
    });
    touchAlifLastUsed(cfg.configId);

    return {
        checkoutUrl: `${cfg.baseUrl}/?invoice=${invoiceId}`,
        invoiceId: String(invoiceId),
        amountTiyin: priceTiyin,
        isTestMode: cfg.isTestMode,
    };
}

// ─── Webhook ────────────────────────────────────────────────────────────────
// Verify Signature = base64(HMAC-SHA256(Key, RAW body)) against the header, then
// flip the appointment to PAID. The clinic (→ its Key) is resolved from the
// order id in `meta` before verifying.
function verifySignature(rawBody: Buffer, signatureHeader: string | undefined, key: string): boolean {
    if (!signatureHeader) return false;
    const expected = crypto.createHmac('sha256', key).update(rawBody).digest('base64');
    try {
        const a = Buffer.from(expected);
        const b = Buffer.from(signatureHeader);
        return a.length === b.length && crypto.timingSafeEqual(a, b);
    } catch { return false; }
}

export interface AlifWebhookResult { ok: boolean; status: number; note: string; }

export async function handleAlifWebhook(rawBody: Buffer, signatureHeader?: string): Promise<AlifWebhookResult> {
    let payload: any;
    try { payload = JSON.parse(rawBody.toString('utf8')); } catch {
        return { ok: false, status: 400, note: 'bad json' };
    }

    // ROLLOUT DEBUG (remove once live): see exactly what Alif sends.
    console.log('[alif.webhook] IN', JSON.stringify({
        signature: signatureHeader ? '(present)' : '(missing)',
        meta: payload?.meta, payment: payload?.payment, id: payload?.id, status: payload?.status,
    }));

    const meta = payload?.meta || {};
    const appointmentId = meta.appointmentId
        || payload?.payment?.meta?.appointmentId
        || null;
    if (!appointmentId) return { ok: false, status: 400, note: 'no appointmentId in meta' };

    const appointment = await prisma.appointment.findUnique({ where: { id: String(appointmentId) } });
    if (!appointment) return { ok: false, status: 404, note: 'appointment not found' };

    // Resolve the clinic's Alif Key to verify the signature (ignore isActive so a
    // just-paused config still validates a legitimately-in-flight payment).
    const cfg = await getAlifConfigForClinic(appointment.clinicId);
    if (!cfg) return { ok: false, status: 400, note: 'clinic alif config missing' };

    if (!verifySignature(rawBody, signatureHeader, cfg.key)) {
        console.warn('[alif.webhook] SIGNATURE MISMATCH for appt', appointmentId);
        return { ok: false, status: 401, note: 'bad signature' };
    }

    const status = String(payload?.payment?.status || payload?.status || '').toUpperCase();
    const paidAmountTiyin = Number(payload?.payment?.amount ?? 0);

    if (status !== 'SUCCEEDED') {
        // Non-success (cancelled/failed) — record but don't mark paid.
        await prisma.alifTransaction.updateMany({
            where: { appointmentId: appointment.id },
            data: { status: status || 'CANCELLED', updatedAt: new Date() },
        });
        return { ok: true, status: 200, note: `noted status ${status}` };
    }

    if (appointment.paymentStatus === 'PAID') {
        return { ok: true, status: 200, note: 'already paid' };
    }

    const paidSom = Math.round(paidAmountTiyin / 100);
    await prisma.$transaction([
        prisma.alifTransaction.updateMany({
            where: { appointmentId: appointment.id },
            data: { status: 'SUCCEEDED', updatedAt: new Date() },
        }),
        prisma.appointment.update({
            where: { id: appointment.id },
            data: {
                paymentStatus: 'PAID',
                paymentMethod: 'ALIF',
                paidAmount: paidSom || appointment.finalPrice || appointment.price || 0,
                paidAt: new Date(),
                qrActivatedAt: new Date(),
            },
        }),
    ]);

    dispatchNotification({
        type: 'payment_received', userId: appointment.patientId, appointmentId: appointment.id,
        amount: paidSom, priority: 'HIGH', link: `/user/appointments/${appointment.id}`,
    }).catch((e) => console.error('[alif.webhook] notify patient failed:', e));
    dispatchNotification({
        type: 'payment_received', clinicId: appointment.clinicId, appointmentId: appointment.id,
        amount: paidSom, priority: 'HIGH', link: `/clinic/bookings?focus=${appointment.id}`,
    }).catch((e) => console.error('[alif.webhook] notify clinic failed:', e));

    return { ok: true, status: 200, note: 'paid' };
}

export type { ResolvedAlifConfig };
