import { Request, Response } from 'express';
import prisma from '../../config/database';

// Haversine distance in km — fallback when routing service is down.
function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const AMBULANCE_TYPES = ['BASIC', 'INTENSIVE_CARE', 'NEONATAL', 'CARDIAC', 'TRAUMA', 'OBSTETRIC'];

// OSRM Table API: one HTTP call returns durations+distances from a single
// source to N destinations. Far cheaper than per-pair /route calls when we
// already have a batch of ambulances on the screen.
const OSRM_BASE = process.env.OSRM_BASE_URL || 'https://router.project-osrm.org';
// Public OSRM caps URL length and rate. Stay well under both.
const OSRM_MAX_DESTS = 40;
const OSRM_TIMEOUT_MS = 4500;

type RouteHop = { durationSec: number | null; distanceM: number | null };

// 60s in-process cache. Key collapses near-identical origins (~50m) and
// the exact set of ambulance ids in the request so re-renders don't burn
// requests on the public OSRM instance.
const routeCache = new Map<string, { at: number; value: RouteHop[] }>();
const ROUTE_CACHE_TTL_MS = 60_000;

function pruneRouteCache() {
    const now = Date.now();
    for (const [k, v] of routeCache) {
        if (now - v.at > ROUTE_CACHE_TTL_MS) routeCache.delete(k);
    }
}

async function fetchOsrmTable(
    origin: [number, number],
    destinations: Array<[number, number]>,
): Promise<RouteHop[]> {
    if (destinations.length === 0) return [];
    const coords = [origin, ...destinations]
        .map(([lat, lng]) => `${lng.toFixed(6)},${lat.toFixed(6)}`)
        .join(';');
    const url = `${OSRM_BASE}/table/v1/driving/${coords}` +
        `?sources=0&annotations=duration,distance`;

    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), OSRM_TIMEOUT_MS);
    try {
        const r = await fetch(url, {
            signal: ctrl.signal,
            headers: { 'User-Agent': 'banisa.uz/1.0 (ambulance-eta)' },
        });
        if (!r.ok) throw new Error(`OSRM ${r.status}`);
        const j: any = await r.json();
        const durs: Array<number | null> = j?.durations?.[0] || [];
        const dists: Array<number | null> = j?.distances?.[0] || [];
        // Index 0 is the source itself — skip it.
        return destinations.map((_, i) => ({
            durationSec: typeof durs[i + 1] === 'number' ? durs[i + 1] : null,
            distanceM: typeof dists[i + 1] === 'number' ? dists[i + 1] : null,
        }));
    } catch {
        return destinations.map(() => ({ durationSec: null, distanceM: null }));
    } finally {
        clearTimeout(t);
    }
}

export const listPublicAmbulances = async (req: Request, res: Response) => {
    const lat = parseFloat(String(req.query.lat || ''));
    const lng = parseFloat(String(req.query.lng || ''));
    const hasOrigin = Number.isFinite(lat) && Number.isFinite(lng);
    const radiusKm = parseFloat(String(req.query.radius || '0'));
    const type = req.query.type ? String(req.query.type) : null;
    const minCapacity = parseInt(String(req.query.minCapacity || '0'), 10) || 0;
    const equipmentRaw = req.query.equipment ? String(req.query.equipment) : '';
    const equipmentReq = equipmentRaw ? equipmentRaw.split(',').filter(Boolean) : [];
    // Status filter — default AVAILABLE only, but user can request all by status=all.
    const statusParam = String(req.query.status || 'AVAILABLE');
    const region = req.query.region ? String(req.query.region) : null;
    const maxBaseFee = parseInt(String(req.query.maxBaseFee || '0'), 10) || 0;

    const where: any = { isActive: true };
    if (statusParam !== 'all') where.status = statusParam;
    if (type && AMBULANCE_TYPES.includes(type)) where.type = type;
    if (minCapacity > 0) where.capacity = { gte: minCapacity };
    if (region) where.clinic = { region };
    if (maxBaseFee > 0) where.OR = [{ baseFee: null }, { baseFee: { lte: maxBaseFee } }];

    const rows = await prisma.ambulance.findMany({
        where,
        include: {
            clinic: {
                select: {
                    id: true, nameUz: true, region: true, district: true,
                    street: true,
                    latitude: true, longitude: true,
                },
            },
        },
    });

    const nowMs = Date.now();
    let items = rows.map((a) => {
        const useLat = a.currentLatitude ?? a.baseLatitude ?? a.clinic.latitude;
        const useLng = a.currentLongitude ?? a.baseLongitude ?? a.clinic.longitude;
        const distanceKm = hasOrigin && Number.isFinite(useLat) && Number.isFinite(useLng)
            ? haversine(lat, lng, useLat!, useLng!)
            : null;
        const isLive = !!a.liveLocationUntil && a.liveLocationUntil.getTime() > nowMs
            && a.currentLatitude != null && a.currentLongitude != null;
        return {
            id: a.id,
            callSign: a.callSign,
            type: a.type,
            vehicleModel: a.vehicleModel,
            licensePlate: a.licensePlate,
            capacity: a.capacity,
            equipment: a.equipment as string[],
            photoUrl: a.photoUrl,
            status: a.status,
            latitude: useLat,
            longitude: useLng,
            isLive,
            liveLocationUntil: a.liveLocationUntil,
            baseFee: a.baseFee,
            pricePerKm: a.pricePerKm,
            dispatchPhone: a.dispatchPhone,
            distanceKm,
            durationMin: null as number | null,
            routeDistanceKm: null as number | null,
            clinic: {
                id: a.clinic.id,
                name: a.clinic.nameUz,
                region: a.clinic.region,
                district: a.clinic.district,
                // clinic phones intentionally omitted — patients never see them
            },
        };
    });

    // Equipment filter (Array contains all required)
    if (equipmentReq.length > 0) {
        items = items.filter((a) =>
            equipmentReq.every((e) => (a.equipment || []).includes(e)),
        );
    }

    // Radius filter (straight-line — keeps initial filter cheap before routing).
    if (hasOrigin && radiusKm > 0) {
        items = items.filter((a) => a.distanceKm != null && a.distanceKm <= radiusKm);
    }

    // Driving-time enrichment via OSRM Table API. Skipped without origin and
    // capped at OSRM_MAX_DESTS to keep the public instance happy. If the call
    // fails we silently fall back to haversine sorting below.
    if (hasOrigin && items.length > 0) {
        const routable = items
            .filter((i) => i.latitude != null && i.longitude != null)
            .slice(0, OSRM_MAX_DESTS);

        if (routable.length > 0) {
            const dests = routable.map((i) => [i.latitude!, i.longitude!] as [number, number]);
            const cacheKey = `${lat.toFixed(3)}:${lng.toFixed(3)}:` +
                routable.map((i) => i.id).sort().join(',');

            pruneRouteCache();
            const cached = routeCache.get(cacheKey);
            let results: RouteHop[];
            if (cached && Date.now() - cached.at < ROUTE_CACHE_TTL_MS) {
                results = cached.value;
            } else {
                results = await fetchOsrmTable([lat, lng], dests);
                routeCache.set(cacheKey, { at: Date.now(), value: results });
            }

            const hopById = new Map(routable.map((it, i) => [it.id, results[i]]));
            items = items.map((it) => {
                const r = hopById.get(it.id);
                if (!r) return it;
                return {
                    ...it,
                    durationMin: r.durationSec != null ? Math.max(1, Math.round(r.durationSec / 60)) : null,
                    routeDistanceKm: r.distanceM != null ? Math.round(r.distanceM / 100) / 10 : null,
                };
            });
        }
    }

    // Sort: prefer real driving time when available, fall back to straight-line.
    if (hasOrigin) {
        items.sort((a, b) => {
            const da = a.durationMin ?? null;
            const db = b.durationMin ?? null;
            if (da != null && db != null) return da - db;
            if (da != null) return -1;
            if (db != null) return 1;
            if (a.distanceKm == null) return 1;
            if (b.distanceKm == null) return -1;
            return a.distanceKm - b.distanceKm;
        });
    } else {
        const order = { AVAILABLE: 0, BUSY: 1, MAINTENANCE: 2, OFFLINE: 3 } as any;
        items.sort((a, b) => (order[a.status] ?? 9) - (order[b.status] ?? 9));
    }

    return res.json({
        success: true,
        data: {
            items,
            total: items.length,
            availableCount: items.filter((a) => a.status === 'AVAILABLE').length,
            routingEnabled: hasOrigin && items.some((i) => i.durationMin != null),
        },
    });
};
