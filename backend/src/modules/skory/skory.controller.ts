import { Response } from 'express';
import prisma from '../../config/database';
import { AuthRequest } from '../../middleware/auth.middleware';
import { AppError, ErrorCodes } from '../../utils/errors';
import {
    findCandidates,
    createRequest,
    cancelRequest,
    getActivePendingForPatient,
    getMarketPriceRange,
    getNearbyClinics,
} from './skory.service';
import { getActiveBands } from './ambulance-pricing';
import { fanoutOffersViaTelegram } from '../telegram/skory.bot';
import { getBot } from '../telegram/telegram.bot';

const isNum = (v: any): v is number => typeof v === 'number' && Number.isFinite(v);

// Patient-facing tez-yordam tiers. The enum has more (NEONATAL, CARDIAC…) but
// the patient app offers only these two; anything else is rejected.
const PATIENT_TYPES = ['BASIC', 'INTENSIVE_CARE'] as const;
const normalizeType = (v: any): string | null =>
    typeof v === 'string' && (PATIENT_TYPES as readonly string[]).includes(v) ? v : null;

/**
 * POST /api/skory/request
 * Mini-app submits the wizard payload here. Mirrors the bot's
 * `dispatchRequestFromWizard` but answers via REST.
 *
 * Body: { pickup: {lat,lng,address?}, dest?: {lat,lng,label?,clinicId?},
 *         priceMaxSom?: number|null, description?: string|null }
 */
export const createSkoryRequest = async (req: AuthRequest, res: Response) => {
    const patientId = req.user!.id;
    const b = req.body || {};

    const pickup = b.pickup;
    if (!pickup || !isNum(pickup.lat) || !isNum(pickup.lng)) {
        throw new AppError('Pickup koordinatasi kerak', 400, ErrorCodes.VALIDATION_ERROR);
    }
    if (pickup.lat < -90 || pickup.lat > 90 || pickup.lng < -180 || pickup.lng > 180) {
        throw new AppError('Koordinata oraliqdan tashqarida', 400, ErrorCodes.VALIDATION_ERROR);
    }

    const dest = b.dest && isNum(b.dest.lat) && isNum(b.dest.lng) ? b.dest : null;
    const type = normalizeType(b.type);
    if (b.type != null && !type) {
        throw new AppError('Xizmat turi noto\'g\'ri', 400, ErrorCodes.VALIDATION_ERROR);
    }
    const priceMaxSom = isNum(b.priceMaxSom) && b.priceMaxSom > 0 ? Math.round(b.priceMaxSom) : null;
    const description = typeof b.description === 'string' && b.description.trim()
        ? b.description.trim().slice(0, 500)
        : null;
    const targetAmbulanceId = typeof b.targetAmbulanceId === 'string' && b.targetAmbulanceId.length > 0
        ? b.targetAmbulanceId
        : null;

    // Server-side cooldown: one active PENDING per patient
    const existing = await getActivePendingForPatient(patientId);
    if (existing) {
        return res.status(409).json({
            success: false,
            message: 'Sizda allaqachon yuborilgan so\'rov bor',
            data: { existingRequestId: existing.id },
        });
    }

    const candidates = await findCandidates({
        patientId,
        pickupLat: pickup.lat,
        pickupLng: pickup.lng,
        pickupAddress: pickup.address ?? null,
        destLat: dest?.lat ?? null,
        destLng: dest?.lng ?? null,
        destAddress: dest?.label ?? null,
        destClinicId: dest?.clinicId ?? null,
        priceMaxSom,
        description,
        type,
        targetAmbulanceId,
    });

    if (candidates.length === 0) {
        return res.status(200).json({
            success: false,
            code: 'NO_CANDIDATES',
            message: 'Hozir bo\'sh ambulans topilmadi. 103 ga qo\'ng\'iroq qiling.',
        });
    }

    const { request, offers } = await createRequest(
        {
            patientId,
            pickupLat: pickup.lat,
            pickupLng: pickup.lng,
            pickupAddress: pickup.address ?? null,
            destLat: dest?.lat ?? null,
            destLng: dest?.lng ?? null,
            destAddress: dest?.label ?? null,
            destClinicId: dest?.clinicId ?? null,
            priceMaxSom,
            description,
            type,
        },
        candidates,
    );

    // Pull patient name/phone for the offer message
    const userRow = await prisma.user.findUnique({
        where: { id: patientId },
        select: { firstName: true, lastName: true, phone: true },
    });
    const patientName = [userRow?.firstName, userRow?.lastName].filter(Boolean).join(' ') || null;
    const patientPhone = userRow?.phone || null;

    let delivered = 0;
    const bot = getBot();
    if (bot) {
        try {
            delivered = await fanoutOffersViaTelegram(bot, request, offers, candidates, {
                patientName,
                patientPhone,
                pickupLat: pickup.lat,
                pickupLng: pickup.lng,
                pickupAddress: pickup.address ?? null,
                destAddress: dest?.label ?? null,
                priceMaxSom,
                description,
            });
        } catch (e) {
            console.error('[skory] miniapp fanout failed', e);
        }
    } else {
        console.warn('[skory] bot unavailable — request created but no dispatcher notified');
    }

    if (delivered === 0) {
        try {
            await prisma.ambulanceRequest.update({
                where: { id: request.id },
                data: { status: 'CANCELLED', cancelledAt: new Date(), cancelReason: 'no_dispatcher_received' },
            });
        } catch { /* */ }
        return res.status(200).json({
            success: false,
            code: 'NO_DELIVERY',
            message: 'Birorta ambulans habar olmadi. 103 ga qo\'ng\'iroq qiling.',
        });
    }

    return res.json({
        success: true,
        data: { requestId: request.id, deliveredCount: delivered, candidatesCount: candidates.length },
    });
};

/**
 * GET /api/skory/active
 * Returns the patient's current still-active request (any non-terminal
 * status). Frontend polls this every ~3s to drive the status screen.
 */
export const getActiveSkory = async (req: AuthRequest, res: Response) => {
    const patientId = req.user!.id;
    const active = await prisma.ambulanceRequest.findFirst({
        where: {
            patientId,
            status: { in: ['PENDING', 'DISPATCHED', 'ON_ROUTE', 'ARRIVED', 'PICKED_UP', 'DELIVERED'] },
        },
        orderBy: { createdAt: 'desc' },
        include: {
            acceptedAmbulance: {
                include: {
                    clinic: { select: { id: true, nameUz: true } },
                    dispatcher: { select: { phone: true } },
                },
            },
            offers: { select: { id: true, status: true } },
        },
    });
    return res.json({ success: true, data: active });
};

/**
 * GET /api/skory/last
 * Latest request (any status) — for "review prompt after COMPLETED" UX.
 */
export const getLastSkory = async (req: AuthRequest, res: Response) => {
    const patientId = req.user!.id;
    const last = await prisma.ambulanceRequest.findFirst({
        where: { patientId },
        orderBy: { createdAt: 'desc' },
        include: {
            acceptedAmbulance: { include: { clinic: { select: { nameUz: true } } } },
            review: true,
        },
    });
    return res.json({ success: true, data: last });
};

/**
 * POST /api/skory/:id/cancel
 */
export const cancelSkoryRequest = async (req: AuthRequest, res: Response) => {
    const patientId = req.user!.id;
    const id = String(req.params.id || '');
    const reason = typeof req.body?.reason === 'string' ? req.body.reason.slice(0, 200) : 'patient_cancelled';
    const updated = await cancelRequest(id, patientId, reason);
    return res.json({ success: true, data: updated });
};

/**
 * GET /api/skory/price-range?lat=&lng=&destLat=&destLng=
 * Public — used by the wizard's "step 3" preview before submitting.
 */
export const getSkoryPriceRange = async (req: AuthRequest, res: Response) => {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        throw new AppError('lat/lng kerak', 400, ErrorCodes.VALIDATION_ERROR);
    }
    const destLat = req.query.destLat != null ? Number(req.query.destLat) : null;
    const destLng = req.query.destLng != null ? Number(req.query.destLng) : null;
    const range = await getMarketPriceRange({
        pickupLat: lat,
        pickupLng: lng,
        destLat: Number.isFinite(destLat as number) ? destLat : null,
        destLng: Number.isFinite(destLng as number) ? destLng : null,
        type: normalizeType(req.query.type),
    });
    return res.json({ success: true, data: range });
};

/**
 * GET /api/skory/nearby-clinics?lat=&lng=&take=
 * Public — wizard's hospital picker on step 2.
 */
export const getSkoryNearbyClinics = async (req: AuthRequest, res: Response) => {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        throw new AppError('lat/lng kerak', 400, ErrorCodes.VALIDATION_ERROR);
    }
    const take = Math.min(20, Math.max(1, parseInt(String(req.query.take || '10'), 10) || 10));
    const clinics = await getNearbyClinics(lat, lng, take);
    return res.json({ success: true, data: { items: clinics } });
};

/**
 * GET /api/skory/bands
 * Public — active distance bands (label + km range). Used by the clinic
 * ambulance form to render a tariff row per band, and available to the
 * patient app if it wants to show the band ladder.
 */
export const getSkoryBands = async (_req: AuthRequest, res: Response) => {
    const bands = await getActiveBands();
    return res.json({ success: true, data: { items: bands } });
};
