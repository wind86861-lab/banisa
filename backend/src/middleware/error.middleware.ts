import { Request, Response, NextFunction } from 'express';
import { AppError, ErrorCodes } from '../utils/errors';
import { sendError } from '../utils/response';
import { env } from '../config/env';

// Headers/fields that must never appear in error logs.
const REDACTED = new Set([
    'authorization', 'cookie', 'set-cookie',
    'password', 'passwordhash', 'token', 'access_token',
    'refresh_token', 'jwt', 'secret', 'apikey', 'api_key',
]);

function redact(obj: any, depth = 0): any {
    if (depth > 4 || obj == null) return obj;
    if (typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(v => redact(v, depth + 1));
    const out: any = {};
    for (const [k, v] of Object.entries(obj)) {
        out[k] = REDACTED.has(k.toLowerCase()) ? '[REDACTED]' : redact(v, depth + 1);
    }
    return out;
}

export const errorHandler = (err: any, req: Request, _res: Response, next: NextFunction) => {
    // Expected (handled) errors — log just message + path so logs stay scannable.
    if (err instanceof AppError) {
        if (err.statusCode >= 500) {
            console.error('[AppError]', err.statusCode, err.code, err.message, 'path=', req.path);
        }
        return sendError(_res, err.message, err.code, err.details, err.statusCode);
    }

    // Prisma well-known errors
    if (err?.code === 'P2002') {
        return sendError(_res, 'Record already exists', ErrorCodes.DUPLICATE_ERROR, null, 409);
    }

    // Unexpected — log with redaction, never echo stack to the client.
    console.error('[unhandled]', {
        path: req.path,
        method: req.method,
        message: err?.message,
        code: err?.code,
        // Stack only in non-production
        stack: env.NODE_ENV !== 'production' ? err?.stack : undefined,
        body: env.NODE_ENV !== 'production' ? redact(req.body) : undefined,
    });
    return sendError(_res, 'Internal Server Error', ErrorCodes.SERVER_ERROR, null, 500);
};
