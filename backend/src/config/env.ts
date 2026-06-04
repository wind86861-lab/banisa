import dotenv from 'dotenv';
import path from 'path';

// Works in both dev (src/) and production (dist/) — DigitalOcean injects env vars directly
dotenv.config({ path: path.join(process.cwd(), '.env') });

const NODE_ENV = process.env.NODE_ENV || 'development';
const IS_PROD = NODE_ENV === 'production';

/** Read a required secret. In production we refuse to start without it; in dev
 *  we tolerate a placeholder so local setup stays painless. */
function requireSecret(name: string, devFallback: string): string {
    const v = process.env[name];
    if (v && v.length > 0) return v;
    if (IS_PROD) {
        // Crash loudly — running with a known/leaked secret would be far worse
        // than a missed boot.
        throw new Error(`[env] ${name} is required in production`);
    }
    return devFallback;
}

/** Same idea, but for non-secret keys (Cloudinary IDs, Payme merchant). */
function requireValue(name: string): string {
    const v = process.env[name];
    if (v && v.length > 0) return v;
    if (IS_PROD) {
        throw new Error(`[env] ${name} is required in production`);
    }
    return '';
}

export const env = {
    NODE_ENV,
    PORT: parseInt(process.env.PORT || '5000', 10),
    DATABASE_URL: process.env.DATABASE_URL || '',
    JWT_SECRET: requireSecret('JWT_SECRET', 'dev-only-jwt-secret'),
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
    JWT_ACCESS_SECRET: requireSecret('JWT_ACCESS_SECRET', 'dev-only-access-secret'),
    JWT_REFRESH_SECRET: requireSecret('JWT_REFRESH_SECRET', 'dev-only-refresh-secret'),
    CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME || '',
    CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY || '',
    CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET || '',
    CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:3000',
    // Public base URL of the API (used to build webhook URLs shown to clinics).
    // Falls back to CORS_ORIGIN-derived guess in dev.
    PUBLIC_API_BASE_URL: process.env.PUBLIC_API_BASE_URL
        || (process.env.NODE_ENV === 'production' ? 'https://banisa.uz' : 'http://localhost:5000'),
    PAYME_MERCHANT_ID: requireValue('PAYME_MERCHANT_ID'),
    PAYME_PROD_KEY: requireSecret('PAYME_PROD_KEY', ''),
    PAYME_TEST_KEY: requireSecret('PAYME_TEST_KEY', ''),
    // Master key for AES-256-GCM envelope encryption of per-clinic Payme secrets.
    // 32 raw bytes hex-encoded = 64 chars. Generate with:
    //   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
    PAYME_MASTER_KEY: requireSecret('PAYME_MASTER_KEY', ''),
};

// In production the master key must be present and the right length.
if (IS_PROD) {
    if (!env.PAYME_MASTER_KEY || env.PAYME_MASTER_KEY.length !== 64) {
        throw new Error('[env] PAYME_MASTER_KEY must be 64 hex chars (32 bytes) in production');
    }
}

// Refuse to boot with the legacy fallback secret in production.
if (IS_PROD) {
    const legacy = ['dev-only-jwt-secret', 'dev-only-access-secret', 'dev-only-refresh-secret', 'super-secret-key-change-in-production', 'access-secret-change-in-production', 'refresh-secret-change-in-production'];
    if (legacy.includes(env.JWT_SECRET) || legacy.includes(env.JWT_ACCESS_SECRET) || legacy.includes(env.JWT_REFRESH_SECRET)) {
        throw new Error('[env] Refusing to start with a default/placeholder JWT secret in production');
    }
}
