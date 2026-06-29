import { Request, Response } from 'express';
import * as paymeService from './payme.service';
import type { PaymeContext } from './payme.service';
import { logWebhook } from './payme-webhook-log.service';

type JsonRpcRequest = {
    jsonrpc: string;
    id: number | string;
    method: string;
    params: Record<string, any>;
};

const reply = (res: Response, id: number | string, result?: any, error?: any) => {
    if (error) {
        return res.json({
            jsonrpc: '2.0',
            id,
            error: {
                code: error.code,
                message: error.message,
                data: error.data ?? null,
            },
        });
    }
    return res.json({ jsonrpc: '2.0', id, result });
};

export const handleMerchantApi = async (req: Request, res: Response) => {
    const startedAt = Date.now();
    const { id, method, params } = req.body as JsonRpcRequest;
    const ctx: PaymeContext = (req as any).paymeCtx
        ?? { clinicId: null, isTestMode: false };
    const tag = ctx.clinicId ? `Payme:${ctx.clinicId.slice(0, 8)}` : 'Payme:legacy';
    console.log(`[${tag}] method=${method} test=${ctx.isTestMode} order=${params?.account?.order_id ?? '-'}`);

    // Methods that move money / mutate transaction state. When the integration
    // is paused (isActive=false) AND the caller is using the LIVE key, refuse —
    // auth succeeded so we know the key matches, but the clinic admin has
    // turned the integration off. TEST-key callers (the Payme sandbox at
    // test.paycom.uz) are allowed through so onboarding's full flow can be
    // validated end-to-end BEFORE going live — no real money moves on a test
    // key, so the "paused" guard isn't protecting anything there.
    const STATE_MUTATING = new Set(['CreateTransaction', 'PerformTransaction', 'CancelTransaction']);

    let outcome: { result?: any; error?: any } = {};
    try {
        if ((ctx as any).isInactive && !ctx.isTestMode && STATE_MUTATING.has(method)) {
            outcome = { error: { code: -31008, message: 'Integration paused by clinic admin', data: null } };
        } else {
            switch (method) {
                case 'CheckPerformTransaction':
                    outcome = await paymeService.checkPerformTransaction(params as any, ctx);
                    break;
                case 'CreateTransaction':
                    outcome = await paymeService.createTransaction(params as any, ctx);
                    break;
                case 'PerformTransaction':
                    outcome = await paymeService.performTransaction(params as any, ctx);
                    break;
                case 'CancelTransaction':
                    outcome = await paymeService.cancelTransaction(params as any, ctx);
                    break;
                case 'CheckTransaction':
                    outcome = await paymeService.checkTransaction(params as any, ctx);
                    break;
                case 'GetStatement':
                    outcome = await paymeService.getStatement(params as any, ctx);
                    break;
                default:
                    outcome = { error: { code: -32601, message: 'Method not found', data: method } };
            }
        }
    } catch (err) {
        console.error(`[${tag}] Internal error:`, err);
        outcome = { error: { code: -32400, message: 'Внутренняя ошибка системы', data: null } };
    }

    const durationMs = Date.now() - startedAt;
    logWebhook({
        clinicId: ctx.clinicId,
        method,
        errorCode: outcome.error?.code ?? null,
        errorMsg: outcome.error?.message ?? null,
        orderId: params?.account?.order_id ?? null,
        paymeId: params?.id ?? null,
        durationMs,
        isTestMode: ctx.isTestMode,
        ip: (req.headers['x-forwarded-for'] as string)?.split(',')[0] ?? req.ip ?? null,
    });

    if (outcome.error) return reply(res, id, undefined, outcome.error);
    return reply(res, id, outcome.result);
};
