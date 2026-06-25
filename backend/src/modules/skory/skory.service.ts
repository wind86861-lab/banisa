import prisma from '../../config/database';
import { AppError, ErrorCodes } from '../../utils/errors';

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
            status: 'AVAILABLE',
            dispatcherUserId: { not: null },
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
        },
    });

    // Pre-filter: must have coordinates + telegram + within rough radius.
    const PREFILTER_RADIUS_KM = 25;
    const rough = ambulances
        .map((a) => {
            const lat = a.currentLatitude ?? a.baseLatitude ?? a.clinic.latitude;
            const lng = a.currentLongitude ?? a.baseLongitude ?? a.clinic.longitude;
            const chatId = a.dispatcher?.telegramAccount?.chatId ?? null;
            if (lat == null || lng == null || !a.dispatcherUserId || !chatId) return null;
            const distanceKm = haversineKm(input.pickupLat, input.pickupLng, lat, lng);
            if (distanceKm > PREFILTER_RADIUS_KM) return null;
            return { a, lat, lng, distanceKm, chatId };
        })
        .filter((x): x is NonNullable<typeof x> => x !== null)
        .sort((x, y) => x.distanceKm - y.distanceKm)
        .slice(0, 20);  // cap OSRM calls

    // Real driving distance for each survivor.
    const enriched = await Promise.all(rough.map(async ({ a, lat, lng, distanceKm, chatId }) => {
        const route = await osrmRoute(input.pickupLat, input.pickupLng, lat, lng)
            ?? { km: distanceKm, minutes: Math.max(1, Math.round(distanceKm * 2)) };
        const baseFee = a.baseFee ?? 0;
        const pricePerKm = a.pricePerKm ?? 0;
        // If patient also gave a destination, factor in pickup→drop driving km
        // for the price ceiling (more honest than ambulance→pickup alone).
        let billableKm = route.km;
        if (input.destLat != null && input.destLng != null) {
            const onward = await osrmRoute(input.pickupLat, input.pickupLng, input.destLat, input.destLng);
            if (onward) billableKm = onward.km;
        }
        const estimatedPrice = baseFee + Math.round(billableKm * pricePerKm);

        const candidate: CandidateAmbulance = {
            ambulanceId: a.id,
            clinicId: a.clinic.id,
            clinicName: a.clinic.nameUz,
            callSign: a.callSign,
            type: a.type,
            dispatcherUserId: a.dispatcherUserId!,
            dispatcherChatId: chatId,
            dispatcherLanguage: a.dispatcher?.telegramAccount?.language || 'uz',
            ambulanceLat: lat,
            ambulanceLng: lng,
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
 * Atomic accept: only the first call that finds acceptedAmbulanceId IS NULL
 * wins. Returns { won: true, request, offer } for the winner; { won: false }
 * for losers. Caller is responsible for editing telegram messages.
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

    // Atomic UPDATE ... WHERE acceptedAmbulanceId IS NULL — Prisma updateMany
    // returns the count actually changed. If 0, someone else won.
    const claim = await prisma.ambulanceRequest.updateMany({
        where: { id: offer.requestId, status: 'PENDING', acceptedAmbulanceId: null },
        data: {
            status: 'DISPATCHED',
            acceptedAmbulanceId: offer.ambulanceId,
            acceptedAt: new Date(),
        },
    });

    if (claim.count === 0) {
        await prisma.dispatchOffer.update({
            where: { id: offerId },
            data: { status: 'LOST', respondedAt: new Date() },
        });
        const fresh = await prisma.ambulanceRequest.findUnique({ where: { id: offer.requestId } });
        return { won: false as const, offer, request: fresh!, reason: 'lost' as const };
    }

    // Mark this offer ACCEPTED, the rest LOST.
    await prisma.$transaction([
        prisma.dispatchOffer.update({
            where: { id: offerId },
            data: { status: 'ACCEPTED', respondedAt: new Date() },
        }),
        prisma.dispatchOffer.updateMany({
            where: { requestId: offer.requestId, id: { not: offerId }, status: 'SHOWN' },
            data: { status: 'LOST' },
        }),
        // Ambulance flips to BUSY for the duration of the call.
        prisma.ambulance.update({
            where: { id: offer.ambulanceId },
            data: { status: 'BUSY', lastStatusAt: new Date() },
        }),
    ]);

    const winnerRequest = await prisma.ambulanceRequest.findUnique({
        where: { id: offer.requestId },
        include: { acceptedAmbulance: { include: { clinic: { select: { nameUz: true, phones: true } } } } },
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
            ]
            : []),
    ]);

    return prisma.ambulanceRequest.findUnique({
        where: { id: requestId },
        include: { offers: true, acceptedAmbulance: true },
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
