/**
 * Shared fiscal-code resolver (Soliq / OFD).
 *
 * Resolution chain, per receipt line:
 *   1. ServiceCategory.fiscalXxx  (the sub-category the service belongs to)
 *   2. GlobalFiscalSettings       (platform-wide default, super-admin)
 *   3. HARDCODED_FISCAL           (medical-services fallback)
 *
 * Extracted verbatim from payme.service.ts so Click's OFD submission and any
 * future provider resolve codes identically — Payme is live and passes the
 * sandbox compliance suite, so this logic is moved, not rewritten. Every
 * lookup is wrapped in try/catch: a fiscal lookup must never take down a
 * payment flow.
 */
import prisma from '../../config/database';

export const HARDCODED_FISCAL = Object.freeze({
    code: '10902004002000999',  // tibbiy va sog'lomlashtirish muassasalari xizmatlari
    package_code: '1322039',    // xizmat (marta)
    vat_percent: 12,            // QQS 12% (tibbiy muassasa)
});

function pickStr(...candidates: Array<string | null | undefined>): string {
    for (const c of candidates) {
        if (typeof c === 'string' && c.trim().length > 0) return c.trim();
    }
    return '';
}
function pickInt(...candidates: Array<number | null | undefined>): number | null {
    for (const c of candidates) {
        if (typeof c === 'number' && Number.isFinite(c)) return c;
    }
    return null;
}

export async function resolveFiscal(appointment: any): Promise<{
    byServiceKey: (serviceType: string | null, originalServiceId: string | null) => { code: string; package_code: string; vat_percent: number };
    byCategoryId: (categoryId: string | null) => { code: string; package_code: string; vat_percent: number };
}> {
    // Step 1 — global default. Wrapped in try/catch so a brief DB blip
    // can't take down the whole CheckPerformTransaction flow.
    let globalRow: any = null;
    try {
        globalRow = await prisma.globalFiscalSettings.findUnique({ where: { id: 'global' } });
    } catch (e) {
        console.warn('[fiscal] global lookup failed, falling back to hardcoded:', (e as any)?.message);
    }
    const fallback = {
        code: pickStr(globalRow?.fiscalMxikCode) || HARDCODED_FISCAL.code,
        package_code: pickStr(globalRow?.fiscalPackageCode) || HARDCODED_FISCAL.package_code,
        vat_percent: pickInt(globalRow?.fiscalVatPercent) ?? HARDCODED_FISCAL.vat_percent,
    };

    // Step 2 — per-category lookup. Batched: one round-trip per service
    // type. Empty/missing → keep fallback for that line.
    const serviceToCategory = new Map<string, string | null>(); // "TYPE:svcId" → categoryId
    try {
        if (appointment.services?.length) {
            const ids = { DIAGNOSTIC: new Set<string>(), SURGICAL: new Set<string>(), SANATORIUM: new Set<string>() };
            for (const s of appointment.services) {
                if (!s.originalServiceId) continue;
                const t = s.serviceType as 'DIAGNOSTIC' | 'SURGICAL' | 'SANATORIUM';
                if (ids[t]) ids[t].add(s.originalServiceId);
            }
            const tasks: Array<Promise<void>> = [];
            if (ids.DIAGNOSTIC.size) tasks.push((async () => {
                const rows = await prisma.diagnosticService.findMany({
                    where: { id: { in: [...ids.DIAGNOSTIC] } },
                    select: { id: true, categoryId: true },
                });
                for (const r of rows) serviceToCategory.set(`DIAGNOSTIC:${r.id}`, r.categoryId);
            })());
            if (ids.SURGICAL.size) tasks.push((async () => {
                const rows = await prisma.surgicalService.findMany({
                    where: { id: { in: [...ids.SURGICAL] } },
                    select: { id: true, categoryId: true },
                });
                for (const r of rows) serviceToCategory.set(`SURGICAL:${r.id}`, r.categoryId);
            })());
            if (ids.SANATORIUM.size) tasks.push((async () => {
                const rows = await prisma.sanatoriumService.findMany({
                    where: { id: { in: [...ids.SANATORIUM] } },
                    select: { id: true, categoryId: true },
                });
                for (const r of rows) serviceToCategory.set(`SANATORIUM:${r.id}`, r.categoryId);
            })());
            await Promise.all(tasks);
        }
    } catch (e) {
        console.warn('[fiscal] service→category lookup failed, using fallback:', (e as any)?.message);
    }

    const allCategoryIds = new Set<string>();
    for (const v of serviceToCategory.values()) if (v) allCategoryIds.add(v);
    if (appointment.diagnosticService?.categoryId) allCategoryIds.add(appointment.diagnosticService.categoryId);
    if (appointment.surgicalService?.categoryId) allCategoryIds.add(appointment.surgicalService.categoryId);

    const categoryFiscal = new Map<string, { mxik: string | null; pkg: string | null; vat: number | null }>();
    try {
        if (allCategoryIds.size > 0) {
            const catRows = await prisma.serviceCategory.findMany({
                where: { id: { in: [...allCategoryIds] } },
                select: { id: true, fiscalMxikCode: true, fiscalPackageCode: true, fiscalVatPercent: true },
            });
            for (const c of catRows) categoryFiscal.set(c.id, {
                mxik: c.fiscalMxikCode, pkg: c.fiscalPackageCode, vat: c.fiscalVatPercent,
            });
        }
    } catch (e) {
        console.warn('[fiscal] category lookup failed, using fallback:', (e as any)?.message);
    }

    const byCategoryId = (categoryId: string | null) => {
        const cat = categoryId ? categoryFiscal.get(categoryId) : null;
        return {
            code: pickStr(cat?.mxik) || fallback.code,
            package_code: pickStr(cat?.pkg) || fallback.package_code,
            vat_percent: pickInt(cat?.vat) ?? fallback.vat_percent,
        };
    };
    const byServiceKey = (serviceType: string | null, originalServiceId: string | null) => {
        if (!serviceType || !originalServiceId) return byCategoryId(null);
        const catId = serviceToCategory.get(`${serviceType}:${originalServiceId}`) ?? null;
        return byCategoryId(catId);
    };

    return { byServiceKey, byCategoryId };
}

/**
 * VAT amount in tiyin for a VAT-INCLUSIVE price (confirmed with the operator:
 * the price the patient sees is final and already contains QQS).
 *   VAT = Price × pct / (100 + pct)
 */
export function vatAmountTiyin(priceTiyin: number, vatPercent: number): number {
    if (!Number.isFinite(priceTiyin) || !Number.isFinite(vatPercent) || vatPercent <= 0) return 0;
    return Math.round((priceTiyin * vatPercent) / (100 + vatPercent));
}
