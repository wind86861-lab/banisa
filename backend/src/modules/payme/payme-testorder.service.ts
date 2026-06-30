/**
 * Per-clinic Payme sandbox test orders.
 *
 * The Payme moderation suite (test.paycom.uz) needs a REAL, payable order to
 * run its lifecycle tests against. Rather than synthesizing fake responses for
 * arbitrary order ids (which can never be spec-compliant — see payme.service.ts)
 * we provision real test appointments and let the merchant endpoint run its
 * normal, data-driven path. This module is the only place that knows about
 * "test orders"; the protocol code stays generic and identical for test/live.
 *
 * Each "create" makes a brand-new CONFIRMED, UNPAID appointment, so a fresh
 * order is never "busy" and the operator can grab a clean one whenever a
 * section dirtied the previous one. We keep a bounded history (MAX_KEEP) per
 * clinic so the admin can see which test ids were used and their status,
 * pruning older ones to avoid unbounded test rows.
 */
import prisma from '../../config/database';
import { generateBookingNumber } from '../appointments/appointment.utils';
import { PAYME_STATE } from './payme.service';

// Synthetic, login-disabled patient shared by every clinic's test orders. The
// non-bcrypt hash can never match a password, so the account cannot
// authenticate; it exists only to satisfy Appointment.patientId.
const TEST_PATIENT_PHONE = '+998000000001';
const TEST_PATIENT_HASH = 'payme-sandbox-no-login';

// Marks an appointment as a sandbox test order. Stored in `notes` so we can
// find/list/prune them without a schema change.
const TEST_ORDER_MARKER = '[PAYME_SANDBOX_TEST]';

// Fixed test price (so'm). The merchant endpoint expects amount === price*100,
// so the sandbox must send 100000 tiyin.
const TEST_PRICE_SOM = 1000;

// How many recent test orders to retain (and list) per clinic.
const MAX_KEEP = 10;

export type TestOrderStatus = 'unused' | 'pending' | 'paid' | 'cancelled';

export interface TestOrder {
    orderId: string;   // appointment id — paste into sandbox "Номер заказа"
    amount: number;    // tiyin — paste into sandbox "Сумма платежа"
    amountSom: number; // human-readable so'm
}

export interface TestOrderListItem extends TestOrder {
    status: TestOrderStatus;
    createdAt: Date;
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

async function findTestPatientId(): Promise<string | null> {
    const u = await prisma.user.findUnique({
        where: { phone: TEST_PATIENT_PHONE },
        select: { id: true },
    });
    return u?.id ?? null;
}

/**
 * Create a fresh, payable sandbox order for this clinic and return its
 * order_id + amount. Prunes older test orders beyond MAX_KEEP.
 */
export async function createTestOrder(clinicId: string): Promise<TestOrder> {
    const patientId = await ensureTestPatient();

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

    // Prune older test orders (and their transactions) beyond the retained window.
    const stale = await prisma.appointment.findMany({
        where: { clinicId, patientId, notes: TEST_ORDER_MARKER },
        orderBy: { createdAt: 'desc' },
        skip: MAX_KEEP,
        select: { id: true },
    });
    if (stale.length) {
        const ids = stale.map((s) => s.id);
        await prisma.paymeTransaction.deleteMany({ where: { orderId: { in: ids } } });
        await prisma.appointment.deleteMany({ where: { id: { in: ids } } });
    }

    return { orderId: created.id, amount: TEST_PRICE_SOM * 100, amountSom: TEST_PRICE_SOM };
}

/**
 * List this clinic's recent test orders with their current status, so the
 * admin can see which ids were used and what happened to each.
 */
export async function listTestOrders(clinicId: string): Promise<TestOrderListItem[]> {
    const patientId = await findTestPatientId();
    if (!patientId) return [];

    const appts = await prisma.appointment.findMany({
        where: { clinicId, patientId, notes: TEST_ORDER_MARKER },
        orderBy: { createdAt: 'desc' },
        take: MAX_KEEP,
        select: { id: true, price: true, createdAt: true },
    });
    if (!appts.length) return [];

    const ids = appts.map((a) => a.id);
    const txs = await prisma.paymeTransaction.findMany({
        where: { orderId: { in: ids } },
        orderBy: { createTime: 'desc' },
        select: { orderId: true, state: true },
    });
    const latestState = new Map<string, number>();
    for (const t of txs) {
        if (!latestState.has(t.orderId)) latestState.set(t.orderId, t.state);
    }

    return appts.map((a) => {
        const st = latestState.get(a.id);
        let status: TestOrderStatus = 'unused';
        if (st === PAYME_STATE.COMPLETED) status = 'paid';
        else if (st === PAYME_STATE.CREATED) status = 'pending';
        else if (st === PAYME_STATE.CANCELLED_AFTER_CREATE || st === PAYME_STATE.CANCELLED_AFTER_COMPLETE) status = 'cancelled';
        return {
            orderId: a.id,
            amount: a.price * 100,
            amountSom: a.price,
            status,
            createdAt: a.createdAt,
        };
    });
}
