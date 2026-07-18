import prisma from '../../config/database';

// ─── Tez-yordam distance-band pricing ────────────────────────────────────────
// A patient's TRIP distance (pickup→destination) selects exactly one admin
// band; the accepting ambulance's per-band tariff (base + per-km) prices it.
// Falls back to the vehicle's legacy flat baseFee/pricePerKm when a band tariff
// is missing so pre-band ambulances keep working.

export interface Band {
    id: string;
    label: string;
    minKm: number;
    maxKm: number | null;
    sortOrder: number;
}

export interface PriceBreakdown {
    price: number;
    baseFee: number;
    pricePerKm: number;
    bandId: string | null;
    bandLabel: string | null;
    tripKm: number;
    source: 'band' | 'legacy';
}

/** Active bands, ordered by their lower bound (ascending). */
export async function getActiveBands(): Promise<Band[]> {
    const rows = await prisma.ambulancePricingBand.findMany({
        where: { isActive: true },
        orderBy: [{ sortOrder: 'asc' }, { minKm: 'asc' }],
    });
    return rows.map((r) => ({
        id: r.id, label: r.label, minKm: r.minKm, maxKm: r.maxKm, sortOrder: r.sortOrder,
    }));
}

/**
 * The band a trip distance falls into: minKm inclusive, maxKm exclusive
 * (null maxKm = unbounded). Returns null when no active band matches — the
 * caller then uses the ambulance's legacy flat price.
 */
export function selectBand(tripKm: number, bands: Band[]): Band | null {
    for (const b of bands) {
        const lo = b.minKm ?? 0;
        const hi = b.maxKm;
        if (tripKm >= lo && (hi == null || tripKm < hi)) return b;
    }
    return null;
}

/**
 * Price one trip for one ambulance. `tariffByBandId` is that ambulance's own
 * per-band tariff map; `legacy*` are the vehicle's flat fallback fields.
 */
export function priceTrip(opts: {
    tripKm: number;
    bands: Band[];
    tariffByBandId: Map<string, { baseFee: number; pricePerKm: number }>;
    legacyBaseFee: number | null;
    legacyPricePerKm: number | null;
}): PriceBreakdown {
    const { tripKm, bands, tariffByBandId } = opts;
    const band = selectBand(tripKm, bands);
    if (band) {
        const t = tariffByBandId.get(band.id);
        if (t) {
            return {
                price: t.baseFee + Math.round(tripKm * t.pricePerKm),
                baseFee: t.baseFee,
                pricePerKm: t.pricePerKm,
                bandId: band.id,
                bandLabel: band.label,
                tripKm,
                source: 'band',
            };
        }
    }
    const baseFee = opts.legacyBaseFee ?? 0;
    const pricePerKm = opts.legacyPricePerKm ?? 0;
    return {
        price: baseFee + Math.round(tripKm * pricePerKm),
        baseFee,
        pricePerKm,
        bandId: band?.id ?? null,
        bandLabel: band?.label ?? null,
        tripKm,
        source: 'legacy',
    };
}

/** Build a bandId→tariff lookup from an ambulance's `bandTariffs` relation. */
export function tariffMap(
    bandTariffs: { bandId: string; baseFee: number; pricePerKm: number }[] | undefined,
): Map<string, { baseFee: number; pricePerKm: number }> {
    const m = new Map<string, { baseFee: number; pricePerKm: number }>();
    for (const t of bandTariffs ?? []) m.set(t.bandId, { baseFee: t.baseFee, pricePerKm: t.pricePerKm });
    return m;
}
