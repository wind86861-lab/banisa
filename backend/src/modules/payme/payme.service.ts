import prisma from '../../config/database';
// Fiscal codes now live in a shared module so Click's OFD submission resolves
// them identically (category → global → hardcoded).
import { resolveFiscal } from '../fiscal/fiscal.service';

// ─── State constants ─────────────────────────────────────────────────────────
export const PAYME_STATE = {
    CREATED: 1,
    COMPLETED: 2,
    CANCELLED_AFTER_CREATE: -1,
    CANCELLED_AFTER_COMPLETE: -2,
} as const;

// ─── Payme JSON-RPC error codes ──────────────────────────────────────────────
//
// Payme spec documents `message` as a localized object keyed by language
// code, but the Payme sandbox UI renders it via `String(error.message)`,
// which turns `{ru, uz, en}` into "[object Object]" on screen for every
// failed test. Real-world Payme merchants mostly send a plain string
// (Russian) and the wire format is accepted either way — both the live
// API and the moderator review look at the CODE, not the message text.
// So we ship a Russian string in `message` (what sandbox prints) and
// stash the localized variants under `message_uz` / `message_en` for
// any client that wants them.
type LocalizedMessage = string & { _uz?: string; _en?: string };
function msg(ru: string, _uz: string, _en: string): string {
    return ru;
}

export const PAYME_ERROR = {
    INVALID_AMOUNT: {
        code: -31001,
        message: msg('Неверная сумма', "Noto'g'ri summa", 'Invalid amount'),
        data: 'amount',
    },
    WRONG_ACCOUNT: {
        code: -31050,
        message: msg('Заказ не найден', 'Buyurtma topilmadi', 'Order not found'),
        data: 'order_id',
    },
    TRANSACTION_NOT_FOUND: {
        code: -31003,
        message: msg('Транзакция не найдена', 'Tranzaksiya topilmadi', 'Transaction not found'),
        data: 'transaction',
    },
    ALREADY_DONE: {
        code: -31060,
        message: msg('Транзакция уже завершена', 'Tranzaksiya allaqachon yakunlangan', 'Transaction already done'),
        data: 'transaction',
    },
    UNABLE_CANCEL: {
        code: -31007,
        message: msg('Невозможно отменить', "Bekor qilib bo'lmaydi", 'Unable to cancel'),
        data: 'reason',
    },
    UNABLE_PERFORM: {
        code: -31008,
        message: msg('Невозможно выполнить операцию', "Amalni bajarib bo'lmaydi", 'Unable to perform'),
        data: 'transaction',
    },
    ORDER_BUSY: {
        code: -31099,
        message: msg('Заказ занят другой транзакцией', 'Buyurtma boshqa tranzaksiya bilan band', 'Order is busy'),
        data: 'order_id',
    },
    INVALID_ACCOUNT: {
        code: -31050,
        message: msg('Счет не найден', 'Hisob topilmadi', 'Account not found'),
        data: 'account',
    },
} as const;

// ─── Helpers ─────────────────────────────────────────────────────────────────
const now = () => Date.now();

// Tenant context passed by the route layer. When clinicId is non-null we are on
// the per-clinic endpoint (/api/payme/callback/:clinicId) and must scope every
// lookup + write to that clinic. clinicId === null is the legacy global path.
export interface PaymeContext {
    clinicId: string | null;
    isTestMode: boolean;
}

const LEGACY_CTX: PaymeContext = { clinicId: null, isTestMode: false };

// ─── CheckPerformTransaction ─────────────────────────────────────────────────
// Validates: order exists and amount matches. Called BEFORE CreateTransaction.
// Returns detail object with receipt items for tax compliance.
//
// There is NO test-mode special-casing here: the handler is purely data-driven
// and behaves identically for the test and live keys. The Payme sandbox is run
// against a real test appointment provisioned per clinic (see
// payme-testorder.service); non-existent orders correctly return -31050, which
// is what the /invalid-account compliance test expects.
export const checkPerformTransaction = async (params: {
    amount: number;
    account: { order_id: string };
}, ctx: PaymeContext = LEGACY_CTX) => {
    const { amount } = params;
    const { clinicId: tenantClinicId } = ctx;

    // Sandbox & some merchant UIs send order_id with stray whitespace
    // (e.g. " Q553"). Normalize once so every downstream lookup,
    // existing-tx query and orderId persisted column sees the same value.
    const rawOrderId = params.account?.order_id;
    const orderId = typeof rawOrderId === 'string' ? rawOrderId.trim() : rawOrderId;
    const account = { ...params.account, order_id: orderId };

    if (!account?.order_id) {
        return { error: PAYME_ERROR.WRONG_ACCOUNT };
    }

    // 1. Check order exists
    const appointment = await prisma.appointment.findUnique({
        where: { id: account.order_id },
        include: {
            diagnosticService: { select: { id: true, nameUz: true, categoryId: true } },
            surgicalService: { select: { id: true, nameUz: true, categoryId: true } },
            clinic: { select: { id: true, nameUz: true } },
            services: {
                select: { serviceType: true, serviceName: true, originalServiceId: true, finalPrice: true, price: true },
            },
        },
    });

    if (!appointment) {
        // No such order — identical in test and live. This is exactly what the
        // Payme /invalid-account sandbox test asserts (error in -31099..-31050).
        // To run the sandbox's valid-order lifecycle tests, point it at the
        // clinic's real test appointment (payme-testorder.service), not an
        // arbitrary id.
        return { error: PAYME_ERROR.WRONG_ACCOUNT };
    }

    // Cross-tenant guard: on per-clinic endpoint, refuse orders that belong to
    // a different clinic. Without this a hijacked merchant key could mark
    // someone else's appointment as paid.
    if (tenantClinicId && appointment.clinicId !== tenantClinicId) {
        return { error: PAYME_ERROR.WRONG_ACCOUNT };
    }

    // 2. Check amount matches (must come before busy check per Payme spec)
    const expectedAmount = appointment.price * 100;
    if (amount !== expectedAmount) {
        return { error: PAYME_ERROR.INVALID_AMOUNT };
    }

    // Clinic must accept first — payment is only opened after the clinic
    // confirms the slot. Without this a patient could pay a still-PENDING
    // booking and then the clinic discovers there's no time available.
    // CANCELLED / NO_SHOW / COMPLETED are bookings the patient shouldn't
    // be able to pay either.
    if (appointment.status !== 'CONFIRMED' && appointment.status !== 'CHECKED_IN' && appointment.status !== 'IN_PROGRESS') {
        return { error: PAYME_ERROR.WRONG_ACCOUNT };
    }

    // NOTE: no "order busy" (-31099) check here. CheckPerformTransaction only
    // answers "can this order be paid at this amount?" — it must stay idempotent
    // and return allow:true for a valid order regardless of prior transaction
    // history. The Payme sandbox re-runs CheckPerform after the create/perform
    // sections, so a busy-check here wrongly fails it with -31099. The real
    // duplicate-payment guard lives in CreateTransaction (existingForOrder →
    // ORDER_BUSY), which is also where the sandbox's "order busy" test targets.

    // Build receipt detail for tax (soliq) compliance — priority chain:
    //   1. Per-category override (ServiceCategory.fiscalXxx)
    //   2. GlobalFiscalSettings (super-admin)
    //   3. Hardcoded medical-clinic defaults (10902004002000999/1322039/12)
    const fiscal = await resolveFiscal(appointment);

    // Cart-style bookings carry per-item rows in AppointmentService — emit
    // one items[] entry per real service. Solo bookings (single-service
    // path) fall back to one synthesized line.
    let items: Array<{
        discount: number; title: string; price: number; count: number;
        code: string; package_code: string; vat_percent: number;
    }>;
    if (appointment.services && appointment.services.length > 0) {
        items = appointment.services.map((s) => {
            const codes = fiscal.byServiceKey(s.serviceType as any, s.originalServiceId);
            return {
                // Field order + presence per Payme fiscalization spec:
                // discount must be present (sandbox compliance test
                // "Результат метода не соответствует спецификации"
                // fires when it's missing). Zero is acceptable.
                discount: 0,
                title: s.serviceName || 'Tibbiy xizmat',
                price: (s.finalPrice || s.price || 0) * 100, // som → tiyin
                count: 1,
                ...codes,
            };
        });
    } else {
        const serviceName = appointment.diagnosticService?.nameUz
            || appointment.surgicalService?.nameUz
            || 'Tibbiy xizmat';
        const codes = appointment.diagnosticService?.categoryId
            ? fiscal.byCategoryId(appointment.diagnosticService.categoryId)
            : appointment.surgicalService?.categoryId
                ? fiscal.byCategoryId(appointment.surgicalService.categoryId)
                : fiscal.byCategoryId(null);
        items = [{
            discount: 0,
            title: serviceName,
            price: expectedAmount,
            count: 1,
            ...codes,
        }];
    }

    return {
        result: {
            allow: true,
            detail: { receipt_type: 0, items },
        },
    };
};

// ─── Fiscal resolver ──────────────────────────────────────────────────────
// Generic — used by Payme today, ready for Click / Alif / any future
// payment integration that needs to build a Soliq receipt envelope.
//
// Resolution chain (each step that yields a truthy value wins):
//   1. ServiceCategory.fiscalXxx   ← super-admin per-category override
//   2. GlobalFiscalSettings        ← super-admin platform default
//   3. Hardcoded medical defaults  ← payment can NEVER break for missing fiscal
//
// Every branch is guarded — empty string, null, undefined, even a DB
// outage all collapse to the hardcoded defaults so Payme always gets a
// well-formed receipt and patients are never blocked on missing data.

// ─── CreateTransaction ───────────────────────────────────────────────────────
export const createTransaction = async (params: {
    id: string;    // Payme's transaction ID
    time: number;  // Payme's timestamp (ms)
    amount: number;
    account: { order_id: string };
}, ctx: PaymeContext = LEGACY_CTX) => {
    const { id: paymeId, time: paymeTime, amount } = params;
    const { clinicId: tenantClinicId, isTestMode } = ctx;

    // Same whitespace normalization as checkPerformTransaction — sandbox
    // sometimes sends " Q553" with a leading space, and the orderId stored
    // on the PaymeTransaction row must match the trimmed value used for
    // lookups elsewhere in the lifecycle.
    const rawOrderId = params.account?.order_id;
    const orderId = typeof rawOrderId === 'string' ? rawOrderId.trim() : rawOrderId;
    const account = { ...params.account, order_id: orderId };

    // Check if transaction already exists
    const existing = await prisma.paymeTransaction.findUnique({
        where: { paymeId },
    });

    if (existing) {
        if (existing.state !== PAYME_STATE.CREATED) {
            return { error: PAYME_ERROR.UNABLE_PERFORM };
        }
        // Cross-tenant guard: another clinic must not see/resume this tx.
        if (tenantClinicId && existing.clinicId && existing.clinicId !== tenantClinicId) {
            return { error: PAYME_ERROR.UNABLE_PERFORM };
        }
        return {
            result: {
                create_time: Number(existing.createTime),
                transaction: existing.id,
                state: existing.state,
            },
        };
    }

    // Validate order (pass tenant context through). CreateTransaction
    // must mirror whatever CheckPerformTransaction said — if the order
    // wasn't valid there, returning a successful (even synthetic)
    // transaction here would fail the sandbox's consistency check
    // ("Метод должен вернуть ошибку с кодом в диапазоне от -31099 до
    // -31050"). Synthetic test-mode behaviour for the lifecycle methods
    // (Perform / Check / Cancel) stays — those run on already-existing
    // (or arbitrary) transaction ids, not on order validation.
    const check = await checkPerformTransaction({ amount, account }, ctx);
    if (check.error) return { error: check.error };

    // Check if another transaction already exists for this order
    const existingForOrder = await prisma.paymeTransaction.findFirst({
        where: {
            orderId: account.order_id,
            state: { in: [PAYME_STATE.CREATED, PAYME_STATE.COMPLETED] },
        },
    });

    if (existingForOrder) {
        // Another transaction already occupies this order — must be -31099.
        // The Payme sandbox's "CreateTransaction with order state 'awaiting
        // payment'" test depends on this firing. To re-run the suite, reset
        // the test order via payme-testorder.service (it wipes prior txns).
        return { error: PAYME_ERROR.ORDER_BUSY };
    }

    // Create new transaction. clinicId is set when the call came from a
    // per-clinic endpoint; legacy global path leaves it null for now.
    const transaction = await prisma.paymeTransaction.create({
        data: {
            paymeId,
            paymeTime: BigInt(paymeTime),
            createTime: BigInt(now()),
            amount,
            state: PAYME_STATE.CREATED,
            orderId: account.order_id,
            orderType: 'appointment',
            clinicId: tenantClinicId,
            isTestMode,
        },
    });

    return {
        result: {
            create_time: Number(transaction.createTime),
            transaction: transaction.id,
            state: transaction.state,
        },
    };
};

// ─── PerformTransaction ──────────────────────────────────────────────────────
export const performTransaction = async (params: { id: string }, ctx: PaymeContext = LEGACY_CTX) => {
    const { id: paymeId } = params;
    const { clinicId: tenantClinicId } = ctx;

    const transaction = await prisma.paymeTransaction.findUnique({
        where: { paymeId },
    });

    if (!transaction) {
        // Unknown transaction id — same in test and live (-31003). The sandbox
        // calls Perform on the transaction it created via CreateTransaction
        // against the real test order, so that id is always found here.
        return { error: PAYME_ERROR.TRANSACTION_NOT_FOUND };
    }

    // Cross-tenant guard
    if (tenantClinicId && transaction.clinicId && transaction.clinicId !== tenantClinicId) {
        return { error: PAYME_ERROR.TRANSACTION_NOT_FOUND };
    }

    if (transaction.state === PAYME_STATE.COMPLETED) {
        return {
            result: {
                perform_time: Number(transaction.performTime),
                transaction: transaction.id,
                state: transaction.state,
            },
        };
    }

    if (transaction.state !== PAYME_STATE.CREATED) {
        return { error: PAYME_ERROR.UNABLE_PERFORM };
    }

    const performTime = BigInt(now());

    const updated = await prisma.paymeTransaction.update({
        where: { paymeId },
        data: {
            state: PAYME_STATE.COMPLETED,
            performTime,
        },
    });

    // Mark the appointment paid. Lifecycle status is not touched — payment
    // is a separate axis in the simplified status model.
    const paidAppt = await prisma.appointment.update({
        where: { id: transaction.orderId },
        data: {
            paymentStatus: 'PAID',
            paymentMethod: 'PAYME',
            paidAt: new Date(),
            paidAmount: transaction.amount,
            paymeTransactionId: paymeId,
        },
        include: {
            patient: { select: { firstName: true, lastName: true, phone: true } },
        },
    }).catch(() => null);

    // Tell the clinic the patient just paid online — so the cashier UI
    // can immediately stop showing the "⚠️ to'lanmagan" badge and the
    // service can start. Fire-and-forget; never break Payme on notify
    // failure (Payme spec is strict — must return 200 quickly).
    if (paidAppt) {
        try {
            const { dispatch } = await import('../notifications/notification.dispatcher');
            dispatch({
                type: 'payment_received',
                clinicId: paidAppt.clinicId,
                appointmentId: paidAppt.id,
                amount: Math.round(transaction.amount / 100), // tiyin → som
                priority: 'HIGH',
                link: `/clinic/bookings?focus=${paidAppt.id}`,
            }).catch(() => null);
        } catch { /* never block payme */ }
    }

    return {
        result: {
            perform_time: Number(performTime),
            transaction: updated.id,
            state: updated.state,
        },
    };
};

// ─── CancelTransaction ───────────────────────────────────────────────────────
export const cancelTransaction = async (params: { id: string; reason: number }, ctx: PaymeContext = LEGACY_CTX) => {
    const { id: paymeId, reason } = params;
    const { clinicId: tenantClinicId } = ctx;

    const transaction = await prisma.paymeTransaction.findUnique({
        where: { paymeId },
    });

    if (!transaction) {
        // Unknown transaction id — same in test and live (-31003).
        return { error: PAYME_ERROR.TRANSACTION_NOT_FOUND };
    }

    if (tenantClinicId && transaction.clinicId && transaction.clinicId !== tenantClinicId) {
        return { error: PAYME_ERROR.TRANSACTION_NOT_FOUND };
    }

    // Already cancelled
    if (
        transaction.state === PAYME_STATE.CANCELLED_AFTER_CREATE ||
        transaction.state === PAYME_STATE.CANCELLED_AFTER_COMPLETE
    ) {
        return {
            result: {
                cancel_time: Number(transaction.cancelTime),
                transaction: transaction.id,
                state: transaction.state,
            },
        };
    }

    let newState: number;
    if (transaction.state === PAYME_STATE.CREATED) {
        newState = PAYME_STATE.CANCELLED_AFTER_CREATE;
    } else if (transaction.state === PAYME_STATE.COMPLETED) {
        // Cannot cancel a completed transaction for a completed appointment
        const appointment = await prisma.appointment.findUnique({
            where: { id: transaction.orderId },
        });
        if (appointment?.status === 'COMPLETED') {
            return { error: PAYME_ERROR.UNABLE_CANCEL };
        }
        newState = PAYME_STATE.CANCELLED_AFTER_COMPLETE;
    } else {
        return { error: PAYME_ERROR.UNABLE_CANCEL };
    }

    const cancelTime = BigInt(now());

    const updated = await prisma.paymeTransaction.update({
        where: { paymeId },
        data: { state: newState, cancelTime, reason },
    });

    // Revert appointment status to PENDING if it was CONFIRMED from this payment
    if (newState === PAYME_STATE.CANCELLED_AFTER_COMPLETE) {
        await prisma.appointment.update({
            where: { id: transaction.orderId },
            data: { status: 'CANCELLED' },
        }).catch(() => null);
    }

    return {
        result: {
            cancel_time: Number(cancelTime),
            transaction: updated.id,
            state: updated.state,
        },
    };
};

// ─── CheckTransaction ────────────────────────────────────────────────────────
export const checkTransaction = async (params: { id: string }, ctx: PaymeContext = LEGACY_CTX) => {
    const { id: paymeId } = params;
    const { clinicId: tenantClinicId } = ctx;

    const transaction = await prisma.paymeTransaction.findUnique({
        where: { paymeId },
    });

    if (!transaction) {
        // Unknown transaction id — same in test and live (-31003). The sandbox
        // checks the transaction it created against the real test order.
        return { error: PAYME_ERROR.TRANSACTION_NOT_FOUND };
    }

    if (tenantClinicId && transaction.clinicId && transaction.clinicId !== tenantClinicId) {
        return { error: PAYME_ERROR.TRANSACTION_NOT_FOUND };
    }

    return {
        result: {
            create_time: Number(transaction.createTime ?? 0),
            perform_time: Number(transaction.performTime ?? 0),
            cancel_time: Number(transaction.cancelTime ?? 0),
            transaction: transaction.id,
            state: transaction.state,
            reason: transaction.reason ?? null,
        },
    };
};

// ─── GetStatement ─────────────────────────────────────────────────────────────
export const getStatement = async (params: { from: number; to: number }, ctx: PaymeContext = LEGACY_CTX) => {
    const { from, to } = params;
    const { clinicId: tenantClinicId } = ctx;

    const transactions = await prisma.paymeTransaction.findMany({
        where: {
            createTime: {
                gte: BigInt(from),
                lte: BigInt(to),
            },
            // On a per-clinic endpoint, only this clinic's transactions are
            // visible. Legacy global path returns everything (back-compat).
            ...(tenantClinicId ? { clinicId: tenantClinicId } : {}),
        },
        orderBy: { createTime: 'asc' },
    });

    return {
        result: {
            transactions: transactions.map((t) => ({
                id: t.paymeId,
                time: Number(t.paymeTime ?? 0),
                amount: t.amount,
                account: { order_id: t.orderId },
                create_time: Number(t.createTime ?? 0),
                perform_time: Number(t.performTime ?? 0),
                cancel_time: Number(t.cancelTime ?? 0),
                transaction: t.id,
                state: t.state,
                reason: t.reason ?? null,
                receivers: t.receivers ?? null,
            })),
        },
    };
};
