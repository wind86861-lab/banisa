import prisma from '../../config/database';
import { AppError, ErrorCodes } from '../../utils/errors';
import { getActiveBands, priceTrip, tariffMap, Band } from './ambulance-pricing';

// ─────────────────────────────────────────────────────────────────────────────
// Geo helpers (kept inline — module is self-contained)
// ─────────────────────────────────────────────────────────────────────────────

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const OSRM_BASE = process.env.OSRM_BASE_URL || 'https://router.project-osrm.org';
if (OSRM_BASE.includes('router.project-osrm.org')) {
    console.warn('[skory] Using public OSRM demo server. Set OSRM_BASE_URL to a self-hosted instance for production.');
}

const NOMINATIM_BASE = process.env.NOMINATIM_BASE_URL || 'https://nominatim.openstreetmap.org';

/**
 * Reverse-geocode a coordinate to a human-readable address. Best-effort —
 * returns null on timeout/failure so callers can fall back to raw coords.
 */
export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
    try {
        const url = `${NOMINATIM_BASE}/reverse?lat=${lat.toFixed(6)}&lon=${lng.toFixed(6)}&format=json&accept-language=uz,ru,en&zoom=18`;
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 3000);
        try {
            const r = await fetch(url, {
                signal: ctrl.signal,
                headers: { 'User-Agent': 'banisa.uz/1.0 (skory dispatch; admin@banisa.uz)' },
            });
            if (!r.ok) return null;
            const j: any = await r.json();
            const name: string | null = j?.display_name || null;
            if (!name) return null;
            // Trim very long Nominatim strings to first 3 components.
            const parts = name.split(',').map((s: string) => s.trim()).filter(Boolean);
            return parts.slice(0, 3).join(', ');
        } finally {
            clearTimeout(t);
        }
    } catch {
        return null;
    }
}

/**
 * One-to-one OSRM driving route. Returns { km, minutes } or null on failure.
 * Used once per request (small, predictable cost) — the patient typed in a
 * narrow time window so we want the more accurate driving estimate, not
 * haversine.
 */
async function osrmRoute(
    fromLat: number, fromLng: number,
    toLat: number, toLng: number,
): Promise<{ km: number; minutes: number } | null> {
    try {
        const url = `${OSRM_BASE}/route/v1/driving/` +
            `${fromLng.toFixed(6)},${fromLat.toFixed(6)};` +
            `${toLng.toFixed(6)},${toLat.toFixed(6)}` +
            `?overview=false`;
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 4500);
        try {
            const r = await fetch(url, {
                signal: ctrl.signal,
                headers: { 'User-Agent': 'banisa.uz/1.0 (skory)' },
            });
            if (!r.ok) return null;
            const j: any = await r.json();
            const route = j?.routes?.[0];
            if (!route) return null;
            return {
                km: route.distance / 1000,
                minutes: Math.max(1, Math.round(route.duration / 60)),
            };
        } finally {
            clearTimeout(t);
        }
    } catch {
        return null;
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Dispatch
// ─────────────────────────────────────────────────────────────────────────────

export interface CreateRequestInput {
    patientId: string;
    pickupLat: number;
    pickupLng: number;
    pickupAddress?: string | null;
    destLat?: number | null;
    destLng?: number | null;
    destAddress?: string | null;
    destClinicId?: string | null;
    priceMaxSom?: number | null;
    description?: string | null;
    // Service tier the patient asked for (BASIC / INTENSIVE_CARE). When set,
    // fanout is restricted to ambulances of that exact type.
    type?: string | null;
    // When set, restrict fanout to ONLY this ambulance (patient picked it
    // explicitly from the public map). Distance/price/eligibility checks
    // still run — if it fails them, the call ends with NO_CANDIDATES.
    targetAmbulanceId?: string | null;
}

export interface CandidateAmbulance {
    ambulanceId: string;
    clinicId: string;
    clinicName: string;
    callSign: string;
    type: string;
    dispatcherUserId: string;
    dispatcherChatId: bigint | null;
    dispatcherLanguage: string;
    ambulanceLat: number;
    ambulanceLng: number;
    distanceKm: number;
    durationMin: number;
    estimatedPrice: number;
    baseFee: number;
    pricePerKm: number;
}

/**
 * Find ambulances eligible for a request.
 *
 *   - status = AVAILABLE
 *   - dispatcher linked (have a TelegramAccount so we can actually contact them)
 *   - within ~25km haversine of pickup (pre-filter, cheap)
 *   - estimatedPrice ≤ priceMaxSom (or any price if cheklovsiz)
 *
 * Returns sorted by ETA ascending.
 */
export async function findCandidates(input: CreateRequestInput): Promise<CandidateAmbulance[]> {
    const ambulances = await prisma.ambulance.findMany({
        where: {
            isActive: true,
            // Send to EVERY active ambulance of the right type, regardless of
            // status (free/busy/offline) — the dispatcher decides. Status is
            // not a gate; scarce ambulances often forget to flip it.
            dispatcherUserId: { not: null },
            ...(input.type ? { type: input.type as any } : {}),
            ...(input.targetAmbulanceId ? { id: input.targetAmbulanceId } : {}),
        },
        include: {
            clinic: {
                select: { id: true, nameUz: true, latitude: true, longitude: true },
            },
            dispatcher: {
                select: {
                    id: true,
                    telegramAccount: { select: { chatId: true, language: true } },
                },
            },
            bandTariffs: { select: { bandId: true, baseFee: true, pricePerKm: true } },
        },
    });

    // Distance bands are shared across all candidates — load once.
    const bands: Band[] = await getActiveBands();

    // The ONLY requirement is being reachable on Telegram to receive the offer.
    // Location is NOT a gate — we never depend on a live-location share; coords
    // (live → base → clinic → none) are used only to ORDER candidates by
    // nearness when we happen to know them. Coordless ambulances still get the
    // offer (sorted last).
    const rough = ambulances
        .map((a) => {
            const lat = a.currentLatitude ?? a.baseLatitude ?? a.clinic.latitude;
            const lng = a.currentLongitude ?? a.baseLongitude ?? a.clinic.longitude;
            const chatId = a.dispatcher?.telegramAccount?.chatId ?? null;
            if (!a.dispatcherUserId || !chatId) return null;
            const distanceKm = (lat != null && lng != null)
                ? haversineKm(input.pickupLat, input.pickupLng, lat, lng)
                : Number.POSITIVE_INFINITY;
            return { a, lat, lng, distanceKm, chatId };
        })
        .filter((x): x is NonNullable<typeof x> => x !== null)
        .sort((x, y) => x.distanceKm - y.distanceKm)
        .slice(0, 30);  // cap OSRM calls

    // pickup→destination is the SAME for every candidate — compute once.
    let onwardKm: number | null = null;
    if (input.destLat != null && input.destLng != null) {
        const onward = await osrmRoute(input.pickupLat, input.pickupLng, input.destLat, input.destLng);
        if (onward) onwardKm = onward.km;
    }

    // Real driving distance for each survivor.
    const enriched = await Promise.all(rough.map(async ({ a, lat, lng, distanceKm, chatId }) => {
        const hasCoords = lat != null && lng != null;
        const route = hasCoords
            ? (await osrmRoute(input.pickupLat, input.pickupLng, lat, lng)
                ?? { km: Number.isFinite(distanceKm) ? distanceKm : 0, minutes: Number.isFinite(distanceKm) ? Math.max(1, Math.round(distanceKm * 2)) : 0 })
            : { km: 0, minutes: 0 };
        // The patient pays for their OWN trip (pickup→drop), never the approach.
        // With no destination the trip length is unknown → base fee only (0 km),
        // which is what openPaymentForRequest will actually charge.
        const billableKm = onwardKm ?? 0;
        const breakdown = priceTrip({
            tripKm: billableKm,
            bands,
            tariffByBandId: tariffMap(a.bandTariffs),
            legacyBaseFee: a.baseFee,
            legacyPricePerKm: a.pricePerKm,
        });
        const baseFee = breakdown.baseFee;
        const pricePerKm = breakdown.pricePerKm;
        const estimatedPrice = breakdown.price;

        const candidate: CandidateAmbulance = {
            ambulanceId: a.id,
            clinicId: a.clinic.id,
            clinicName: a.clinic.nameUz,
            callSign: a.callSign,
            type: a.type,
            dispatcherUserId: a.dispatcherUserId!,
            dispatcherChatId: chatId,
            dispatcherLanguage: a.dispatcher?.telegramAccount?.language || 'uz',
            ambulanceLat: lat ?? input.pickupLat,
            ambulanceLng: lng ?? input.pickupLng,
            distanceKm: route.km,
            durationMin: route.minutes,
            estimatedPrice,
            baseFee,
            pricePerKm,
        };
        return candidate;
    }));

    const priceLimit = input.priceMaxSom && input.priceMaxSom > 0 ? input.priceMaxSom : null;
    const filtered = priceLimit
        ? enriched.filter((c) => c.estimatedPrice <= priceLimit)
        : enriched;

    return filtered.sort((a, b) => a.durationMin - b.durationMin);
}

/**
 * Create the request row + fanout entries (telegram message ids attached
 * later by the bot layer). Idempotency: we don't dedupe rapid re-submits;
 * the patient bot wizard enforces a 60s cooldown client-side.
 */
export async function createRequest(
    input: CreateRequestInput,
    candidates: CandidateAmbulance[],
) {
    const cheapest = candidates[0];
    const request = await prisma.ambulanceRequest.create({
        data: {
            patientId: input.patientId,
            type: (input.type ?? null) as any,
            pickupLat: input.pickupLat,
            pickupLng: input.pickupLng,
            pickupAddress: input.pickupAddress ?? null,
            destLat: input.destLat ?? null,
            destLng: input.destLng ?? null,
            destAddress: input.destAddress ?? null,
            destClinicId: input.destClinicId ?? null,
            priceMaxSom: input.priceMaxSom ?? null,
            description: input.description ?? null,
            estimatedDistanceKm: cheapest?.distanceKm ?? null,
            estimatedDurationMin: cheapest?.durationMin ?? null,
        },
    });

    if (candidates.length === 0) return { request, offers: [] };

    // Bulk create offers; ignore duplicates if somehow same ambulance appears.
    await prisma.dispatchOffer.createMany({
        data: candidates.map((c) => ({
            requestId: request.id,
            ambulanceId: c.ambulanceId,
            dispatcherUserId: c.dispatcherUserId,
            telegramChatId: c.dispatcherChatId,
        })),
        skipDuplicates: true,
    });

    const offers = await prisma.dispatchOffer.findMany({
        where: { requestId: request.id },
    });

    return { request, offers };
}

/**
 * Atomic accept. Two race guards in a single transaction:
 *   1. Request must still be PENDING with no acceptedAmbulanceId
 *   2. Ambulance must still be AVAILABLE (otherwise same ambulance
 *      could "win" two different requests fanned out simultaneously)
 *
 * If either guard fails the transaction rolls back and we report `lost`.
 * Also writes an AmbulanceStatusLog row for the AVAILABLE→BUSY transition
 * so klinika admin sees skory-driven status changes in history.
 */
export async function acceptOffer(offerId: string, dispatcherUserId: string) {
    const offer = await prisma.dispatchOffer.findUnique({
        where: { id: offerId },
        include: { request: true, ambulance: true },
    });
    if (!offer) throw new AppError('Offer topilmadi', 404, ErrorCodes.NOT_FOUND);
    if (offer.dispatcherUserId !== dispatcherUserId) {
        throw new AppError('Bu offer sizniki emas', 403, ErrorCodes.FORBIDDEN);
    }
    if (offer.request.status !== 'PENDING') {
        return { won: false as const, offer, request: offer.request, reason: 'not_pending' as const };
    }
    // No ambulance-status gate: a busy/offline ambulance may still accept — the
    // dispatcher owns that call. Only the request race (first to accept wins)
    // is enforced below.

    // We need the accepting candidate's own distance/duration so the patient
    // sees an honest ETA (not "fastest available" which may be a different
    // dispatcher). Recompute via haversine here as a fallback — OSRM data
    // was computed at fanout time but isn't persisted per-offer.
    const ambLat = offer.ambulance.currentLatitude ?? offer.ambulance.baseLatitude;
    const ambLng = offer.ambulance.currentLongitude ?? offer.ambulance.baseLongitude;
    let acceptedKm: number | null = null;
    let acceptedMin: number | null = null;
    if (ambLat != null && ambLng != null) {
        const hav = haversineKm(offer.request.pickupLat, offer.request.pickupLng, ambLat, ambLng);
        const osrm = await osrmRoute(ambLat, ambLng, offer.request.pickupLat, offer.request.pickupLng);
        acceptedKm = osrm?.km ?? hav;
        acceptedMin = osrm?.minutes ?? Math.max(1, Math.round(hav * 2));
    }

    try {
        await prisma.$transaction(async (tx) => {
            // 1. Mark the ambulance busy (no status precondition — it may have
            //    been offline/busy; the dispatcher chose to take this call).
            await tx.ambulance.updateMany({
                where: { id: offer.ambulanceId },
                data: { status: 'BUSY', lastStatusAt: new Date() },
            });

            // 2. Claim the request row (status guard — first accept wins)
            const reqClaim = await tx.ambulanceRequest.updateMany({
                where: { id: offer.requestId, status: 'PENDING', acceptedAmbulanceId: null },
                data: {
                    status: 'DISPATCHED',
                    acceptedAmbulanceId: offer.ambulanceId,
                    acceptedAt: new Date(),
                    estimatedDistanceKm: acceptedKm,
                    estimatedDurationMin: acceptedMin,
                },
            });
            if (reqClaim.count === 0) throw new Error('__race_request__');

            // 3. Mark offers + write status log
            await tx.dispatchOffer.update({
                where: { id: offerId },
                data: { status: 'ACCEPTED', respondedAt: new Date() },
            });
            await tx.dispatchOffer.updateMany({
                where: { requestId: offer.requestId, id: { not: offerId }, status: 'SHOWN' },
                data: { status: 'LOST' },
            });
            await tx.ambulanceStatusLog.create({
                data: {
                    ambulanceId: offer.ambulanceId,
                    fromStatus: offer.ambulance.status, // actual prior status (may be OFFLINE/BUSY)
                    toStatus: 'BUSY',
                    changedBy: dispatcherUserId,
                    reason: `skory accept: ${offer.requestId}`,
                },
            });
        });
    } catch (e: any) {
        if (e?.message === '__race_ambulance__' || e?.message === '__race_request__') {
            await prisma.dispatchOffer.update({
                where: { id: offerId },
                data: { status: 'LOST', respondedAt: new Date() },
            });
            const fresh = await prisma.ambulanceRequest.findUnique({ where: { id: offer.requestId } });
            const reason = e.message === '__race_ambulance__' ? 'ambulance_busy' as const : 'lost' as const;
            return { won: false as const, offer, request: fresh!, reason };
        }
        throw e;
    }

    const winnerRequest = await prisma.ambulanceRequest.findUnique({
        where: { id: offer.requestId },
        include: { acceptedAmbulance: { include: { clinic: { select: { nameUz: true } } } } },
    });

    return { won: true as const, offer, request: winnerRequest! };
}

export async function declineOffer(offerId: string, dispatcherUserId: string) {
    const offer = await prisma.dispatchOffer.findUnique({ where: { id: offerId } });
    if (!offer) throw new AppError('Offer topilmadi', 404, ErrorCodes.NOT_FOUND);
    if (offer.dispatcherUserId !== dispatcherUserId) {
        throw new AppError('Bu offer sizniki emas', 403, ErrorCodes.FORBIDDEN);
    }
    if (offer.status !== 'SHOWN') return offer;
    return prisma.dispatchOffer.update({
        where: { id: offerId },
        data: { status: 'DECLINED', respondedAt: new Date() },
    });
}

export async function cancelRequest(requestId: string, patientId: string, reason?: string) {
    const req = await prisma.ambulanceRequest.findUnique({ where: { id: requestId } });
    if (!req) throw new AppError('So\'rov topilmadi', 404, ErrorCodes.NOT_FOUND);
    if (req.patientId !== patientId) {
        throw new AppError('Bu sizning so\'rovingiz emas', 403, ErrorCodes.FORBIDDEN);
    }
    if (['COMPLETED', 'CANCELLED'].includes(req.status)) return req;

    const wasAccepted = req.status !== 'PENDING' && req.acceptedAmbulanceId;

    await prisma.$transaction([
        prisma.ambulanceRequest.update({
            where: { id: requestId },
            data: { status: 'CANCELLED', cancelledAt: new Date(), cancelReason: reason ?? null },
        }),
        prisma.dispatchOffer.updateMany({
            where: { requestId, status: 'SHOWN' },
            data: { status: 'LOST' },
        }),
        ...(wasAccepted
            ? [
                prisma.ambulance.update({
                    where: { id: req.acceptedAmbulanceId! },
                    data: { status: 'AVAILABLE', lastStatusAt: new Date() },
                }),
                prisma.ambulanceStatusLog.create({
                    data: {
                        ambulanceId: req.acceptedAmbulanceId!,
                        fromStatus: 'BUSY',
                        toStatus: 'AVAILABLE',
                        changedBy: patientId,
                        reason: `skory cancelled: ${reason ?? 'no reason'}`,
                    },
                }),
            ]
            : []),
    ]);

    return prisma.ambulanceRequest.findUnique({
        where: { id: requestId },
        include: { offers: true, acceptedAmbulance: true },
    });
}

/**
 * Cheap (haversine-only) market price-range estimate for the wizard's
 * "step 3" preview. Aggregates `baseFee + pricePerKm × distance` across
 * every active ambulance within 25 km of the pickup that has both pricing
 * fields populated. Returns null if no priced ambulances exist nearby.
 *
 * Distance basis:
 *   • If destination known → pickup→destination (the trip the patient pays for)
 *   • Otherwise → ambulance→pickup (best we can say without a dropoff)
 */
export async function getMarketPriceRange(input: {
    pickupLat: number;
    pickupLng: number;
    destLat?: number | null;
    destLng?: number | null;
    type?: string | null;
}): Promise<{ min: number; max: number; sampleCount: number; tripKm: number | null } | null> {
    const ambulances = await prisma.ambulance.findMany({
        where: {
            isActive: true,
            ...(input.type ? { type: input.type as any } : {}),
        },
        select: {
            baseFee: true, pricePerKm: true,
            baseLatitude: true, baseLongitude: true,
            clinic: { select: { latitude: true, longitude: true } },
            bandTariffs: { select: { bandId: true, baseFee: true, pricePerKm: true } },
        },
    });
    if (ambulances.length === 0) return null;

    const bands = await getActiveBands();
    const RADIUS_KM = 25;
    const tripKm = input.destLat != null && input.destLng != null
        ? haversineKm(input.pickupLat, input.pickupLng, input.destLat, input.destLng)
        : null;

    const prices: number[] = [];
    for (const a of ambulances) {
        const lat = a.baseLatitude ?? a.clinic?.latitude;
        const lng = a.baseLongitude ?? a.clinic?.longitude;
        if (lat == null || lng == null) continue;
        const distToPickup = haversineKm(input.pickupLat, input.pickupLng, lat, lng);
        if (distToPickup > RADIUS_KM) continue;
        // Never price the approach — unknown trip length means base fee only.
        const billableKm = tripKm ?? 0;
        const breakdown = priceTrip({
            tripKm: billableKm,
            bands,
            tariffByBandId: tariffMap(a.bandTariffs),
            legacyBaseFee: a.baseFee,
            legacyPricePerKm: a.pricePerKm,
        });
        // Skip ambulances with no usable price at all (no band tariff + no legacy).
        if (breakdown.baseFee === 0 && breakdown.pricePerKm === 0) continue;
        prices.push(breakdown.price);
    }
    if (prices.length === 0) return null;
    prices.sort((a, b) => a - b);
    return {
        min: prices[0],
        max: prices[prices.length - 1],
        sampleCount: prices.length,
        tripKm: tripKm != null ? Number(tripKm.toFixed(1)) : null,
    };
}

/**
 * 10 nearest approved clinics to a coordinate (haversine). Used by the bot's
 * "qaysi shifoxonaga" step so the patient picks an exact destination
 * instead of letting us auto-guess.
 */
export async function getNearbyClinics(lat: number, lng: number, take = 10) {
    const clinics = await prisma.clinic.findMany({
        where: {
            status: 'APPROVED',
            isActive: true,
            latitude: { not: null },
            longitude: { not: null },
        },
        select: { id: true, nameUz: true, nameRu: true, latitude: true, longitude: true, addressUz: true },
    });
    return clinics
        .map((c) => ({
            ...c,
            distanceKm: haversineKm(lat, lng, c.latitude!, c.longitude!),
        }))
        .sort((a, b) => a.distanceKm - b.distanceKm)
        .slice(0, take);
}

/**
 * Look up a patient's still-active PENDING request, if any. Used by the bot
 * to prevent the same patient from spamming new requests while one is alive.
 */
export async function getActivePendingForPatient(patientId: string) {
    return prisma.ambulanceRequest.findFirst({
        where: { patientId, status: 'PENDING' },
        orderBy: { createdAt: 'desc' },
    });
}

/**
 * System-driven expiry: marks a PENDING request CANCELLED if no dispatcher
 * accepted within the SLA window. Called by the expiry worker in skory.bot.ts.
 * Returns the cancelled request rows so the bot can notify patient + edit
 * dispatcher messages.
 */
export async function expirePendingRequest(requestId: string) {
    // Atomic claim — only one cluster worker can win the expire.
    const claim = await prisma.ambulanceRequest.updateMany({
        where: { id: requestId, status: 'PENDING' },
        data: { status: 'CANCELLED', cancelledAt: new Date(), cancelReason: 'timeout' },
    });
    if (claim.count === 0) return null;

    await prisma.dispatchOffer.updateMany({
        where: { requestId, status: 'SHOWN' },
        data: { status: 'LOST' },
    });

    return prisma.ambulanceRequest.findUnique({
        where: { id: requestId },
        include: {
            offers: { where: { telegramMessageId: { not: null } } },
            patient: { select: { telegramAccount: { select: { chatId: true, language: true } } } },
        },
    });
}

/**
 * Dispatcher-driven status updates after accept. Validates ownership +
 * monotonic forward transitions (DISPATCHED → ON_ROUTE → ARRIVED → COMPLETED).
 * On COMPLETED, releases the ambulance back to AVAILABLE and stamps
 * completedAt. All in a transaction so we never half-update on failure.
 */
export type DispatcherStatus = 'ON_ROUTE' | 'ARRIVED' | 'PICKED_UP' | 'DELIVERED' | 'COMPLETED';

const STATUS_ORDER: Record<string, number> = {
    PENDING: 0,
    DISPATCHED: 1,
    ON_ROUTE: 2,
    ARRIVED: 3,
    PICKED_UP: 4,
    DELIVERED: 5,
    COMPLETED: 6,
    CANCELLED: 99,
};

export async function updateRequestStatus(
    requestId: string,
    dispatcherUserId: string,
    newStatus: DispatcherStatus,
) {
    const req = await prisma.ambulanceRequest.findUnique({
        where: { id: requestId },
        include: { acceptedAmbulance: { select: { id: true, dispatcherUserId: true, status: true } } },
    });
    if (!req) throw new AppError('So\'rov topilmadi', 404, ErrorCodes.NOT_FOUND);
    if (!req.acceptedAmbulance || req.acceptedAmbulance.dispatcherUserId !== dispatcherUserId) {
        throw new AppError('Bu so\'rov sizniki emas', 403, ErrorCodes.FORBIDDEN);
    }
    if (req.status === 'CANCELLED' || req.status === 'COMPLETED') {
        return { ok: false as const, reason: 'terminal' as const, request: req };
    }
    const cur = STATUS_ORDER[req.status] ?? -1;
    const nxt = STATUS_ORDER[newStatus] ?? -1;
    if (nxt <= cur) {
        return { ok: false as const, reason: 'not_forward' as const, request: req };
    }

    await prisma.$transaction(async (tx) => {
        await tx.ambulanceRequest.update({
            where: { id: requestId },
            data: {
                status: newStatus,
                ...(newStatus === 'COMPLETED' ? { completedAt: new Date() } : {}),
            },
        });
        if (newStatus === 'COMPLETED' && req.acceptedAmbulance) {
            await tx.ambulance.update({
                where: { id: req.acceptedAmbulance.id },
                data: { status: 'AVAILABLE', lastStatusAt: new Date() },
            });
            await tx.ambulanceStatusLog.create({
                data: {
                    ambulanceId: req.acceptedAmbulance.id,
                    fromStatus: 'BUSY',
                    toStatus: 'AVAILABLE',
                    changedBy: dispatcherUserId,
                    reason: `skory completed: ${requestId}`,
                },
            });
        }
    });

    const fresh = await prisma.ambulanceRequest.findUnique({
        where: { id: requestId },
        include: {
            acceptedAmbulance: { include: { clinic: { select: { nameUz: true } } } },
            patient: { select: { telegramAccount: { select: { chatId: true, language: true } } } },
        },
    });
    return { ok: true as const, request: fresh! };
}

/**
 * Backfill dispatcher links after a Telegram account is created/linked.
 *
 * A clinic can set an ambulance's dispatcherPhone BEFORE that person has ever
 * opened the bot — at that moment there is no User to point at, so
 * dispatcherUserId stays null and the ambulance receives no offers. When the
 * person finally shares their contact / links via /start, this claims every
 * ambulance still waiting on their phone number. Returns the ambulances linked
 * so the caller can tell the dispatcher what they were assigned to.
 */
export async function backfillDispatcherLinks(userId: string): Promise<{ callSign: string; clinicName: string }[]> {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { phone: true } });
    if (!user?.phone) return [];
    const targets = await prisma.ambulance.findMany({
        where: { dispatcherPhone: user.phone, dispatcherUserId: null },
        select: { id: true, callSign: true, clinic: { select: { nameUz: true } } },
    });
    if (targets.length === 0) return [];
    await prisma.ambulance.updateMany({
        where: { dispatcherPhone: user.phone, dispatcherUserId: null },
        data: { dispatcherUserId: userId },
    });
    return targets.map((t) => ({ callSign: t.callSign, clinicName: t.clinic.nameUz }));
}

// ─── Skory trip payment ─────────────────────────────────────────────────────
// Opened when the dispatcher marks DELIVERED: total = trip fee (band price for
// the patient's own pickup→drop leg) + waiting fee. The patient pays via the
// ambulance-clinic's own methods; cash is confirmed by the dispatcher, online
// by the provider webhook. markSkoryPaid() completes the request either way.

const SKORY_METHODS = ['CASH', 'CLICK', 'PAYME', 'ALIF'];

/** Compute + store the trip total and open payment (UNPAID). Idempotent. */
export async function openPaymentForRequest(requestId: string): Promise<{ tripFee: number; waitingFee: number; total: number } | null> {
    const req = await prisma.ambulanceRequest.findUnique({
        where: { id: requestId },
        include: { acceptedAmbulance: { include: { bandTariffs: { select: { bandId: true, baseFee: true, pricePerKm: true } } } } },
    });
    if (!req || !req.acceptedAmbulance) return null;

    // Patient's OWN leg: pickup→destination. When no destination was captured
    // the travelled distance is unknown, so it stays 0 and only the band's base
    // fee applies — we must NEVER fall back to estimatedDistanceKm, which holds
    // the ambulance→pickup APPROACH distance (billing that is exactly the
    // unfairness the band model exists to prevent).
    let tripKm = 0;
    if (req.destLat != null && req.destLng != null) {
        const r = await osrmRoute(req.pickupLat, req.pickupLng, req.destLat, req.destLng);
        tripKm = r?.km ?? haversineKm(req.pickupLat, req.pickupLng, req.destLat, req.destLng);
    }

    const bands = await getActiveBands();
    const breakdown = priceTrip({
        tripKm,
        bands,
        tariffByBandId: tariffMap(req.acceptedAmbulance.bandTariffs),
        legacyBaseFee: req.acceptedAmbulance.baseFee,
        legacyPricePerKm: req.acceptedAmbulance.pricePerKm,
    });
    const tripFee = breakdown.price;
    const waitingFee = req.waitingFee ?? 0;
    const total = tripFee + waitingFee;

    if (req.paymentStatus !== 'PAID') {
        await prisma.ambulanceRequest.update({
            where: { id: requestId },
            data: { tripFee, totalPrice: total },
        });
    }
    return { tripFee, waitingFee, total };
}

/** Payment-page data (public — keyed by the hard-to-guess request UUID). */
export async function getSkoryPaymentInfo(requestId: string) {
    const req = await prisma.ambulanceRequest.findUnique({
        where: { id: requestId },
        include: { acceptedAmbulance: { include: { clinic: { select: { nameUz: true, paymentMethods: true } } } } },
    });
    if (!req) return null;
    const clinic = req.acceptedAmbulance?.clinic;
    const raw = Array.isArray(clinic?.paymentMethods) ? (clinic!.paymentMethods as any[]) : [];
    // Cash is always offered; plus whatever online methods the clinic supports.
    const methods = Array.from(new Set(['CASH', ...raw.filter((m) => SKORY_METHODS.includes(m))]));
    return {
        requestId: req.id,
        status: req.status,
        paymentStatus: req.paymentStatus,
        paymentMethod: req.paymentMethod,
        paidAmount: req.paidAmount,
        tripFee: req.tripFee ?? 0,
        waitingFee: req.waitingFee ?? 0,
        waitingMinutes: req.waitingMinutes ?? 0,
        totalPrice: req.totalPrice ?? ((req.tripFee ?? 0) + (req.waitingFee ?? 0)),
        clinicName: clinic?.nameUz ?? '',
        callSign: req.acceptedAmbulance?.callSign ?? '',
        methods,
        pickupAddress: req.pickupAddress,
        destAddress: req.destAddress,
    };
}

/** Mark PAID + COMPLETE the request + free the ambulance. Idempotent. */
export async function markSkoryPaid(requestId: string, method: string, amount?: number | null) {
    const req = await prisma.ambulanceRequest.findUnique({ where: { id: requestId } });
    if (!req) throw new AppError('So\'rov topilmadi', 404, ErrorCodes.NOT_FOUND);
    if (req.paymentStatus === 'PAID') {
        return { ok: false as const, reason: 'already_paid' as const, requestId };
    }
    const paid = amount ?? req.totalPrice ?? ((req.tripFee ?? 0) + (req.waitingFee ?? 0));
    await prisma.$transaction(async (tx) => {
        await tx.ambulanceRequest.update({
            where: { id: requestId },
            data: {
                paymentStatus: 'PAID', paymentMethod: method, paidAmount: paid, paidAt: new Date(),
                status: 'COMPLETED', completedAt: new Date(),
            },
        });
        if (req.acceptedAmbulanceId) {
            await tx.ambulance.update({
                where: { id: req.acceptedAmbulanceId },
                data: { status: 'AVAILABLE', lastStatusAt: new Date() },
            });
        }
    });
    return { ok: true as const, requestId, method, paid };
}

/**
 * Sweep every skory trip still waiting on an online payment and complete the
 * ones whose bridge appointment the provider has since marked PAID.
 *
 * The payment page also reconciles on read, but that only fires while someone
 * has it open — after paying, the provider drops the patient on
 * /payment/result, so without this worker the trip would sit in DELIVERED and
 * the dispatcher would never hear that the money arrived.
 */
export async function reconcilePendingSkoryPayments(): Promise<string[]> {
    const pending = await prisma.ambulanceRequest.findMany({
        where: {
            paymentStatus: 'UNPAID',
            paymentAppointmentId: { not: null },
            status: { in: ['ARRIVED', 'PICKED_UP', 'DELIVERED'] },
        },
        select: { id: true, paymentAppointmentId: true, paymentMethod: true },
        take: 100,
    });
    const done: string[] = [];
    for (const p of pending) {
        try {
            const appt = await prisma.appointment.findUnique({
                where: { id: p.paymentAppointmentId! },
                select: { paymentStatus: true, paidAmount: true, paymentMethod: true },
            });
            if (!appt || appt.paymentStatus !== 'PAID') continue;
            const r = await markSkoryPaid(p.id, p.paymentMethod || appt.paymentMethod || 'ONLINE', appt.paidAmount ?? null);
            if (r.ok) done.push(p.id);
        } catch (e) {
            console.error('[skory] reconcile sweep failed for', p.id, e);
        }
    }
    return done;
}

// ─── Waiting fee ────────────────────────────────────────────────────────────
// The ambulance may stand by mid-trip (waits at a clinic while the patient is
// seen, then returns them). The dispatcher starts/stops a timer from the bot;
// the fee is waitingMinutes × ambulance.waitingRatePerMin, added to the trip.

// Reminder cadence (minutes elapsed): ping the dispatcher at 5, 15, 25, then
// every 60 min, so they don't forget to stop the timer.
const WAIT_REMIND_STEPS = [5, 15, 25];
export function waitThresholdForStage(stage: number): number {
    if (stage < WAIT_REMIND_STEPS.length) return WAIT_REMIND_STEPS[stage];
    return 60 * (stage - WAIT_REMIND_STEPS.length + 1); // stage3→60, stage4→120…
}

/** Start the waiting timer. Only the accepting dispatcher, only mid-trip. */
export async function startWaiting(requestId: string, dispatcherUserId: string) {
    const req = await prisma.ambulanceRequest.findUnique({
        where: { id: requestId },
        include: { acceptedAmbulance: { select: { dispatcherUserId: true, waitingRatePerMin: true } } },
    });
    if (!req) throw new AppError('So\'rov topilmadi', 404, ErrorCodes.NOT_FOUND);
    if (!req.acceptedAmbulance || req.acceptedAmbulance.dispatcherUserId !== dispatcherUserId) {
        throw new AppError('Bu so\'rov sizniki emas', 403, ErrorCodes.FORBIDDEN);
    }
    if (!['DISPATCHED', 'ON_ROUTE', 'ARRIVED', 'PICKED_UP', 'DELIVERED'].includes(req.status)) {
        return { ok: false as const, reason: 'not_active' as const };
    }
    if (req.waitingStartedAt && !req.waitingEndedAt) {
        return { ok: false as const, reason: 'already_running' as const };
    }
    await prisma.ambulanceRequest.update({
        where: { id: requestId },
        data: { waitingStartedAt: new Date(), waitingEndedAt: null, waitingRemindStage: 0 },
    });
    return { ok: true as const, ratePerMin: req.acceptedAmbulance.waitingRatePerMin ?? 0 };
}

/** Stop the timer and bank the fee (rounded up to whole minutes, min 1). */
export async function stopWaiting(requestId: string, dispatcherUserId: string) {
    const req = await prisma.ambulanceRequest.findUnique({
        where: { id: requestId },
        include: { acceptedAmbulance: { select: { dispatcherUserId: true, waitingRatePerMin: true } } },
    });
    if (!req) throw new AppError('So\'rov topilmadi', 404, ErrorCodes.NOT_FOUND);
    if (!req.acceptedAmbulance || req.acceptedAmbulance.dispatcherUserId !== dispatcherUserId) {
        throw new AppError('Bu so\'rov sizniki emas', 403, ErrorCodes.FORBIDDEN);
    }
    if (!req.waitingStartedAt || req.waitingEndedAt) {
        return { ok: false as const, reason: 'not_running' as const };
    }
    const endedAt = new Date();
    const minutes = Math.max(1, Math.ceil((endedAt.getTime() - req.waitingStartedAt.getTime()) / 60000));
    const rate = req.acceptedAmbulance.waitingRatePerMin ?? 0;
    // Sum onto any earlier waiting segments on the same trip.
    const fee = (req.waitingFee ?? 0) + minutes * rate;
    const totalMinutes = (req.waitingMinutes ?? 0) + minutes;
    await prisma.ambulanceRequest.update({
        where: { id: requestId },
        data: { waitingEndedAt: endedAt, waitingMinutes: totalMinutes, waitingFee: fee },
    });
    return { ok: true as const, minutes, segmentMinutes: minutes, totalMinutes, fee, ratePerMin: rate };
}

/**
 * Requests with a running waiting timer that have crossed their next reminder
 * threshold. Atomically claims each (bumps waitingRemindStage) so in a
 * clustered deployment only one worker sends the ping. Returns the ones to ping.
 */
export async function claimDueWaitingReminders(): Promise<Array<{
    requestId: string; elapsedMin: number; chatId: bigint | null; language: string;
}>> {
    const running = await prisma.ambulanceRequest.findMany({
        where: {
            waitingStartedAt: { not: null },
            waitingEndedAt: null,
            status: { in: ['DISPATCHED', 'ON_ROUTE', 'ARRIVED', 'PICKED_UP', 'DELIVERED'] },
        },
        include: {
            acceptedAmbulance: {
                select: { dispatcher: { select: { telegramAccount: { select: { chatId: true, language: true } } } } },
            },
        },
    });
    const due: Array<{ requestId: string; elapsedMin: number; chatId: bigint | null; language: string }> = [];
    for (const r of running) {
        const elapsedMin = Math.floor((Date.now() - r.waitingStartedAt!.getTime()) / 60000);
        const threshold = waitThresholdForStage(r.waitingRemindStage);
        if (elapsedMin < threshold) continue;
        // Atomic claim: only the worker that flips the stage sends the ping.
        const claim = await prisma.ambulanceRequest.updateMany({
            where: { id: r.id, waitingRemindStage: r.waitingRemindStage, waitingEndedAt: null },
            data: { waitingRemindStage: r.waitingRemindStage + 1 },
        });
        if (claim.count !== 1) continue;
        const acc = r.acceptedAmbulance?.dispatcher?.telegramAccount;
        due.push({ requestId: r.id, elapsedMin, chatId: acc?.chatId ?? null, language: acc?.language || 'uz' });
    }
    return due;
}

/**
 * Patient submits a 1-5 review after a COMPLETED request. One per request
 * (unique requestId); upsert on conflict so the patient can update their
 * rating if they tap the stars again before closing the bot.
 */
export async function submitReview(input: {
    requestId: string;
    patientId: string;
    rating: number;
    comment?: string | null;
}) {
    const req = await prisma.ambulanceRequest.findUnique({
        where: { id: input.requestId },
        select: {
            id: true, patientId: true, status: true,
            acceptedAmbulanceId: true,
            acceptedAmbulance: { select: { clinicId: true } },
        },
    });
    if (!req) throw new AppError('So\'rov topilmadi', 404, ErrorCodes.NOT_FOUND);
    if (req.patientId !== input.patientId) {
        throw new AppError('Bu so\'rov sizniki emas', 403, ErrorCodes.FORBIDDEN);
    }
    if (req.status !== 'COMPLETED') {
        throw new AppError('Sharhi faqat yakunlangan chaqiruvga qoldirish mumkin', 400, ErrorCodes.VALIDATION_ERROR);
    }
    if (!req.acceptedAmbulanceId || !req.acceptedAmbulance?.clinicId) {
        throw new AppError('Ambulans biriktirilmagan', 400, ErrorCodes.VALIDATION_ERROR);
    }
    const rating = Math.max(1, Math.min(5, Math.round(input.rating)));
    const comment = input.comment ? input.comment.trim().slice(0, 500) : null;

    return prisma.ambulanceReview.upsert({
        where: { requestId: req.id },
        create: {
            requestId: req.id,
            patientId: input.patientId,
            ambulanceId: req.acceptedAmbulanceId,
            clinicId: req.acceptedAmbulance.clinicId,
            rating,
            comment,
        },
        update: { rating, comment },
    });
}

export async function getPendingOffersByDispatcher(dispatcherUserId: string) {
    return prisma.dispatchOffer.findMany({
        where: {
            dispatcherUserId,
            status: 'SHOWN',
            request: { status: 'PENDING' },
        },
        include: { request: true, ambulance: true },
    });
}
