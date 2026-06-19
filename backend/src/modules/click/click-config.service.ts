import prisma from '../../config/database';
import { seal, open } from '../../utils/tenant-vault';

// Resolved (decrypted) per-clinic Click config — never leaves this module's
// in-memory cache. Plaintext keys stay in RAM only.
export interface ResolvedClickConfig {
    configId: string;
    clinicId: string;
    merchantId: string;
    serviceId: string;
    merchantUserId: string | null;
    prodKey: string;
    testKey: string | null;
    isTestMode: boolean;
    isActive: boolean;
}

interface CacheEntry {
    value: ResolvedClickConfig | null;
    expiresAt: number;
}

const CACHE_TTL_MS = 60_000;
const cache = new Map<string, CacheEntry>();

export function invalidateCache(clinicId?: string) {
    if (clinicId) cache.delete(clinicId);
    else cache.clear();
}

// Load (and decrypt) the active config for a clinic. Returns null if the
// clinic has no row, or if isActive=false. Hot-path: webhook signature
// verification.
export async function getActiveConfigForClinic(clinicId: string): Promise<ResolvedClickConfig | null> {
    const config = await getConfigForClinic(clinicId);
    return config && config.isActive ? config : null;
}

// Same as getActiveConfigForClinic but ignores isActive. Used by self-test
// + the webhook auth path so a freshly rotated (inactive) key can still be
// validated end-to-end. State-mutating Click actions (Complete) are gated
// at the controller layer when isActive=false.
export async function getConfigForClinic(clinicId: string): Promise<ResolvedClickConfig | null> {
    const now = Date.now();
    const hit = cache.get(clinicId);
    if (hit && hit.expiresAt > now) return hit.value;

    const row = await prisma.clinicClickConfig.findUnique({ where: { clinicId } });
    if (!row) {
        cache.set(clinicId, { value: null, expiresAt: now + CACHE_TTL_MS });
        return null;
    }

    const prodKey = open({
        ciphertext: row.prodKeyCiphertext,
        iv: row.prodKeyIv,
        tag: row.prodKeyTag,
    });

    let testKey: string | null = null;
    if (row.testKeyCiphertext && row.testKeyIv && row.testKeyTag) {
        testKey = open({
            ciphertext: row.testKeyCiphertext,
            iv: row.testKeyIv,
            tag: row.testKeyTag,
        });
    }

    const resolved: ResolvedClickConfig = {
        configId: row.id,
        clinicId: row.clinicId,
        merchantId: row.merchantId,
        serviceId: row.serviceId,
        merchantUserId: row.merchantUserId,
        prodKey,
        testKey,
        isTestMode: row.isTestMode,
        isActive: row.isActive,
    };
    cache.set(clinicId, { value: resolved, expiresAt: now + CACHE_TTL_MS });
    return resolved;
}

export function touchLastUsed(configId: string): void {
    prisma.clinicClickConfig
        .update({ where: { id: configId }, data: { lastUsedAt: new Date() } })
        .catch((err) => console.warn('[click-config] touchLastUsed failed:', err?.message));
}

export interface UpsertConfigInput {
    clinicId: string;
    merchantId: string;
    serviceId: string;
    merchantUserId?: string | null;
    prodKey: string;
    testKey?: string | null;
    isTestMode?: boolean;
    isActive?: boolean;
    actorId?: string | null;
    reason?: string;
}

// Upsert a clinic's Click config and snapshot the prior state into
// ClickConfigVersion for rollback/compliance.
export async function upsertConfig(input: UpsertConfigInput) {
    const {
        clinicId,
        merchantId,
        serviceId,
        merchantUserId,
        prodKey,
        testKey,
        isTestMode = true,
        isActive = false,
        actorId,
        reason = 'manual',
    } = input;

    const sealedProd = seal(prodKey);
    const sealedTest = testKey ? seal(testKey) : null;

    return prisma.$transaction(async (tx) => {
        const existing = await tx.clinicClickConfig.findUnique({ where: { clinicId } });

        const data = {
            clinicId,
            merchantId,
            serviceId,
            merchantUserId: merchantUserId ?? null,
            prodKeyCiphertext: sealedProd.ciphertext,
            prodKeyIv: sealedProd.iv,
            prodKeyTag: sealedProd.tag,
            testKeyCiphertext: sealedTest?.ciphertext ?? null,
            testKeyIv: sealedTest?.iv ?? null,
            testKeyTag: sealedTest?.tag ?? null,
            isTestMode,
            isActive,
            updatedBy: actorId ?? null,
            lastRotatedAt: existing ? new Date() : null,
            connectedAt: existing?.connectedAt ?? (isActive ? new Date() : null),
        };

        const saved = existing
            ? await tx.clinicClickConfig.update({ where: { clinicId }, data })
            : await tx.clinicClickConfig.create({
                  data: { ...data, createdBy: actorId ?? null },
              });

        const lastVersion = await tx.clickConfigVersion.findFirst({
            where: { configId: saved.id },
            orderBy: { version: 'desc' },
            select: { version: true },
        });
        const nextVersion = (lastVersion?.version ?? 0) + 1;

        await tx.clickConfigVersion.create({
            data: {
                configId: saved.id,
                clinicId,
                version: nextVersion,
                merchantId: saved.merchantId,
                serviceId: saved.serviceId,
                merchantUserId: saved.merchantUserId,
                prodKeyCiphertext: saved.prodKeyCiphertext,
                prodKeyIv: saved.prodKeyIv,
                prodKeyTag: saved.prodKeyTag,
                testKeyCiphertext: saved.testKeyCiphertext,
                testKeyIv: saved.testKeyIv,
                testKeyTag: saved.testKeyTag,
                isTestMode: saved.isTestMode,
                reason,
                changedBy: actorId ?? null,
            },
        });

        invalidateCache(clinicId);
        return saved;
    });
}

export async function deactivateConfig(clinicId: string, actorId?: string | null) {
    const updated = await prisma.clinicClickConfig.update({
        where: { clinicId },
        data: { isActive: false, updatedBy: actorId ?? null },
    });
    invalidateCache(clinicId);
    return updated;
}
