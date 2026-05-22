import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { handleMerchantApi } from './payme.controller';
import { env } from '../../config/env';

const router = Router();

// ─── Payme Basic Auth middleware ──────────────────────────────────────────────
// Payme sends:  Authorization: Basic base64("Paycom:<password>")
// IMPORTANT: Payme spec requires ALL responses (including auth errors) to return HTTP 200
const UNAUTHORIZED_RESPONSE = {
    jsonrpc: '2.0',
    id: null,
    error: { code: -32504, message: 'Unauthorized', data: null },
};

const paymeAuth = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers['authorization'] || '';

    if (!authHeader.startsWith('Basic ')) {
        return res.status(200).json(UNAUTHORIZED_RESPONSE);
    }

    try {
        const base64 = authHeader.slice(6); // strip "Basic "
        const decoded = Buffer.from(base64, 'base64').toString('utf8');
        const colonIdx = decoded.indexOf(':');
        const login = decoded.slice(0, colonIdx);
        const password = decoded.slice(colonIdx + 1);

        // In production we accept only the prod key — the test key bypasses
        // order/amount checks for "Q####" sandbox IDs (see payme.service.ts)
        // and would let anyone who learns it fabricate paid transactions.
        const candidates = env.NODE_ENV === 'production'
            ? [{ key: env.PAYME_PROD_KEY, test: false }]
            : [
                { key: env.PAYME_PROD_KEY, test: false },
                { key: env.PAYME_TEST_KEY, test: true },
              ];

        const pwBuf = Buffer.from(password);
        let matched: { test: boolean } | null = null;
        for (const c of candidates) {
            if (!c.key) continue;
            const keyBuf = Buffer.from(c.key);
            if (keyBuf.length !== pwBuf.length) continue;
            if (crypto.timingSafeEqual(keyBuf, pwBuf)) {
                matched = { test: c.test };
                break;
            }
        }

        if (login !== 'Paycom' || !matched) {
            return res.status(200).json(UNAUTHORIZED_RESPONSE);
        }

        (req as any).paymeTestMode = matched.test;

        next();
    } catch {
        return res.status(200).json(UNAUTHORIZED_RESPONSE);
    }
};

// Single JSON-RPC endpoint for all Merchant API methods
router.post('/', paymeAuth, handleMerchantApi);

export default router;
