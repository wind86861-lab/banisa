import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { handleMerchantApi } from './payme.controller';
import { env } from '../../config/env';
import { getActiveConfigForClinic, touchLastUsed } from './payme-config.service';
import { safeEqual } from '../../utils/tenant-vault';

const router = Router();

// ─── Payme Basic Auth middleware ──────────────────────────────────────────────
// Payme sends:  Authorization: Basic base64("Paycom:<password>")
// IMPORTANT: Payme spec requires ALL responses (including auth errors) to return HTTP 200
const UNAUTHORIZED_RESPONSE = {
    jsonrpc: '2.0',
    id: null,
    error: { code: -32504, message: 'Unauthorized', data: null },
};

function parseBasicPassword(authHeader: string): { login: string; password: string } | null {
    if (!authHeader.startsWith('Basic ')) return null;
    try {
        const base64 = authHeader.slice(6);
        const decoded = Buffer.from(base64, 'base64').toString('utf8');
        const colonIdx = decoded.indexOf(':');
        if (colonIdx < 0) return null;
        return {
            login: decoded.slice(0, colonIdx),
            password: decoded.slice(colonIdx + 1),
        };
    } catch {
        return null;
    }
}

// Legacy auth — global env keys, used by the unscoped POST /api/payme endpoint.
// Stays here for the Medilux migration window; will be retired in Sprint 2.3.
const paymeLegacyAuth = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = (req.headers['authorization'] || '') as string;
    const creds = parseBasicPassword(authHeader);
    if (!creds) return res.status(200).json(UNAUTHORIZED_RESPONSE);

    const candidates = env.NODE_ENV === 'production'
        ? [{ key: env.PAYME_PROD_KEY, test: false }]
        : [
            { key: env.PAYME_PROD_KEY, test: false },
            { key: env.PAYME_TEST_KEY, test: true },
          ];

    const pwBuf = Buffer.from(creds.password);
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

    if (creds.login !== 'Paycom' || !matched) {
        return res.status(200).json(UNAUTHORIZED_RESPONSE);
    }

    (req as any).paymeCtx = { clinicId: null, isTestMode: matched.test };
    next();
};

// Per-clinic auth — looks up ClinicPaymeConfig by :clinicId, decrypts the
// stored keys, and constant-time compares against the Basic password.
const paymeTenantAuth = async (req: Request, res: Response, next: NextFunction) => {
    const clinicId = String(req.params.clinicId || '');
    const authHeader = (req.headers['authorization'] || '') as string;
    if (!clinicId) return res.status(200).json(UNAUTHORIZED_RESPONSE);
    const creds = parseBasicPassword(authHeader);
    if (!creds || creds.login !== 'Paycom') {
        return res.status(200).json(UNAUTHORIZED_RESPONSE);
    }

    let config;
    try {
        config = await getActiveConfigForClinic(clinicId);
    } catch (err) {
        console.error(`[Payme:${clinicId}] config lookup failed`, err);
        return res.status(200).json(UNAUTHORIZED_RESPONSE);
    }
    if (!config || !config.isActive) {
        return res.status(200).json(UNAUTHORIZED_RESPONSE);
    }

    // In test mode we ONLY accept the test key (prod ignored).
    // In prod mode we ONLY accept the prod key.
    let matched: { test: boolean } | null = null;
    if (config.isTestMode) {
        if (config.testKey && safeEqual(config.testKey, creds.password)) {
            matched = { test: true };
        }
    } else {
        if (safeEqual(config.prodKey, creds.password)) {
            matched = { test: false };
        }
    }

    if (!matched) {
        return res.status(200).json(UNAUTHORIZED_RESPONSE);
    }

    (req as any).paymeCtx = { clinicId, isTestMode: matched.test };
    // Fire-and-forget bump so the clinic dashboard can show "last used X ago".
    touchLastUsed(config.configId);
    next();
};

// Deprecation surface — every hit to the legacy / endpoint logs a warning
// with the requesting IP and Basic-auth login. After Medilux is migrated to
// the per-clinic URL, this endpoint will be flipped to 410 Gone in one line.
const legacyDeprecationLogger = (req: Request, res: Response, next: NextFunction) => {
    console.warn(
        `[Payme:legacy] DEPRECATED hit — ip=${req.ip} ua="${req.headers['user-agent'] || ''}". ` +
        'Migrate to /api/payme/callback/:clinicId.',
    );
    res.setHeader('Deprecation', 'true');
    res.setHeader('Sunset', 'Wed, 31 Dec 2026 23:59:59 GMT');
    res.setHeader('Link', '</api/payme/callback/{clinicId}>; rel="successor-version"');
    next();
};

// ─── Routes ───────────────────────────────────────────────────────────────────
// Per-clinic webhook (the URL each clinic pastes into their Payme dashboard).
router.post('/callback/:clinicId', paymeTenantAuth, handleMerchantApi);
// Legacy global endpoint — DEPRECATED. Kept until Medilux finishes migrating.
// Every hit logs a warning so we can tell when the cabinet has switched over.
router.post('/', legacyDeprecationLogger, paymeLegacyAuth, handleMerchantApi);

export default router;
