import { Router, Request, Response, NextFunction } from 'express';
import { handleMerchantApi } from './payme.controller';
import { env } from '../../config/env';

const router = Router();

// ─── Payme Basic Auth middleware ──────────────────────────────────────────────
// Payme sends:  Authorization: Basic base64("Paycom:<password>")
const paymeAuth = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers['authorization'] || '';

    if (!authHeader.startsWith('Basic ')) {
        return res.status(401).json({
            jsonrpc: '2.0',
            id: null,
            error: { code: -32504, message: 'Unauthorized', data: null },
        });
    }

    try {
        const base64 = authHeader.slice(6); // strip "Basic "
        const decoded = Buffer.from(base64, 'base64').toString('utf8');
        const colonIdx = decoded.indexOf(':');
        const login = decoded.slice(0, colonIdx);
        const password = decoded.slice(colonIdx + 1);

        const expectedPassword = env.NODE_ENV === 'production'
            ? env.PAYME_PROD_KEY
            : env.PAYME_TEST_KEY;

        if (login !== 'Paycom' || password !== expectedPassword) {
            return res.status(401).json({
                jsonrpc: '2.0',
                id: null,
                error: { code: -32504, message: 'Unauthorized', data: null },
            });
        }

        next();
    } catch {
        return res.status(401).json({
            jsonrpc: '2.0',
            id: null,
            error: { code: -32504, message: 'Unauthorized', data: null },
        });
    }
};

// Single JSON-RPC endpoint for all Merchant API methods
router.post('/', paymeAuth, handleMerchantApi);

export default router;
