import crypto from 'crypto';
import { env } from '../config/env';

// AES-256-GCM envelope for per-tenant secrets (Payme merchant keys, etc.)
// Master key (PAYME_MASTER_KEY) is 32 raw bytes encoded as 64-char hex.
// Each encrypt() call uses a fresh random IV; output is (ciphertext, iv, tag) — all base64.

const ALG = 'aes-256-gcm';
const IV_BYTES = 12; // GCM standard
const KEY_BYTES = 32;

export interface SealedSecret {
    ciphertext: string;
    iv: string;
    tag: string;
}

let cachedMasterKey: Buffer | null = null;

function getMasterKey(): Buffer {
    if (cachedMasterKey) return cachedMasterKey;
    const hex = env.PAYME_MASTER_KEY;
    if (!hex || hex.length !== KEY_BYTES * 2) {
        throw new Error(`[tenant-vault] PAYME_MASTER_KEY must be ${KEY_BYTES * 2} hex chars (got ${hex?.length ?? 0})`);
    }
    cachedMasterKey = Buffer.from(hex, 'hex');
    if (cachedMasterKey.length !== KEY_BYTES) {
        throw new Error('[tenant-vault] PAYME_MASTER_KEY decoded to wrong byte length');
    }
    return cachedMasterKey;
}

export function seal(plaintext: string): SealedSecret {
    if (typeof plaintext !== 'string' || plaintext.length === 0) {
        throw new Error('[tenant-vault] seal: plaintext must be non-empty string');
    }
    const iv = crypto.randomBytes(IV_BYTES);
    const cipher = crypto.createCipheriv(ALG, getMasterKey(), iv);
    const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return {
        ciphertext: enc.toString('base64'),
        iv: iv.toString('base64'),
        tag: tag.toString('base64'),
    };
}

export function open(sealed: SealedSecret): string {
    const iv = Buffer.from(sealed.iv, 'base64');
    const tag = Buffer.from(sealed.tag, 'base64');
    const enc = Buffer.from(sealed.ciphertext, 'base64');
    const decipher = crypto.createDecipheriv(ALG, getMasterKey(), iv);
    decipher.setAuthTag(tag);
    const dec = Buffer.concat([decipher.update(enc), decipher.final()]);
    return dec.toString('utf8');
}

// Constant-time equality for sensitive comparisons (e.g., Basic auth password).
export function safeEqual(a: string, b: string): boolean {
    const ab = Buffer.from(a);
    const bb = Buffer.from(b);
    if (ab.length !== bb.length) return false;
    return crypto.timingSafeEqual(ab, bb);
}

// Mask a key for display: keep first 4 + last 4, dots in between.
export function maskKey(plaintext: string): string {
    if (!plaintext) return '';
    if (plaintext.length <= 8) return '••••';
    return `${plaintext.slice(0, 4)}••••${plaintext.slice(-4)}`;
}

// Generate a fresh master key (utility for ops — run once, store in env).
export function generateMasterKey(): string {
    return crypto.randomBytes(KEY_BYTES).toString('hex');
}
