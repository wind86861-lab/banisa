import crypto from 'crypto';
import prisma from '../../config/database';
import { dispatch as dispatchNotification } from '../notifications/notification.dispatcher';
import { getConfigForClinic, ResolvedClickConfig, touchLastUsed } from './click-config.service';

// ─── Click SHOP API constants ───────────────────────────────────────────────
export const CLICK_ACTION = {
    PREPARE: 0,
    COMPLETE: 1,
} as const;

export const CLICK_ERROR = {
    SUCCESS:               { code: 0,  note: 'Success' },
    SIGN_CHECK_FAILED:     { code: -1, note: 'SIGN CHECK FAILED!' },
    INVALID_AMOUNT:        { code: -2, note: 'Incorrect parameter amount' },
    ACTION_NOT_FOUND:      { code: -3, note: 'Action not found' },
    ALREADY_PAID:          { code: -4, note: 'Already paid' },
    USER_NOT_FOUND:        { code: -5, note: 'User does not exist' },
    TRANSACTION_NOT_FOUND: { code: -6, note: 'Transaction does not exist' },
    BAD_REQUEST:           { code: -8, note: 'Error in request from click' },
    CANCELLED:             { code: -9, note: 'Transaction cancelled' },
} as const;

// ─── ClickTransaction state ──────────────────────────────────────────────────
export const CLICK_STATE = {
    DRAFT: 0,
    PREPARED: 1,
    PAID: 2,
    CANCELLED: -1,
} as const;

// ─── Inbound request shape ───────────────────────────────────────────────────
export interface ClickRequest {
    click_trans_id?: string;
    service_id?: string;
    click_paydoc_id?: string;
    merchant_trans_id?: string;
    merchant_prepare_id?: string;
    amount?: string | number;
    action?: string | number;
    error?: string | number;
    error_note?: string;
    sign_time?: string;
    sign_string?: string;
}

export interface ClickResponse {
    click_trans_id: string;
    merchant_trans_id: string;
    merchant_prepare_id?: number | string;
    merchant_confirm_id?: number | string;
    error: number;
    error_note: string;
}

// Required-field shape — mirrors the PHP reference (every Prepare AND Complete
// must carry these). merchant_prepare_id is only required for action=1.
function isMissingRequiredFields(req: ClickRequest): boolean {
    const action = Number(req.action);
    const baseOk =
        req.click_trans_id !== undefined &&
        req.service_id !== undefined &&
        req.merchant_trans_id !== undefined &&
        req.amount !== undefined &&
        req.action !== undefined &&
        req.error !== undefined &&
        req.error_note !== undefined &&
        req.sign_time !== undefined &&
        req.sign_string !== undefined &&
        req.click_paydoc_id !== undefined;
    if (!baseOk) return true;
    if (action === CLICK_ACTION.COMPLETE && req.merchant_prepare_id === undefined) return true;
    return false;
}

// Compute the md5 signature the way CLICK does it. Prepare and Complete share
// the same base; Complete inserts merchant_prepare_id between merchant_trans_id
// and amount.
//
//   prepare:  md5(click_trans_id + service_id + secret_key + merchant_trans_id + amount + action + sign_time)
//   complete: md5(click_trans_id + service_id + secret_key + merchant_trans_id + merchant_prepare_id + amount + action + sign_time)
function expectedSignature(req: ClickRequest, secretKey: string): string {
    const action = Number(req.action);
    const parts: string[] = [
        String(req.click_trans_id),
        String(req.service_id),
        secretKey,
        String(req.merchant_trans_id),
        action === CLICK_ACTION.COMPLETE ? String(req.merchant_prepare_id) : '',
        String(req.amount),
        String(req.action),
        String(req.sign_time),
    ];
    return crypto.createHash('md5').update(parts.join('')).digest('hex');
}

function buildError(req: ClickRequest, err: { code: number; note: string }, merchantPrepareId?: string): ClickResponse {
    return {
        click_trans_id: String(req.click_trans_id ?? ''),
        merchant_trans_id: String(req.merchant_trans_id ?? ''),
        merchant_prepare_id: merchantPrepareId ?? '',
        merchant_confirm_id: '',
        error: err.code,
        error_note: err.note,
    };
}

// ─── Handler ────────────────────────────────────────────────────────────────
// Single entry-point — the public webhook controller posts the body in here
// along with the clinicId from the URL path. Returns the JSON the controller
// should echo back to CLICK.
export async function handleWebhook(clinicId: string, req: ClickRequest): Promise<{
    body: ClickResponse;
    logMethod: string;        // for ClickWebhookLog
    logError?: number;
    logErrMsg?: string;
}> {
    // 0. Shape check FIRST so we never deref undefined into the sig calc.
    if (isMissingRequiredFields(req)) {
        return {
            body: buildError(req, CLICK_ERROR.BAD_REQUEST),
            logMethod: 'badRequest',
            logError: CLICK_ERROR.BAD_REQUEST.code,
            logErrMsg: CLICK_ERROR.BAD_REQUEST.note,
        };
    }

    // 1. Resolve the clinic's config (decrypted secret_key). We ignore
    // isActive here — authentication is independent of the integration's
    // on/off state. The state-mutating Complete action below refuses when
    // isActive=false (treated like sign-check fail so CLICK retries) while
    // read-only flows (Prepare for a non-existent self-test order) can
    // still validate the key end-to-end.
    const cfg = await getConfigForClinic(clinicId);
    if (!cfg) {
        return {
            body: buildError(req, CLICK_ERROR.SIGN_CHECK_FAILED),
            logMethod: 'AuthFailed',
            logError: CLICK_ERROR.SIGN_CHECK_FAILED.code,
            logErrMsg: 'No config for clinic',
        };
    }

    // service_id sent by CLICK must match the one this clinic is registered
    // under. A mismatch usually means someone pointed a different service at
    // our webhook URL.
    if (String(req.service_id) !== String(cfg.serviceId)) {
        return {
            body: buildError(req, CLICK_ERROR.SIGN_CHECK_FAILED),
            logMethod: 'AuthFailed',
            logError: CLICK_ERROR.SIGN_CHECK_FAILED.code,
            logErrMsg: 'service_id mismatch',
        };
    }

    // 2. Signature check — use sandbox key when CLICK is calling us in test
    // mode and we have one configured; otherwise fall back to prod.
    const activeKey = (cfg.isTestMode && cfg.testKey) ? cfg.testKey : cfg.prodKey;
    const expected = expectedSignature(req, activeKey);
    if (expected !== req.sign_string) {
        return {
            body: buildError(req, CLICK_ERROR.SIGN_CHECK_FAILED),
            logMethod: 'AuthFailed',
            logError: CLICK_ERROR.SIGN_CHECK_FAILED.code,
            logErrMsg: 'sign_string mismatch',
        };
    }

    // 3. Action branch.
    const action = Number(req.action);
    // Refuse state-mutating Complete when the integration is paused. Sign
    // check has already passed so this is a "you authenticated but the
    // clinic admin turned the integration off" scenario.
    if (!cfg.isActive && action === CLICK_ACTION.COMPLETE) {
        return {
            body: buildError(req, CLICK_ERROR.SIGN_CHECK_FAILED),
            logMethod: 'Complete',
            logError: CLICK_ERROR.SIGN_CHECK_FAILED.code,
            logErrMsg: 'Integration paused by clinic admin',
        };
    }
    if (action === CLICK_ACTION.PREPARE) return prepare(req, cfg);
    if (action === CLICK_ACTION.COMPLETE) return complete(req, cfg);

    return {
        body: buildError(req, CLICK_ERROR.ACTION_NOT_FOUND),
        logMethod: 'unknownAction',
        logError: CLICK_ERROR.ACTION_NOT_FOUND.code,
        logErrMsg: `action=${action}`,
    };
}

// ─── Prepare (action=0) ─────────────────────────────────────────────────────
// CLICK asks "does this order exist and is the amount right?". We validate,
// create a ClickTransaction in state PREPARED, and echo merchant_prepare_id
// back so CLICK can include it in the follow-up Complete call.
async function prepare(req: ClickRequest, cfg: ResolvedClickConfig) {
    const merchantTransId = String(req.merchant_trans_id);
    const clickAmount = Number(req.amount);

    // Find the appointment. We accept either the appointment.id (UUID) or the
    // human-readable bookingNumber — patients sometimes paste the latter into
    // the test sandbox.
    const appointment = await prisma.appointment.findFirst({
        where: {
            OR: [
                { id: merchantTransId },
                { bookingNumber: merchantTransId },
            ],
            clinicId: cfg.clinicId,
        },
    });
    if (!appointment) {
        return {
            body: buildError(req, CLICK_ERROR.USER_NOT_FOUND),
            logMethod: 'prepare',
            logError: CLICK_ERROR.USER_NOT_FOUND.code,
            logErrMsg: 'appointment not found',
        };
    }

    // Idempotent: already paid → tell CLICK and bail.
    if (appointment.paymentStatus === 'PAID') {
        return {
            body: buildError(req, CLICK_ERROR.ALREADY_PAID),
            logMethod: 'prepare',
            logError: CLICK_ERROR.ALREADY_PAID.code,
            logErrMsg: 'paymentStatus already PAID',
        };
    }

    // Amount check (CLICK posts som as a decimal; our finalPrice is integer
    // som. Allow ±1 som rounding wiggle.)
    const expectedAmount = Number(appointment.finalPrice || appointment.price || 0);
    if (Math.abs(expectedAmount - clickAmount) > 1) {
        return {
            body: buildError(req, CLICK_ERROR.INVALID_AMOUNT),
            logMethod: 'prepare',
            logError: CLICK_ERROR.INVALID_AMOUNT.code,
            logErrMsg: `expected ${expectedAmount} got ${clickAmount}`,
        };
    }

    // Persist the transaction row. clickTransId is unique → upsert.
    const txn = await prisma.clickTransaction.upsert({
        where: { clickTransId: String(req.click_trans_id) },
        create: {
            clickTransId: String(req.click_trans_id),
            clickPaydocId: req.click_paydoc_id ? String(req.click_paydoc_id) : null,
            merchantTransId: appointment.id,
            amount: Math.round(clickAmount),
            state: CLICK_STATE.PREPARED,
            signTime: req.sign_time ? String(req.sign_time) : null,
            clinicId: cfg.clinicId,
            isTestMode: cfg.isTestMode,
        },
        update: {
            state: CLICK_STATE.PREPARED,
            signTime: req.sign_time ? String(req.sign_time) : null,
            updatedAt: new Date(),
        },
    });

    // Stamp merchant_prepare_id = our row id so CLICK can echo it back later.
    await prisma.clickTransaction.update({
        where: { id: txn.id },
        data: { merchantPrepareId: txn.id },
    });

    touchLastUsed(cfg.configId);

    return {
        body: {
            click_trans_id: String(req.click_trans_id),
            merchant_trans_id: appointment.id,
            merchant_prepare_id: txn.id,
            merchant_confirm_id: txn.id,
            error: CLICK_ERROR.SUCCESS.code,
            error_note: CLICK_ERROR.SUCCESS.note,
        },
        logMethod: 'prepare',
        logError: 0,
    };
}

// ─── Complete (action=1) ────────────────────────────────────────────────────
// CLICK confirms the card was charged. Flip the appointment to PAID + dispatch
// the payment_received notification. If CLICK sends a negative `error` field
// itself (user cancelled, refund, …) we move the txn to CANCELLED and tell
// CLICK -9.
async function complete(req: ClickRequest, cfg: ResolvedClickConfig) {
    const clickAmount = Number(req.amount);
    const merchantPrepareId = String(req.merchant_prepare_id);
    const upstreamError = Number(req.error);

    // The Prepare row must exist (CLICK should never Complete without a
    // successful Prepare).
    const txn = await prisma.clickTransaction.findUnique({
        where: { id: merchantPrepareId },
    });
    if (!txn || txn.clinicId !== cfg.clinicId) {
        return {
            body: buildError(req, CLICK_ERROR.TRANSACTION_NOT_FOUND, merchantPrepareId),
            logMethod: 'complete',
            logError: CLICK_ERROR.TRANSACTION_NOT_FOUND.code,
            logErrMsg: 'prepare row not found',
        };
    }

    const appointment = await prisma.appointment.findUnique({
        where: { id: txn.merchantTransId },
    });
    if (!appointment) {
        return {
            body: buildError(req, CLICK_ERROR.USER_NOT_FOUND, merchantPrepareId),
            logMethod: 'complete',
            logError: CLICK_ERROR.USER_NOT_FOUND.code,
            logErrMsg: 'appointment not found',
        };
    }

    // CLICK signalled a cancellation — flip state, tell them -9.
    if (upstreamError < 0) {
        await prisma.clickTransaction.update({
            where: { id: txn.id },
            data: { state: CLICK_STATE.CANCELLED, updatedAt: new Date() },
        });
        return {
            body: {
                click_trans_id: String(req.click_trans_id),
                merchant_trans_id: appointment.id,
                merchant_prepare_id: txn.id,
                merchant_confirm_id: txn.id,
                error: CLICK_ERROR.CANCELLED.code,
                error_note: CLICK_ERROR.CANCELLED.note,
            },
            logMethod: 'complete',
            logError: CLICK_ERROR.CANCELLED.code,
            logErrMsg: `upstream error ${upstreamError}`,
        };
    }

    // Idempotent: if already PAID, tell CLICK -4.
    if (appointment.paymentStatus === 'PAID' || txn.state === CLICK_STATE.PAID) {
        return {
            body: buildError(req, CLICK_ERROR.ALREADY_PAID, merchantPrepareId),
            logMethod: 'complete',
            logError: CLICK_ERROR.ALREADY_PAID.code,
            logErrMsg: 'already paid',
        };
    }

    // Cross-check amount one more time.
    const expectedAmount = Number(appointment.finalPrice || appointment.price || 0);
    if (Math.abs(expectedAmount - clickAmount) > 1) {
        return {
            body: buildError(req, CLICK_ERROR.INVALID_AMOUNT, merchantPrepareId),
            logMethod: 'complete',
            logError: CLICK_ERROR.INVALID_AMOUNT.code,
            logErrMsg: `expected ${expectedAmount} got ${clickAmount}`,
        };
    }

    // All checks passed — mark paid.
    await prisma.$transaction([
        prisma.clickTransaction.update({
            where: { id: txn.id },
            data: { state: CLICK_STATE.PAID, updatedAt: new Date() },
        }),
        prisma.appointment.update({
            where: { id: appointment.id },
            data: {
                paymentStatus: 'PAID',
                paymentMethod: 'CLICK',
                paidAmount: Math.round(clickAmount),
                paidAt: new Date(),
                qrActivatedAt: new Date(),
            },
        }),
    ]);

    touchLastUsed(cfg.configId);

    // Best-effort: tell the patient.
    dispatchNotification({
        type: 'payment_received',
        userId: appointment.patientId,
        appointmentId: appointment.id,
        amount: Math.round(clickAmount),
        priority: 'HIGH',
        link: `/user/appointments/${appointment.id}`,
    }).catch((e) => console.error('[click.complete] notify failed:', e));

    return {
        body: {
            click_trans_id: String(req.click_trans_id),
            merchant_trans_id: appointment.id,
            merchant_prepare_id: txn.id,
            merchant_confirm_id: txn.id,
            error: CLICK_ERROR.SUCCESS.code,
            error_note: CLICK_ERROR.SUCCESS.note,
        },
        logMethod: 'complete',
        logError: 0,
    };
}
