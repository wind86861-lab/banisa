import crypto from 'crypto';
import prisma from '../../config/database';
import { dispatch as dispatchNotification } from '../notifications/notification.dispatcher';
import { getGlobalSplitConfig, ResolvedSplitGlobalConfig } from './click-split-config.service';

// ─── Click SHOP SPLIT API ───────────────────────────────────────────────────
// The NEWER Click Shop API (Getinfo=0 / Prepare=1 / Confirm=2). Differs from the
// legacy click.service.ts (Prepare=0/Complete=1): identity is click_paydoc_id +
// attempt_trans_id, payload is a `params` object, and the signature hashes the
// concatenated params values (paramsIV). A single Banisa "Split-Shop" service
// receives every payment; the Prepare response returns the destination clinic's
// branch_id + bank rekvizit AND a `split[]` array dividing the amount between the
// Banisa (commission) and clinic counterparties.

export const SPLIT_ACTION = { GETINFO: 0, PREPARE: 1, CONFIRM: 2 } as const;

export const SPLIT_ERROR = {
    SUCCESS: { code: 0, note: 'Success' },
    SIGN_FAILED: { code: -1, note: 'SIGN CHECK FAILED!' },
    INVALID_AMOUNT: { code: -2, note: 'Incorrect parameter amount' },
    ACTION_NOT_FOUND: { code: -3, note: 'Action not found' },
    ALREADY_PAID: { code: -4, note: 'Already paid' },
    USER_NOT_FOUND: { code: -5, note: 'User does not exist by params' },
    TRANSACTION_NOT_FOUND: { code: -6, note: 'Transaction does not exist' },
    BAD_REQUEST: { code: -8, note: 'Error in request from click' },
    CANCELLED: { code: -9, note: 'Transaction cancelled' },
} as const;

const STATE = { PREPARED: 1, PAID: 2, CANCELLED: -1 } as const;

export interface SplitRequest {
    action?: number | string;
    click_paydoc_id?: number | string;
    attempt_trans_id?: number | string;
    service_id?: number | string;
    merchant_prepare_id?: number | string;
    sign_time?: string;
    sign_string?: string;
    params?: Record<string, any>;
    error?: number | string;
}

// paramsIV = every value of the params object concatenated in the order Click
// sent them. JSON.parse preserves insertion order for string keys, so
// Object.values() is faithful to the wire order.
function paramsIV(params: Record<string, any> | undefined): string {
    if (!params) return '';
    return Object.values(params).map((v) => (v == null ? '' : String(v))).join('');
}

// md5(click_paydoc_id + attempt_trans_id + service_id + SECRET + paramsIV + action + sign_time)
function computeSign(req: SplitRequest, secret: string): string {
    const parts = [
        String(req.click_paydoc_id ?? ''),
        String(req.attempt_trans_id ?? ''),
        String(req.service_id ?? ''),
        secret,
        paramsIV(req.params),
        String(req.action ?? ''),
        String(req.sign_time ?? ''),
    ];
    return crypto.createHash('md5').update(parts.join('')).digest('hex');
}

function err(req: SplitRequest, e: { code: number; note: string }, merchantPrepareId?: string | number) {
    return {
        click_paydoc_id: req.click_paydoc_id ?? '',
        attempt_trans_id: req.attempt_trans_id ?? '',
        ...(merchantPrepareId !== undefined ? { merchant_prepare_id: merchantPrepareId } : {}),
        error: e.code,
        error_note: e.note,
    };
}

// Pull the appointment reference out of params. Our checkout injects the
// appointment id (or bookingNumber) under `order_id`; accept a few aliases.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function extractOrderRef(params: Record<string, any> | undefined): string | null {
    if (!params) return null;
    const keys = ['order_id', 'appointment_id', 'transaction_param', 'booking', 'bookingNumber', 'contract'];
    for (const k of keys) {
        if (params[k] != null && String(params[k]).trim() !== '') return String(params[k]).trim();
    }
    // Fallback: Click's service form may name the field differently — take the
    // first UUID-shaped value (our appointment ids are UUIDs).
    for (const [k, v] of Object.entries(params)) {
        if (k === 'amount') continue;
        const s = v == null ? '' : String(v).trim();
        if (UUID_RE.test(s)) return s;
    }
    return null;
}

function extractAmount(params: Record<string, any> | undefined): number {
    if (!params) return NaN;
    return Number(params.amount);
}

export interface SplitWebhookResult {
    body: any;
    logMethod: string;
    logError: number;
    logErrMsg?: string;
}

export async function handleSplitWebhook(req: SplitRequest): Promise<SplitWebhookResult> {
    const action = Number(req.action);

    const cfg = await getGlobalSplitConfig();
    if (!cfg) {
        return { body: err(req, SPLIT_ERROR.BAD_REQUEST), logMethod: 'split', logError: SPLIT_ERROR.BAD_REQUEST.code, logErrMsg: 'no global split config' };
    }

    // Signature check for state-bearing actions (Prepare/Confirm always signed;
    // Getinfo carries no sign in the doc example, so skip it there).
    if (action === SPLIT_ACTION.PREPARE || action === SPLIT_ACTION.CONFIRM) {
        const expected = computeSign(req, cfg.secretKey);
        if (expected !== req.sign_string) {
            return { body: err(req, SPLIT_ERROR.SIGN_FAILED), logMethod: 'split', logError: SPLIT_ERROR.SIGN_FAILED.code, logErrMsg: 'sign mismatch' };
        }
    }

    if (action === SPLIT_ACTION.GETINFO) return getinfo(req);
    if (action === SPLIT_ACTION.PREPARE) return prepare(req, cfg);
    if (action === SPLIT_ACTION.CONFIRM) return confirm(req, cfg);

    return { body: err(req, SPLIT_ERROR.ACTION_NOT_FOUND), logMethod: 'split', logError: SPLIT_ERROR.ACTION_NOT_FOUND.code, logErrMsg: `action ${req.action}` };
}

// ─── Getinfo (action=0) — optional pre-payment display ──────────────────────
async function getinfo(req: SplitRequest): Promise<SplitWebhookResult> {
    const ref = extractOrderRef(req.params);
    if (!ref) {
        return { body: err(req, SPLIT_ERROR.USER_NOT_FOUND), logMethod: 'getinfo', logError: SPLIT_ERROR.USER_NOT_FOUND.code, logErrMsg: 'no order ref' };
    }
    const appt = await prisma.appointment.findFirst({
        where: { OR: [{ id: ref }, { bookingNumber: ref }] },
        select: {
            bookingNumber: true, finalPrice: true, price: true,
            patient: { select: { firstName: true, lastName: true } },
            clinic: { select: { nameUz: true } },
        },
    });
    if (!appt) {
        return { body: { error: SPLIT_ERROR.USER_NOT_FOUND.code, error_note: SPLIT_ERROR.USER_NOT_FOUND.note }, logMethod: 'getinfo', logError: SPLIT_ERROR.USER_NOT_FOUND.code };
    }
    return {
        body: {
            error: SPLIT_ERROR.SUCCESS.code,
            error_note: SPLIT_ERROR.SUCCESS.note,
            params: {
                booking: appt.bookingNumber,
                fio: [appt.patient?.firstName, appt.patient?.lastName].filter(Boolean).join(' '),
                clinic: appt.clinic?.nameUz ?? '',
                amount: appt.finalPrice || appt.price || 0,
            },
        },
        logMethod: 'getinfo',
        logError: 0,
    };
}

// ─── Prepare (action=1) — return branch_id + bank rekvizit + split[] ────────
async function prepare(req: SplitRequest, cfg: ResolvedSplitGlobalConfig): Promise<SplitWebhookResult> {
    const ref = extractOrderRef(req.params);
    const amount = extractAmount(req.params);

    if (!ref) {
        return { body: err(req, SPLIT_ERROR.USER_NOT_FOUND), logMethod: 'prepare', logError: SPLIT_ERROR.USER_NOT_FOUND.code, logErrMsg: 'no order ref' };
    }

    const appointment = await prisma.appointment.findFirst({
        where: { OR: [{ id: ref }, { bookingNumber: ref }] },
    });
    if (!appointment) {
        return { body: err(req, SPLIT_ERROR.USER_NOT_FOUND), logMethod: 'prepare', logError: SPLIT_ERROR.USER_NOT_FOUND.code, logErrMsg: 'appointment not found' };
    }
    if (appointment.paymentStatus === 'PAID') {
        return { body: err(req, SPLIT_ERROR.ALREADY_PAID), logMethod: 'prepare', logError: SPLIT_ERROR.ALREADY_PAID.code, logErrMsg: 'already paid' };
    }
    // Clinic must have accepted first (same gate as legacy/Payme).
    if (!['CONFIRMED', 'CHECKED_IN', 'IN_PROGRESS'].includes(appointment.status)) {
        return { body: err(req, SPLIT_ERROR.USER_NOT_FOUND), logMethod: 'prepare', logError: SPLIT_ERROR.USER_NOT_FOUND.code, logErrMsg: `status=${appointment.status}` };
    }

    const expectedAmount = Number(appointment.finalPrice || appointment.price || 0);
    if (!Number.isFinite(amount) || Math.abs(expectedAmount - amount) > 1) {
        return { body: err(req, SPLIT_ERROR.INVALID_AMOUNT), logMethod: 'prepare', logError: SPLIT_ERROR.INVALID_AMOUNT.code, logErrMsg: `expected ${expectedAmount} got ${amount}` };
    }

    // Resolve the clinic's split routing (branch_id + bank accounts + cntrg_id).
    const clinicSplit = await prisma.clinicClickSplitConfig.findUnique({ where: { clinicId: appointment.clinicId } });
    if (!clinicSplit || !clinicSplit.isConfigured || !clinicSplit.isActive) {
        return { body: err(req, SPLIT_ERROR.USER_NOT_FOUND), logMethod: 'prepare', logError: SPLIT_ERROR.USER_NOT_FOUND.code, logErrMsg: 'clinic split not configured/active' };
    }
    if (!cfg.banisaCntrgId || !clinicSplit.cntrgId) {
        return { body: err(req, SPLIT_ERROR.BAD_REQUEST), logMethod: 'prepare', logError: SPLIT_ERROR.BAD_REQUEST.code, logErrMsg: 'missing cntrg ids' };
    }

    // Split math — commission → Banisa, remainder → clinic. floor + subtract
    // guarantees the two shares sum EXACTLY to the payment amount (Click requires
    // sum(split) === amount).
    const total = Math.round(expectedAmount);
    const rate = appointment.commissionRate ?? 0;
    const commission = appointment.commissionAmount ?? Math.floor(total * rate);
    const banisaShare = Math.max(0, Math.min(commission, total));
    const clinicShare = total - banisaShare;

    // Persist the transaction (idempotent on click_paydoc_id + attempt).
    const txnKey = `${req.click_paydoc_id}:${req.attempt_trans_id}`;
    const txn = await prisma.clickTransaction.upsert({
        where: { clickTransId: txnKey },
        create: {
            clickTransId: txnKey,
            clickPaydocId: req.click_paydoc_id ? String(req.click_paydoc_id) : null,
            merchantTransId: appointment.id,
            amount: total,
            state: STATE.PREPARED,
            signTime: req.sign_time ? String(req.sign_time) : null,
            clinicId: appointment.clinicId,
            isTestMode: cfg.isTestMode,
            isSplit: true,
            splitBanisaAmount: banisaShare,
            splitClinicAmount: clinicShare,
        },
        update: {
            state: STATE.PREPARED,
            splitBanisaAmount: banisaShare,
            splitClinicAmount: clinicShare,
            updatedAt: new Date(),
        },
    });
    await prisma.clickTransaction.update({ where: { id: txn.id }, data: { merchantPrepareId: txn.id } });

    return {
        body: {
            click_paydoc_id: req.click_paydoc_id,
            attempt_trans_id: req.attempt_trans_id,
            merchant_prepare_id: txn.id,
            error: SPLIT_ERROR.SUCCESS.code,
            error_note: SPLIT_ERROR.SUCCESS.note,
            params: {
                branch_id: clinicSplit.branchId,
                payment_account: clinicSplit.paymentAccount,
                payment_mfo: clinicSplit.paymentMfo,
                transit_account: clinicSplit.transitAccount ?? '',
                transit_mfo: clinicSplit.transitMfo ?? '',
            },
            split: [
                { cntrg_id: cfg.banisaCntrgId, amount: banisaShare },
                { cntrg_id: clinicSplit.cntrgId, amount: clinicShare },
            ],
        },
        logMethod: 'prepare',
        logError: 0,
    };
}

// ─── Confirm (action=2) — money captured, mark the booking PAID ─────────────
async function confirm(req: SplitRequest, _cfg: ResolvedSplitGlobalConfig): Promise<SplitWebhookResult> {
    const merchantPrepareId = String(req.merchant_prepare_id ?? '');
    const upstreamError = Number(req.error ?? 0);

    const txn = await prisma.clickTransaction.findUnique({ where: { id: merchantPrepareId } });
    if (!txn) {
        return { body: err(req, SPLIT_ERROR.TRANSACTION_NOT_FOUND, merchantPrepareId), logMethod: 'confirm', logError: SPLIT_ERROR.TRANSACTION_NOT_FOUND.code, logErrMsg: 'prepare row not found' };
    }

    const appointment = await prisma.appointment.findUnique({ where: { id: txn.merchantTransId } });
    if (!appointment) {
        return { body: err(req, SPLIT_ERROR.USER_NOT_FOUND, merchantPrepareId), logMethod: 'confirm', logError: SPLIT_ERROR.USER_NOT_FOUND.code, logErrMsg: 'appointment not found' };
    }

    // Click signalled a cancellation → mark cancelled, return -9.
    if (upstreamError < 0) {
        await prisma.clickTransaction.update({ where: { id: txn.id }, data: { state: STATE.CANCELLED, updatedAt: new Date() } });
        return { body: err(req, SPLIT_ERROR.CANCELLED, merchantPrepareId), logMethod: 'confirm', logError: SPLIT_ERROR.CANCELLED.code, logErrMsg: `upstream ${upstreamError}` };
    }

    if (appointment.paymentStatus === 'PAID' || txn.state === STATE.PAID) {
        return { body: err(req, SPLIT_ERROR.ALREADY_PAID, merchantPrepareId), logMethod: 'confirm', logError: SPLIT_ERROR.ALREADY_PAID.code, logErrMsg: 'already paid' };
    }

    await prisma.$transaction([
        prisma.clickTransaction.update({ where: { id: txn.id }, data: { state: STATE.PAID, updatedAt: new Date() } }),
        prisma.appointment.update({
            where: { id: appointment.id },
            data: {
                paymentStatus: 'PAID',
                paymentMethod: 'CLICK',
                paidAmount: txn.amount,
                paidAt: new Date(),
                qrActivatedAt: new Date(),
            },
        }),
    ]);

    dispatchNotification({
        type: 'payment_received', userId: appointment.patientId, appointmentId: appointment.id,
        amount: txn.amount, priority: 'HIGH', link: `/user/appointments/${appointment.id}`,
    }).catch((e) => console.error('[click.split.confirm] notify patient failed:', e));
    dispatchNotification({
        type: 'payment_received', clinicId: appointment.clinicId, appointmentId: appointment.id,
        amount: txn.amount, priority: 'HIGH', link: `/clinic/bookings?focus=${appointment.id}`,
    }).catch((e) => console.error('[click.split.confirm] notify clinic failed:', e));

    return {
        body: {
            click_paydoc_id: req.click_paydoc_id,
            attempt_trans_id: req.attempt_trans_id,
            merchant_confirm_id: txn.id,
            error: SPLIT_ERROR.SUCCESS.code,
            error_note: SPLIT_ERROR.SUCCESS.note,
        },
        logMethod: 'confirm',
        logError: 0,
    };
}
