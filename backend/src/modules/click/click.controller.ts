import { Request, Response } from 'express';
import { handleWebhook, ClickRequest } from './click.service';
import { handleSplitWebhook, SplitRequest } from './click-split.service';
import { logWebhook } from './click-webhook-log.service';

// Per Click SHOP spec the response is ALWAYS HTTP 200 with a JSON body —
// even when we are rejecting the request. The non-zero `error` field in the
// body is how CLICK learns the call failed.
export const handleClickWebhook = async (req: Request, res: Response) => {
    const start = Date.now();
    const clinicId = String(req.params.clinicId || '');
    // CLICK posts both form-urlencoded and JSON depending on integration
    // template; accept either by merging.
    const body: ClickRequest = { ...(req.body || {}) };

    try {
        const result = await handleWebhook(clinicId, body);
        logWebhook({
            clinicId,
            method: result.logMethod,
            errorCode: result.logError ?? null,
            errorMsg: result.logErrMsg ?? null,
            orderId: body.merchant_trans_id ? String(body.merchant_trans_id) : null,
            clickTransId: body.click_trans_id ? String(body.click_trans_id) : null,
            durationMs: Date.now() - start,
            ip: (req.ip || req.headers['x-forwarded-for'] || '').toString(),
        });
        return res.status(200).json(result.body);
    } catch (e: any) {
        console.error('[click.webhook] unhandled:', e);
        logWebhook({
            clinicId,
            method: 'unhandled',
            errorCode: -8,
            errorMsg: e?.message ?? 'unknown',
            orderId: body.merchant_trans_id ? String(body.merchant_trans_id) : null,
            clickTransId: body.click_trans_id ? String(body.click_trans_id) : null,
            durationMs: Date.now() - start,
            ip: (req.ip || '').toString(),
        });
        return res.status(200).json({
            click_trans_id: String(body.click_trans_id ?? ''),
            merchant_trans_id: String(body.merchant_trans_id ?? ''),
            merchant_prepare_id: '',
            merchant_confirm_id: '',
            error: -8,
            error_note: 'Error in request from click',
        });
    }
};

// SHOP SPLIT webhook — single global Banisa service (no clinicId in the URL).
// Uses the newer Getinfo/Prepare/Confirm API and returns the split[] array.
export const handleClickSplitWebhook = async (req: Request, res: Response) => {
    const start = Date.now();
    const body: SplitRequest = { ...(req.body || {}) };
    try {
        const result = await handleSplitWebhook(body);
        logWebhook({
            clinicId: null,
            method: `split:${result.logMethod}`,
            errorCode: result.logError ?? null,
            errorMsg: result.logErrMsg ?? null,
            orderId: body.params ? String((body.params as any).order_id ?? '') : null,
            clickTransId: body.click_paydoc_id ? String(body.click_paydoc_id) : null,
            durationMs: Date.now() - start,
            ip: (req.ip || req.headers['x-forwarded-for'] || '').toString(),
        });
        return res.status(200).json(result.body);
    } catch (e: any) {
        console.error('[click.split.webhook] unhandled:', e);
        return res.status(200).json({
            click_paydoc_id: body.click_paydoc_id ?? '',
            attempt_trans_id: body.attempt_trans_id ?? '',
            error: -8,
            error_note: 'Error in request from click',
        });
    }
};
