/**
 * Per-clinic Payme sandbox test order.
 *
 * The Payme moderation suite (test.paycom.uz) needs a REAL, payable order to
 * run its lifecycle tests against — CheckPerformTransaction, CreateTransaction,
 * PerformTransaction, CheckTransaction, CancelTransaction. Earlier the merchant
 * handler synthesized fake responses for arbitrary order ids in test mode; that
 * could never be made spec-compliant (the `/invalid-account` test sends a
 * non-existent id expecting -31050, but the synthetic branch returned allow) and
 * forced a per-clinic code patch every time. See payme.service.ts.
 *
 * Instead we provision ONE real test appointment per clinic and let the merchant
 * endpoint run its normal, data-driven path. This module is the only place that
 * knows about "test orders"; the protocol code stays generic and identical for
 * test and live. Re-callable: each call RESETS the order to a clean, unpaid,
 * CONFIRMED state and wipes prior transactions, so the moderator can re-run the
 * whole suite as many times as they want.
 */
import prisma from '../../config/database';
import { generateBookingNumber } from '../appointments/appointment.utils';

// Synthetic, login-disabled patient shared by every clinic's test order. The
// bcrypt-shaped junk hash never matches a real password, so the account cannot
// authenticate; it exists only to satisfy Appointment.patientId.
const TEST_PATIENT_PHONE = '+998000000001';
const TEST_PATIENT_HASH = 'payme-sandbox-no-login';

// Marks the appointment as the clinic's reusable sandbox order. Stored in
// `notes` so we can find-and-reset it without a schema change.
const TEST_ORDER_MARKER = '[PAYME_SANDBOX_TEST]';

// Fixed test price (so'm). The merchant endpoint expects `amount === price*100`,
// so the sandbox must send 100000 tiyin. We surface both to the operator.
const TEST_PRICE_SOM = 1000;

export interface TestOrder {
    orderId: string;   // appointment id — paste into sandbox "Номер заказа"
    amount: number;    // tiyin — paste into sandbox "Сумма платежа"
    amountSom: number; // human-readable so'm
}

async function ensureTestPatient(): Promise<string> {
    const existing = await prisma.user.findUnique({
        where: { phone: TEST_PATIENT_PHONE },
        select: { id: true },
    });
    if (existing) return existing.id;
    const created = await prisma.user.create({
        data: {
            phone: TEST_PATIENT_PHONE,
            passwordHash: TEST_PATIENT_HASH,
            firstName: 'Payme',
            lastName: 'Sandbox',
            role: 'PATIENT',
            status: 'APPROVED',
        },
        select: { id: true },
    });
    return created.id;
}

/**
 * Ensure a clean, payable sandbox order exists for this clinic and return its
 * order_id + amount. Idempotent: reuses and resets the same appointment.
 */
export async function ensureTestOrder(clinicId: string): Promise<TestOrder> {
    const patientId = await ensureTestPatient();

    const existing = await prisma.appointment.findFirst({
        where: { clinicId, patientId, notes: TEST_ORDER_MARKER },
        orderBy: { createdAt: 'desc' },
        select: { id: true },
    });

    let orderId: string;
    if (existing) {
        // Wipe prior transactions so CheckPerformTransaction won't report the
        // order as busy (-31099), and reset payment/lifecycle to a fresh slate.
        await prisma.paymeTransaction.deleteMany({ where: { orderId: existing.id } });
        await prisma.appointment.update({
            where: { id: existing.id },
            data: {
                status: 'CONFIRMED',
                paymentStatus: 'UNPAID',
                price: TEST_PRICE_SOM,
                finalPrice: TEST_PRICE_SOM,
                paidAt: null,
                paidAmount: null,
                paymentMethod: null,
                paymeTransactionId: null,
            },
        });
        orderId = existing.id;
    } else {
        const bookingNumber = await generateBookingNumber();
        const created = await prisma.appointment.create({
            data: {
                clinicId,
                patientId,
                scheduledAt: new Date(),
                status: 'CONFIRMED',
                paymentStatus: 'UNPAID',
                price: TEST_PRICE_SOM,
                finalPrice: TEST_PRICE_SOM,
                bookingNumber,
                notes: TEST_ORDER_MARKER,
            },
            select: { id: true },
        });
        orderId = created.id;
    }

    return { orderId, amount: TEST_PRICE_SOM * 100, amountSom: TEST_PRICE_SOM };
}
