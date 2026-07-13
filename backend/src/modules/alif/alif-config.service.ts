import prisma from '../../config/database';
import { seal, open } from '../../utils/tenant-vault';

// Alif checkout endpoints. The itemised invoice API doubles as the Alif Nasiya
// (installment) entry point — the customer picks card or Nasiya on Alif's page.
export const ALIF_CHECKOUT = {
    PROD: 'https://checkout.alifpay.uz',
    TEST: 'https://checkout-dev.alifpay.uz',
};

export interface ResolvedAlifConfig {
    configId: string;
    clinicId: string;
    token: string;          // decrypted, active (test or prod)
    key: string;            // decrypted HMAC secret for webhook Signature
    isTestMode: boolean;
    isActive: boolean;
    baseUrl: string;        // checkout host for the active mode
}

const CACHE_TTL_MS = 60_000;
const cache = new Map<string, { value: ResolvedAlifConfig | null; expiresAt: number }>();

export function invalidateAlifCache(clinicId?: string) {
    if (clinicId) cache.delete(clinicId);
    else cache.clear();
}

// Resolve (decrypt) a clinic's Alif config. Ignores isActive — the caller gates.
export async function getAlifConfigForClinic(clinicId: string): Promise<ResolvedAlifConfig | null> {
    const now = Date.now();
    const hit = cache.get(clinicId);
    if (hit && hit.expiresAt > now) return hit.value;

    const row = await prisma.clinicAlifConfig.findUnique({ where: { clinicId } });
    if (!row) {
        cache.set(clinicId, { value: null, expiresAt: now + CACHE_TTL_MS });
        return null;
    }

    // In test mode prefer the sandbox creds, else prod.
    let token = open({ ciphertext: row.prodTokenCiphertext, iv: row.prodTokenIv, tag: row.prodTokenTag });
    let key = open({ ciphertext: row.prodKeyCiphertext, iv: row.prodKeyIv, tag: row.prodKeyTag });
    if (row.isTestMode && row.testTokenCiphertext && row.testTokenIv && row.testTokenTag
        && row.testKeyCiphertext && row.testKeyIv && row.testKeyTag) {
        token = open({ ciphertext: row.testTokenCiphertext, iv: row.testTokenIv, tag: row.testTokenTag });
        key = open({ ciphertext: row.testKeyCiphertext, iv: row.testKeyIv, tag: row.testKeyTag });
    }

    const resolved: ResolvedAlifConfig = {
        configId: row.id,
        clinicId: row.clinicId,
        token,
        key,
        isTestMode: row.isTestMode,
        isActive: row.isActive,
        baseUrl: row.isTestMode ? ALIF_CHECKOUT.TEST : ALIF_CHECKOUT.PROD,
    };
    cache.set(clinicId, { value: resolved, expiresAt: now + CACHE_TTL_MS });
    return resolved;
}

export async function getActiveAlifConfigForClinic(clinicId: string): Promise<ResolvedAlifConfig | null> {
    const cfg = await getAlifConfigForClinic(clinicId);
    return cfg && cfg.isActive ? cfg : null;
}

export function touchAlifLastUsed(configId: string): void {
    prisma.clinicAlifConfig.update({ where: { id: configId }, data: { lastUsedAt: new Date() } })
        .catch(() => { /* best-effort */ });
}

export interface UpsertAlifInput {
    prodToken?: string;
    prodKey?: string;
    testToken?: string | null;
    testKey?: string | null;
    isTestMode?: boolean;
    isActive?: boolean;
    actorId?: string | null;
}

export async function upsertAlifConfig(clinicId: string, input: UpsertAlifInput) {
    const existing = await prisma.clinicAlifConfig.findUnique({ where: { clinicId } });

    const data: any = {
        isTestMode: input.isTestMode ?? existing?.isTestMode ?? true,
        isActive: input.isActive ?? existing?.isActive ?? false,
        updatedBy: input.actorId ?? null,
    };

    if (input.prodToken) {
        const s = seal(input.prodToken);
        data.prodTokenCiphertext = s.ciphertext; data.prodTokenIv = s.iv; data.prodTokenTag = s.tag;
    }
    if (input.prodKey) {
        const s = seal(input.prodKey);
        data.prodKeyCiphertext = s.ciphertext; data.prodKeyIv = s.iv; data.prodKeyTag = s.tag;
    }
    if (input.testToken) {
        const s = seal(input.testToken);
        data.testTokenCiphertext = s.ciphertext; data.testTokenIv = s.iv; data.testTokenTag = s.tag;
    }
    if (input.testKey) {
        const s = seal(input.testKey);
        data.testKeyCiphertext = s.ciphertext; data.testKeyIv = s.iv; data.testKeyTag = s.tag;
    }

    let saved;
    if (existing) {
        saved = await prisma.clinicAlifConfig.update({ where: { id: existing.id }, data });
    } else {
        if (!input.prodToken || !input.prodKey) throw new Error('prodToken va prodKey birinchi ulanishда shart');
        saved = await prisma.clinicAlifConfig.create({
            data: { clinicId, connectedAt: new Date(), createdBy: input.actorId ?? null, ...data },
        });
    }
    invalidateAlifCache(clinicId);
    return saved;
}

// Public-safe view (no secrets) for the clinic UI.
export async function getAlifConfigPublic(clinicId: string) {
    const row = await prisma.clinicAlifConfig.findUnique({ where: { clinicId } });
    if (!row) return null;
    return {
        hasProdToken: !!row.prodTokenCiphertext,
        hasProdKey: !!row.prodKeyCiphertext,
        hasTestToken: !!row.testTokenCiphertext,
        hasTestKey: !!row.testKeyCiphertext,
        isTestMode: row.isTestMode,
        isActive: row.isActive,
        connectedAt: row.connectedAt,
        lastUsedAt: row.lastUsedAt,
        updatedAt: row.updatedAt,
    };
}
