import prisma from '../../config/database';
import { seal, open } from '../../utils/tenant-vault';

// ─── Global Banisa Split-Shop config ────────────────────────────────────────
// A single row. All SHOP SPLIT payments flow through Banisa's one service_id;
// clinics are counterparties under it. Secret is AES-256-GCM sealed exactly
// like ClinicClickConfig — plaintext only ever lives in RAM.

export interface ResolvedSplitGlobalConfig {
    id: string;
    serviceId: string;
    merchantId: string;
    merchantUserId: string | null;
    secretKey: string;          // decrypted, active (test or prod) key
    isTestMode: boolean;
    isActive: boolean;
    banisaCntrgId: string | null;
    banisaInn: string | null;
    banisaBranchId: string | null;
    banisaPaymentAccount: string | null;
    banisaPaymentMfo: string | null;
    banisaTransitAccount: string | null;
    banisaTransitMfo: string | null;
}

let cache: { value: ResolvedSplitGlobalConfig | null; expiresAt: number } | null = null;
const CACHE_TTL_MS = 60_000;

export function invalidateGlobalSplitCache() {
    cache = null;
}

export async function getGlobalSplitConfig(): Promise<ResolvedSplitGlobalConfig | null> {
    const now = Date.now();
    if (cache && cache.expiresAt > now) return cache.value;

    const row = await prisma.clickSplitGlobalConfig.findFirst({ orderBy: { createdAt: 'asc' } });
    if (!row) {
        cache = { value: null, expiresAt: now + CACHE_TTL_MS };
        return null;
    }

    // Prefer the test key while in test mode, fall back to prod.
    let secretKey = open({ ciphertext: row.prodKeyCiphertext, iv: row.prodKeyIv, tag: row.prodKeyTag });
    if (row.isTestMode && row.testKeyCiphertext && row.testKeyIv && row.testKeyTag) {
        secretKey = open({ ciphertext: row.testKeyCiphertext, iv: row.testKeyIv, tag: row.testKeyTag });
    }

    const resolved: ResolvedSplitGlobalConfig = {
        id: row.id,
        serviceId: row.serviceId,
        merchantId: row.merchantId,
        merchantUserId: row.merchantUserId,
        secretKey,
        isTestMode: row.isTestMode,
        isActive: row.isActive,
        banisaCntrgId: row.banisaCntrgId,
        banisaInn: row.banisaInn,
        banisaBranchId: row.banisaBranchId,
        banisaPaymentAccount: row.banisaPaymentAccount,
        banisaPaymentMfo: row.banisaPaymentMfo,
        banisaTransitAccount: row.banisaTransitAccount,
        banisaTransitMfo: row.banisaTransitMfo,
    };
    cache = { value: resolved, expiresAt: now + CACHE_TTL_MS };
    return resolved;
}

export interface UpsertGlobalSplitInput {
    serviceId: string;
    merchantId: string;
    merchantUserId?: string | null;
    prodKey?: string;               // plaintext; only sealed when provided
    testKey?: string | null;
    isTestMode?: boolean;
    isActive?: boolean;
    banisaCntrgId?: string | null;
    banisaInn?: string | null;
    banisaBranchId?: string | null;
    banisaPaymentAccount?: string | null;
    banisaPaymentMfo?: string | null;
    banisaTransitAccount?: string | null;
    banisaTransitMfo?: string | null;
    actorId?: string | null;
}

export async function upsertGlobalSplitConfig(input: UpsertGlobalSplitInput) {
    const existing = await prisma.clickSplitGlobalConfig.findFirst({ orderBy: { createdAt: 'asc' } });

    const data: any = {
        serviceId: input.serviceId,
        merchantId: input.merchantId,
        merchantUserId: input.merchantUserId ?? null,
        isTestMode: input.isTestMode ?? existing?.isTestMode ?? true,
        isActive: input.isActive ?? existing?.isActive ?? false,
        banisaCntrgId: input.banisaCntrgId ?? existing?.banisaCntrgId ?? null,
        banisaInn: input.banisaInn ?? existing?.banisaInn ?? null,
        banisaBranchId: input.banisaBranchId ?? existing?.banisaBranchId ?? null,
        banisaPaymentAccount: input.banisaPaymentAccount ?? existing?.banisaPaymentAccount ?? null,
        banisaPaymentMfo: input.banisaPaymentMfo ?? existing?.banisaPaymentMfo ?? null,
        banisaTransitAccount: input.banisaTransitAccount ?? existing?.banisaTransitAccount ?? null,
        banisaTransitMfo: input.banisaTransitMfo ?? existing?.banisaTransitMfo ?? null,
        updatedBy: input.actorId ?? null,
    };

    // Only re-seal keys when a new plaintext is supplied.
    if (input.prodKey) {
        const s = seal(input.prodKey);
        data.prodKeyCiphertext = s.ciphertext;
        data.prodKeyIv = s.iv;
        data.prodKeyTag = s.tag;
    }
    if (input.testKey) {
        const s = seal(input.testKey);
        data.testKeyCiphertext = s.ciphertext;
        data.testKeyIv = s.iv;
        data.testKeyTag = s.tag;
    }

    let saved;
    if (existing) {
        saved = await prisma.clickSplitGlobalConfig.update({ where: { id: existing.id }, data });
    } else {
        if (!input.prodKey) throw new Error('prodKey required on first setup');
        saved = await prisma.clickSplitGlobalConfig.create({
            data: { ...data, createdBy: input.actorId ?? null },
        });
    }
    invalidateGlobalSplitCache();
    return saved;
}

// Public-safe view (no secret) for admin UI.
export async function getGlobalSplitConfigPublic() {
    const row = await prisma.clickSplitGlobalConfig.findFirst({ orderBy: { createdAt: 'asc' } });
    if (!row) return null;
    return {
        serviceId: row.serviceId,
        merchantId: row.merchantId,
        merchantUserId: row.merchantUserId,
        hasProdKey: !!row.prodKeyCiphertext,
        hasTestKey: !!row.testKeyCiphertext,
        isTestMode: row.isTestMode,
        isActive: row.isActive,
        banisaCntrgId: row.banisaCntrgId,
        banisaInn: row.banisaInn,
        banisaBranchId: row.banisaBranchId,
        banisaPaymentAccount: row.banisaPaymentAccount,
        banisaPaymentMfo: row.banisaPaymentMfo,
        banisaTransitAccount: row.banisaTransitAccount,
        banisaTransitMfo: row.banisaTransitMfo,
        updatedAt: row.updatedAt,
    };
}

// ─── Per-clinic split routing ───────────────────────────────────────────────

export async function getClinicSplitConfig(clinicId: string) {
    return prisma.clinicClickSplitConfig.findUnique({ where: { clinicId } });
}

export interface UpsertClinicSplitInput {
    inn?: string | null;
    branchId?: string | null;
    cntrgId?: string | null;
    paymentAccount?: string | null;
    paymentMfo?: string | null;
    transitAccount?: string | null;
    transitMfo?: string | null;
    isActive?: boolean;             // super-admin only — controller decides
}

export async function upsertClinicSplitConfig(clinicId: string, input: UpsertClinicSplitInput) {
    // branch_id / cntrg_id default to the clinic INN when left blank.
    const inn = input.inn?.trim() || null;
    const branchId = input.branchId?.trim() || inn;
    const cntrgId = input.cntrgId?.trim() || inn;

    const required = [branchId, cntrgId, input.paymentAccount, input.paymentMfo];
    const isConfigured = required.every((v) => v != null && String(v).trim() !== '');

    const base = {
        inn,
        branchId,
        cntrgId,
        paymentAccount: input.paymentAccount?.trim() || null,
        paymentMfo: input.paymentMfo?.trim() || null,
        transitAccount: input.transitAccount?.trim() || null,
        transitMfo: input.transitMfo?.trim() || null,
        isConfigured,
    };

    return prisma.clinicClickSplitConfig.upsert({
        where: { clinicId },
        create: {
            clinicId,
            ...base,
            ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
        },
        update: {
            ...base,
            ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
        },
    });
}
