import { Request, Response } from 'express';
import * as paymeService from './payme.service';

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
    const { id, method, params } = req.body as JsonRpcRequest;
    const isTestMode = !!(req as any).paymeTestMode;

    try {
        let outcome: { result?: any; error?: any };

        switch (method) {
            case 'CheckPerformTransaction':
                outcome = await paymeService.checkPerformTransaction(params as any, isTestMode);
                break;
            case 'CreateTransaction':
                outcome = await paymeService.createTransaction(params as any, isTestMode);
                break;
            case 'PerformTransaction':
                outcome = await paymeService.performTransaction(params as any);
                break;
            case 'CancelTransaction':
                outcome = await paymeService.cancelTransaction(params as any);
                break;
            case 'CheckTransaction':
                outcome = await paymeService.checkTransaction(params as any);
                break;
            case 'GetStatement':
                outcome = await paymeService.getStatement(params as any);
                break;
            default:
                return reply(res, id, undefined, {
                    code: -32601,
                    message: 'Method not found',
                    data: method,
                });
        }

        if (outcome.error) return reply(res, id, undefined, outcome.error);
        return reply(res, id, outcome.result);
    } catch (err) {
        console.error('[Payme] Internal error:', err);
        return reply(res, id, undefined, {
            code: -32400,
            message: 'Internal system error',
            data: null,
        });
    }
};
