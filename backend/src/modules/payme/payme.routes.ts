import { Router, Request, Response, NextFunction } from 'express';
import { handleMerchantApi } from './payme.controller';
import { getConfigForClinic, touchLastUsed } from './payme-config.service';
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
        // Load config IGNORING isActive — we authenticate the credential
        // independently of the integration's on/off state. State-mutating
        // methods are gated at the handler layer via ctx.isInactive, so a
        // read-only CheckPerformTransaction self-test can still validate
        // the freshly-rotated key before the admin re-enables.
        config = await getConfigForClinic(clinicId);
    } catch (err) {
        console.error(`[Payme:${clinicId}] config lookup failed`, err);
        return res.status(200).json(UNAUTHORIZED_RESPONSE);
    }
    if (!config) {
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
        // Forensic log so we can tell WHY a real Payme call rejected:
        // (a) wrong key entirely vs (b) right key but wrong mode.
        // Only the length + last-4 fingerprint are printed — never the keys.
        const supplied = creds.password;
        const fp = `len=${supplied.length} tail=…${supplied.slice(-4)}`;
        const prodFp = `len=${config.prodKey.length} tail=…${config.prodKey.slice(-4)}`;
        const testFp = config.testKey ? `len=${config.testKey.length} tail=…${config.testKey.slice(-4)}` : 'none';
        console.warn(
            `[Payme:${clinicId.slice(0, 8)}] AUTH FAIL — mode=${config.isTestMode ? 'TEST' : 'LIVE'} ` +
            `supplied(${fp}) prod(${prodFp}) test(${testFp})`,
        );
        return res.status(200).json(UNAUTHORIZED_RESPONSE);
    }

    (req as any).paymeCtx = {
        clinicId,
        isTestMode: matched.test,
        isInactive: !config.isActive,
    };
    // Fire-and-forget bump so the clinic dashboard can show "last used X ago".
    touchLastUsed(config.configId);
    next();
};

// Sunset gate — legacy /api/payme has been retired (Medilux migrated to
// /callback/:clinicId on 2026-06-19). We keep the route mounted so any
// stragglers get a clear, audit-friendly rejection instead of a 404 that
// looks like a network problem.
//
// Each hit logs the caller so if a clinic's cabinet quietly reverts, we see
// it in the warning stream. Returns 410 Gone with the Sunset + Link headers
// pointing at the successor URL pattern.
const legacySunset = (req: Request, res: Response) => {
    console.warn(
        `[Payme:legacy] 410 hit — ip=${req.ip} ua="${req.headers['user-agent'] || ''}". ` +
        'Use /api/payme/callback/:clinicId.',
    );
    res.status(410);
    res.setHeader('Deprecation', 'true');
    res.setHeader('Sunset', 'Wed, 31 Dec 2026 23:59:59 GMT');
    res.setHeader('Link', '</api/payme/callback/{clinicId}>; rel="successor-version"');
    return res.json({
        jsonrpc: '2.0',
        id: null,
        error: {
            code: -32601,
            message: 'Endpoint sunset. Use /api/payme/callback/:clinicId.',
            data: null,
        },
    });
};

// ─── Routes ───────────────────────────────────────────────────────────────────
// Per-clinic webhook (the URL each clinic pastes into their Payme dashboard).
router.post('/callback/:clinicId', paymeTenantAuth, handleMerchantApi);
// Legacy global endpoint — RETIRED. Returns 410 Gone (was: paymeLegacyAuth +
// handleMerchantApi). Kept mounted for observability — any future hit logs
// who tried it so we can chase down stale Payme cabinets quickly.
router.post('/', legacySunset);

export default router;
