import prisma from '../../config/database';
import { seal, open } from '../../utils/tenant-vault';

// Resolved (decrypted) per-clinic Payme config — never leaves this module's
// in-memory cache. Plaintext keys stay in RAM only.
export interface ResolvedPaymeConfig {
    configId: string;
    clinicId: string;
    merchantId: string;
    prodKey: string;
    testKey: string | null;
    isTestMode: boolean;
    isActive: boolean;
}

interface CacheEntry {
    value: ResolvedPaymeConfig | null; // null = "no config" (negative cache)
    expiresAt: number;
}

const CACHE_TTL_MS = 60_000;
const cache = new Map<string, CacheEntry>();

export function invalidateCache(clinicId?: string) {
    if (clinicId) cache.delete(clinicId);
    else cache.clear();
}

// Load (and decrypt) the active config for a clinic. Returns null if the clinic
// has no config row, or if isActive=false. Hot-path: webhook auth middleware.
export async function getActiveConfigForClinic(clinicId: string): Promise<ResolvedPaymeConfig | null> {
    const now = Date.now();
    const hit = cache.get(clinicId);
    if (hit && hit.expiresAt > now) return hit.value;

    const row = await prisma.clinicPaymeConfig.findUnique({ where: { clinicId } });
    if (!row || !row.isActive) {
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

    const resolved: ResolvedPaymeConfig = {
        configId: row.id,
        clinicId: row.clinicId,
        merchantId: row.merchantId,
        prodKey,
        testKey,
        isTestMode: row.isTestMode,
        isActive: row.isActive,
    };
    cache.set(clinicId, { value: resolved, expiresAt: now + CACHE_TTL_MS });
    return resolved;
}

// Best-effort lastUsedAt bump. Webhooks call this fire-and-forget so a slow
// DB write never blocks responding to Payme within the timeout window.
export function touchLastUsed(configId: string): void {
    prisma.clinicPaymeConfig
        .update({ where: { id: configId }, data: { lastUsedAt: new Date() } })
        .catch((err) => console.warn('[payme-config] touchLastUsed failed:', err?.message));
}

export interface UpsertConfigInput {
    clinicId: string;
    merchantId: string;
    prodKey: string;
    testKey?: string | null;
    isTestMode?: boolean;
    isActive?: boolean;
    actorId?: string | null;
    reason?: string; // "initial" | "rotation" | "manual"
}

// Upsert a clinic's Payme config and snapshot the prior state into
// PaymeConfigVersion for rollback/compliance.
export async function upsertConfig(input: UpsertConfigInput) {
    const {
        clinicId,
        merchantId,
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
        const existing = await tx.clinicPaymeConfig.findUnique({ where: { clinicId } });

        const data = {
            clinicId,
            merchantId,
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
            ? await tx.clinicPaymeConfig.update({ where: { clinicId }, data })
            : await tx.clinicPaymeConfig.create({
                  data: { ...data, createdBy: actorId ?? null },
              });

        const lastVersion = await tx.paymeConfigVersion.findFirst({
            where: { configId: saved.id },
            orderBy: { version: 'desc' },
            select: { version: true },
        });
        const nextVersion = (lastVersion?.version ?? 0) + 1;

        await tx.paymeConfigVersion.create({
            data: {
                configId: saved.id,
                clinicId,
                version: nextVersion,
                merchantId: saved.merchantId,
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
    const updated = await prisma.clinicPaymeConfig.update({
        where: { clinicId },
        data: { isActive: false, updatedBy: actorId ?? null },
    });
    invalidateCache(clinicId);
    return updated;
}
