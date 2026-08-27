import { Request, Response, NextFunction } from 'express';
import { timingSafeEqual } from 'crypto';
import { env } from '../config/env';
import { AppError, ErrorCodes } from '../utils/errors';

/**
 * Guards the read-only Partner API (/api/partner/*).
 *
 * Auth is a single shared secret sent as either:
 *   - `X-API-Key: <key>`  (preferred), or
 *   - `Authorization: Bearer <key>`
 *
 * The key lives in env.PARTNER_API_KEY. If it isn't configured the whole
 * surface is disabled (503) rather than silently allowing anonymous access.
 * The compare is constant-time so a wrong key can't be probed byte-by-byte.
 */
export function requirePartnerKey(req: Request, _res: Response, next: NextFunction) {
    const configured = env.PARTNER_API_KEY;
    if (!configured) {
        return next(new AppError('Partner API yoqilmagan', 503, ErrorCodes.SERVER_ERROR));
    }

    const header = req.header('x-api-key');
    const bearer = req.header('authorization');
    const presented = header
        || (bearer && /^Bearer\s+/i.test(bearer) ? bearer.replace(/^Bearer\s+/i, '') : '')
        || '';

    if (!presented || !safeEqual(presented, configured)) {
        return next(new AppError('API kaliti yaroqsiz', 401, ErrorCodes.UNAUTHORIZED));
    }
    return next();
}

/** Length-independent constant-time string comparison. */
function safeEqual(a: string, b: string): boolean {
    const ab = Buffer.from(a);
    const bb = Buffer.from(b);
    if (ab.length !== bb.length) {
        // Still burn a compare against a same-length buffer so the early-out
        // doesn't leak length via timing.
        timingSafeEqual(ab, ab);
        return false;
    }
    return timingSafeEqual(ab, bb);
}
