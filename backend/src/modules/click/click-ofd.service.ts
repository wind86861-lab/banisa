/**
 * CLICK fiscalization (OFD — Soliq receipt data).
 *
 * Spec: https://docs.click.uz/merchant-api/fiscalization
 *
 * This is NOT part of the Prepare/Confirm webhook contract — it's a separate
 * outbound POST made AFTER the payment is confirmed. Consequences:
 *   • It must never throw into the payment path. The money has already moved;
 *     a failed receipt submission is a bookkeeping problem to retry, not a
 *     reason to fail the Confirm the customer is waiting on.
 *   • `payment_id` is CLICK's own payment id — our `ClickTransaction.clickPaydocId`.
 *
 * Auth differs from the Split webhook signature: that one is MD5 over a
 * concatenation, this one is `merchant_user_id:sha1(timestamp + secret):timestamp`.
 *
 * Field names are CLICK's PascalCase (SPIC / PackageCode / VATPercent), not
 * Payme's snake_case — the shared resolver returns neutral codes and each
 * provider adapts them to its own wire format.
 */
import crypto from 'crypto';
import prisma from '../../config/database';
import { getGlobalSplitConfig } from './click-split-config.service';
import { resolveFiscal, vatAmountTiyin } from '../fiscal/fiscal.service';

const OFD_BASE = 'https://api.click.uz/v2/merchant/payment/ofd_data';

/** `Auth: merchant_user_id:sha1(timestamp + secret_key):timestamp` */
function authHeader(merchantUserId: string, secretKey: string): string {
    const ts = Math.floor(Date.now() / 1000);
    const digest = crypto.createHash('sha1').update(`${ts}${secretKey}`).digest('hex');
    return `${merchantUserId}:${digest}:${ts}`;
}

interface OfdItem {
    Name: string;
    SPIC: string;
    PackageCode: string;
    GoodPrice: number;
    Price: number;
    Amount: number;
    VAT: number;
    VATPercent: number;
    Discount: number;
    CommissionInfo: { TIN?: string; PINFL?: string };
}

/**
 * Build the receipt lines for an appointment. Cart bookings emit one line per
 * service; solo bookings emit a single synthesized line — mirroring how the
 * Payme receipt is built, so both providers report the same basket.
 */
async function buildItems(appointment: any, tin: string | null): Promise<OfdItem[]> {
    const fiscal = await resolveFiscal(appointment);
    // CommissionInfo must carry a TIN or a PINFL. Without the clinic's INN the
    // receipt would be rejected, so the caller checks this before submitting.
    const commission = tin ? { TIN: tin } : {};

    const line = (name: string, somPrice: number, qty: number, codes: { code: string; package_code: string; vat_percent: number }): OfdItem => {
        const priceTiyin = Math.round(somPrice * 100) * qty;
        return {
            Name: String(name || 'Tibbiy xizmat').slice(0, 63),
            SPIC: codes.code,
            PackageCode: codes.package_code,
            GoodPrice: Math.round(somPrice * 100),
            Price: priceTiyin,
            Amount: qty,
            VAT: vatAmountTiyin(priceTiyin, codes.vat_percent),
            VATPercent: codes.vat_percent,
            Discount: 0,
            CommissionInfo: commission,
        };
    };

    if (appointment.services?.length) {
        return appointment.services.map((s: any) =>
            line(
                s.serviceName,
                Number(s.finalPrice ?? s.price ?? 0),
                1,
                fiscal.byServiceKey(s.serviceType, s.originalServiceId),
            ),
        );
    }

    const name = appointment.diagnosticService?.nameUz
        || appointment.surgicalService?.nameUz
        || 'Tibbiy xizmat';
    const categoryId = appointment.diagnosticService?.categoryId
        ?? appointment.surgicalService?.categoryId
        ?? null;
    const total = Number(appointment.finalPrice ?? appointment.price ?? 0);
    return [line(name, total, 1, fiscal.byCategoryId(categoryId))];
}

/**
 * Submit the goods/services list for a completed CLICK payment.
 * Returns a result object rather than throwing — callers log and move on.
 */
export async function submitOfdItems(input: {
    appointmentId: string;
    clickPaydocId: string | number;
    clinicId: string | null;
}): Promise<{ ok: boolean; reason?: string; errorCode?: number }> {
    try {
        const cfg = await getGlobalSplitConfig();
        if (!cfg?.merchantUserId) return { ok: false, reason: 'no merchantUserId configured' };

        const appointment = await prisma.appointment.findUnique({
            where: { id: input.appointmentId },
            include: {
                diagnosticService: { select: { id: true, nameUz: true, categoryId: true } },
                surgicalService: { select: { id: true, nameUz: true, categoryId: true } },
                services: {
                    select: { serviceType: true, serviceName: true, originalServiceId: true, finalPrice: true, price: true },
                },
            },
        });
        if (!appointment) return { ok: false, reason: 'appointment not found' };

        // CommissionInfo needs the receiving clinic's INN. For split payments
        // that's the clinic's counterparty record; fall back to Banisa's own
        // INN so a clinic that hasn't filled its rekvizit still fiscalizes.
        const clinicId = input.clinicId ?? appointment.clinicId;
        const split = clinicId
            ? await prisma.clinicClickSplitConfig.findUnique({
                where: { clinicId },
                select: { inn: true },
            })
            : null;
        const tin = split?.inn || cfg.banisaInn || null;
        if (!tin) return { ok: false, reason: 'no TIN/PINFL available for CommissionInfo' };

        const items = await buildItems(appointment, tin);
        const totalTiyin = items.reduce((s, i) => s + i.Price, 0);

        const body = {
            service_id: Number(cfg.serviceId),
            payment_id: Number(input.clickPaydocId),
            items,
            received_ecash: 0,
            received_cash: 0,
            received_card: totalTiyin,
        };

        const res = await fetch(`${OFD_BASE}/submit_items`, {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                Auth: authHeader(cfg.merchantUserId, cfg.secretKey),
            },
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(15000),
        });

        const text = await res.text();
        let parsed: any = null;
        try { parsed = JSON.parse(text); } catch { /* non-JSON body */ }
        const errorCode = Number(parsed?.error_code ?? -1);

        if (res.ok && errorCode === 0) {
            console.log('[click.ofd] submitted', {
                appointmentId: input.appointmentId,
                paymentId: String(input.clickPaydocId),
                lines: items.length,
                totalTiyin,
            });
            return { ok: true, errorCode };
        }
        console.warn('[click.ofd] submit failed', {
            appointmentId: input.appointmentId,
            paymentId: String(input.clickPaydocId),
            httpStatus: res.status,
            errorCode,
            errorNote: parsed?.error_note,
        });
        return { ok: false, reason: parsed?.error_note || `http ${res.status}`, errorCode };
    } catch (e: any) {
        console.error('[click.ofd] submit threw', input.appointmentId, e?.message);
        return { ok: false, reason: e?.message || 'unknown error' };
    }
}

/**
 * Fetch the fiscal receipt QR link CLICK generated for a payment, so the
 * patient can be shown/sent their Soliq receipt.
 */
export async function getOfdReceiptUrl(paymentId: string | number): Promise<string | null> {
    try {
        const cfg = await getGlobalSplitConfig();
        if (!cfg?.merchantUserId) return null;
        const res = await fetch(`${OFD_BASE}/${encodeURIComponent(String(cfg.serviceId))}/${encodeURIComponent(String(paymentId))}`, {
            method: 'GET',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                Auth: authHeader(cfg.merchantUserId, cfg.secretKey),
            },
            signal: AbortSignal.timeout(15000),
        });
        if (!res.ok) return null;
        const j: any = await res.json().catch(() => null);
        return j?.qrCodeURL || null;
    } catch {
        return null;
    }
}
