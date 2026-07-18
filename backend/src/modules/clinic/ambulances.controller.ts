import { Response } from 'express';
import prisma from '../../config/database';
import { AuthRequest } from '../../middleware/auth.middleware';
import { resolveUserClinicId } from './clinic-context.util';

// Membership-aware so secondary admins (clinicId=null) resolve their clinic.
const resolveClinicId = (userId: string) => resolveUserClinicId(userId);

function normalizePhone(raw: string | null | undefined): string | null {
    if (!raw) return null;
    let s = String(raw).trim().replace(/[\s\-()]/g, '');
    if (!s) return null;
    if (!s.startsWith('+') && /^\d{9,15}$/.test(s)) s = '+' + s;
    return /^\+\d{9,15}$/.test(s) ? s : null;
}

/**
 * Match a dispatcher phone to a real User (any role). Returns the userId or
 * null. We DON'T auto-create a user here — the dispatcher has to be a real
 * person who has signed up via the bot or web, otherwise we have no
 * telegramAccount to send offers to. The phone is still stored on the
 * Ambulance row so when the dispatcher does sign up later, a separate
 * background job (or the next ambulance edit) can resolve them.
 */
async function resolveDispatcherUser(phone: string | null): Promise<string | null> {
    if (!phone) return null;
    const u = await prisma.user.findFirst({
        where: { phone },
        select: { id: true },
    });
    return u?.id ?? null;
}

const AMBULANCE_TYPES = ['BASIC', 'INTENSIVE_CARE', 'NEONATAL', 'CARDIAC', 'TRAUMA', 'OBSTETRIC'] as const;
const AMBULANCE_STATUSES = ['AVAILABLE', 'BUSY', 'MAINTENANCE', 'OFFLINE'] as const;
type AmbStatus = typeof AMBULANCE_STATUSES[number];

/**
 * If a clinic submits an ambulance without per-vehicle pricing, fall back
 * to the SUPER_ADMIN-set global defaults so the row is valid for dispatch.
 * Returns the resolved values (which may still be null if the admin hasn't
 * configured defaults either — callers then refuse activation).
 */
async function resolvePricing(input: {
    baseFee: number | null;
    pricePerKm: number | null;
}): Promise<{ baseFee: number | null; pricePerKm: number | null }> {
    const need = input.baseFee == null || input.pricePerKm == null;
    if (!need) return { baseFee: input.baseFee, pricePerKm: input.pricePerKm };
    const g = await prisma.globalAmbulanceSettings.findFirst({ orderBy: { createdAt: 'asc' } });
    return {
        baseFee: input.baseFee ?? g?.defaultBaseFee ?? null,
        pricePerKm: input.pricePerKm ?? g?.defaultPricePerKm ?? null,
    };
}

/**
 * Replace an ambulance's per-band tariffs with the submitted set. Accepts
 * `[{ bandId, baseFee, pricePerKm }]`; ignores rows with an unknown band or
 * non-numeric price. Rows omitted from the payload are deleted (full replace).
 * When `rows` is undefined the tariffs are left untouched.
 */
async function saveBandTariffs(ambulanceId: string, rows: any): Promise<void> {
    if (!Array.isArray(rows)) return;
    const validBands = new Set(
        (await prisma.ambulancePricingBand.findMany({ select: { id: true } })).map((b) => b.id),
    );
    const clean = rows
        .map((r) => ({
            bandId: String(r?.bandId || ''),
            baseFee: Math.max(0, Math.round(Number(r?.baseFee))),
            pricePerKm: Math.max(0, Math.round(Number(r?.pricePerKm))),
        }))
        .filter((r) => validBands.has(r.bandId) && Number.isFinite(r.baseFee) && Number.isFinite(r.pricePerKm));

    await prisma.$transaction([
        prisma.ambulanceBandTariff.deleteMany({ where: { ambulanceId } }),
        ...(clean.length
            ? [prisma.ambulanceBandTariff.createMany({
                data: clean.map((r) => ({ ambulanceId, ...r })),
                skipDuplicates: true,
            })]
            : []),
    ]);
}

/** Does this ambulance have at least one usable price (legacy OR any band)? */
async function hasAnyPrice(a: { pricePerKm: number | null }, ambulanceId: string): Promise<boolean> {
    if (a.pricePerKm != null) return true;
    const n = await prisma.ambulanceBandTariff.count({ where: { ambulanceId } });
    return n > 0;
}

// ─── GET /api/clinic/ambulances ──────────────────────────────────────────────
export const listAmbulances = async (req: AuthRequest, res: Response) => {
    const clinicId = await resolveClinicId(req.user!.id);
    if (!clinicId) return res.status(404).json({ success: false, message: 'Klinika topilmadi' });

    const items = await prisma.ambulance.findMany({
        where: { clinicId },
        orderBy: [{ status: 'asc' }, { callSign: 'asc' }],
        include: { bandTariffs: { select: { bandId: true, baseFee: true, pricePerKm: true } } },
    });
    return res.json({ success: true, data: { items } });
};

// ─── POST /api/clinic/ambulances ─────────────────────────────────────────────
export const createAmbulance = async (req: AuthRequest, res: Response) => {
    const clinicId = await resolveClinicId(req.user!.id);
    if (!clinicId) return res.status(404).json({ success: false, message: 'Klinika topilmadi' });

    const {
        callSign, type, vehicleModel, licensePlate, capacity,
        equipment, baseLatitude, baseLongitude, baseFee, pricePerKm,
        dispatchPhone, dispatcherPhone, photoUrl, notes, status, bandTariffs,
    } = req.body || {};

    if (typeof callSign !== 'string' || callSign.trim().length < 1) {
        return res.status(400).json({ success: false, message: 'callSign kerak' });
    }
    if (type && !AMBULANCE_TYPES.includes(type)) {
        return res.status(400).json({ success: false, message: 'type noto\'g\'ri' });
    }
    if (status && !AMBULANCE_STATUSES.includes(status)) {
        return res.status(400).json({ success: false, message: 'status noto\'g\'ri' });
    }

    const dispatcherPhoneNorm = normalizePhone(dispatcherPhone);
    const dispatcherUserId = await resolveDispatcherUser(dispatcherPhoneNorm);

    const pricing = await resolvePricing({
        baseFee: Number.isFinite(baseFee) ? baseFee : null,
        pricePerKm: Number.isFinite(pricePerKm) ? pricePerKm : null,
    });

    // A per-band tariff counts as a valid price for activation, same as a
    // legacy flat price. Reject AVAILABLE only when neither exists.
    const hasBandTariff = Array.isArray(bandTariffs)
        && bandTariffs.some((r: any) => Number.isFinite(Number(r?.pricePerKm)) && Number(r?.pricePerKm) >= 0 && r?.bandId);
    const requestedStatus = (status || 'OFFLINE') as AmbStatus;
    if (requestedStatus === 'AVAILABLE' && pricing.pricePerKm == null && !hasBandTariff) {
        return res.status(400).json({
            success: false,
            message: 'Narx kiriting: poyaslar bo\'yicha tarif yoki 1 km narxi (aks holda ambulansni AVAILABLE qila olmaysiz)',
        });
    }

    try {
        const created = await prisma.ambulance.create({
            data: {
                clinicId,
                callSign: callSign.trim(),
                type: (type || 'BASIC') as any,
                vehicleModel: vehicleModel?.trim() || null,
                licensePlate: licensePlate?.trim() || null,
                capacity: Math.max(1, Math.min(20, Number(capacity) || 1)),
                equipment: Array.isArray(equipment) ? equipment : [],
                baseLatitude: Number.isFinite(baseLatitude) ? baseLatitude : null,
                baseLongitude: Number.isFinite(baseLongitude) ? baseLongitude : null,
                baseFee: pricing.baseFee,
                pricePerKm: pricing.pricePerKm,
                dispatchPhone: dispatchPhone?.trim() || null,
                dispatcherPhone: dispatcherPhoneNorm,
                dispatcherUserId,
                photoUrl: photoUrl?.trim() || null,
                notes: notes?.trim() || null,
                status: requestedStatus as any,
                lastStatusAt: new Date(),
            },
        });
        await saveBandTariffs(created.id, bandTariffs);
        return res.json({ success: true, data: created });
    } catch (err: any) {
        if (err.code === 'P2002') {
            return res.status(400).json({ success: false, message: 'Bu callSign allaqachon mavjud' });
        }
        throw err;
    }
};

// ─── PATCH /api/clinic/ambulances/:id ────────────────────────────────────────
export const updateAmbulance = async (req: AuthRequest, res: Response) => {
    const clinicId = await resolveClinicId(req.user!.id);
    if (!clinicId) return res.status(404).json({ success: false, message: 'Klinika topilmadi' });

    const id = String(req.params.id || '');
    const existing = await prisma.ambulance.findUnique({ where: { id } });
    if (!existing || existing.clinicId !== clinicId) {
        return res.status(404).json({ success: false, message: 'Topilmadi' });
    }

    const {
        callSign, type, vehicleModel, licensePlate, capacity,
        equipment, baseLatitude, baseLongitude, baseFee, pricePerKm,
        dispatchPhone, dispatcherPhone, photoUrl, notes, isActive, bandTariffs,
    } = req.body || {};
    const data: any = {};
    if (typeof callSign === 'string' && callSign.trim().length >= 1) data.callSign = callSign.trim();
    if (type && AMBULANCE_TYPES.includes(type)) data.type = type;
    if (typeof vehicleModel === 'string') data.vehicleModel = vehicleModel.trim() || null;
    if (typeof licensePlate === 'string') data.licensePlate = licensePlate.trim() || null;
    if (Number.isFinite(capacity)) data.capacity = Math.max(1, Math.min(20, capacity));
    if (Array.isArray(equipment)) data.equipment = equipment;
    if (Number.isFinite(baseLatitude) || baseLatitude === null) data.baseLatitude = baseLatitude;
    if (Number.isFinite(baseLongitude) || baseLongitude === null) data.baseLongitude = baseLongitude;
    if (Number.isFinite(baseFee) || baseFee === null) data.baseFee = baseFee;
    if (Number.isFinite(pricePerKm) || pricePerKm === null) data.pricePerKm = pricePerKm;
    // Auto-fill from global default whenever the caller cleared / didn't set
    // a price field on a row that also has no per-vehicle override.
    if (data.baseFee == null || data.pricePerKm == null) {
        const pricing = await resolvePricing({
            baseFee: data.baseFee ?? existing.baseFee ?? null,
            pricePerKm: data.pricePerKm ?? existing.pricePerKm ?? null,
        });
        if ('baseFee' in data || existing.baseFee == null) data.baseFee = pricing.baseFee;
        if ('pricePerKm' in data || existing.pricePerKm == null) data.pricePerKm = pricing.pricePerKm;
    }
    if (typeof dispatchPhone === 'string') data.dispatchPhone = dispatchPhone.trim() || null;
    if (typeof dispatcherPhone === 'string') {
        const norm = normalizePhone(dispatcherPhone);
        data.dispatcherPhone = norm;
        // Re-resolve every edit — admin may have entered a different number
        // OR the previously-unresolved dispatcher might have signed up since.
        data.dispatcherUserId = await resolveDispatcherUser(norm);
    }
    if (typeof photoUrl === 'string') data.photoUrl = photoUrl.trim() || null;
    if (typeof notes === 'string') data.notes = notes.trim() || null;
    if (typeof isActive === 'boolean') data.isActive = isActive;

    try {
        const updated = await prisma.ambulance.update({ where: { id }, data });
        await saveBandTariffs(id, bandTariffs);
        return res.json({ success: true, data: updated });
    } catch (err: any) {
        if (err.code === 'P2002') {
            return res.status(400).json({ success: false, message: 'Bu callSign allaqachon mavjud' });
        }
        throw err;
    }
};

// ─── PATCH /api/clinic/ambulances/:id/status ────────────────────────────────
export const changeStatus = async (req: AuthRequest, res: Response) => {
    const clinicId = await resolveClinicId(req.user!.id);
    if (!clinicId) return res.status(404).json({ success: false, message: 'Klinika topilmadi' });

    const id = String(req.params.id || '');
    const { status, reason } = req.body || {};
    if (!AMBULANCE_STATUSES.includes(status)) {
        return res.status(400).json({ success: false, message: 'status noto\'g\'ri' });
    }

    const existing = await prisma.ambulance.findUnique({ where: { id } });
    if (!existing || existing.clinicId !== clinicId) {
        return res.status(404).json({ success: false, message: 'Topilmadi' });
    }
    if (existing.status === status) {
        return res.json({ success: true, data: existing });
    }

    // Activation guard: AVAILABLE requires a price (own override OR the
    // global admin default — which is auto-stamped onto baseFee/pricePerKm
    // at create/update time, so this should already be non-null by now).
    if (status === 'AVAILABLE' && !(await hasAnyPrice(existing, id))) {
        return res.status(400).json({
            success: false,
            message: 'AVAILABLE qilish uchun narx kerak: poyas tarifi yoki 1 km narxi. Ambulansni tahrirlab narx kiriting.',
        });
    }

    const [updated] = await prisma.$transaction([
        prisma.ambulance.update({
            where: { id },
            data: { status: status as AmbStatus, lastStatusAt: new Date() },
        }),
        prisma.ambulanceStatusLog.create({
            data: {
                ambulanceId: id,
                fromStatus: existing.status,
                toStatus: status as AmbStatus,
                changedBy: req.user!.id,
                reason: typeof reason === 'string' ? reason.trim().slice(0, 200) : null,
            },
        }),
    ]);

    return res.json({ success: true, data: updated });
};

// ─── DELETE /api/clinic/ambulances/:id ───────────────────────────────────────
export const deleteAmbulance = async (req: AuthRequest, res: Response) => {
    const clinicId = await resolveClinicId(req.user!.id);
    if (!clinicId) return res.status(404).json({ success: false, message: 'Klinika topilmadi' });

    const id = String(req.params.id || '');
    const existing = await prisma.ambulance.findUnique({ where: { id } });
    if (!existing || existing.clinicId !== clinicId) {
        return res.status(404).json({ success: false, message: 'Topilmadi' });
    }
    await prisma.ambulance.delete({ where: { id } });
    return res.json({ success: true });
};

// ─── GET /api/clinic/ambulances/:id/status-history ──────────────────────────
export const getStatusHistory = async (req: AuthRequest, res: Response) => {
    const clinicId = await resolveClinicId(req.user!.id);
    if (!clinicId) return res.status(404).json({ success: false, message: 'Klinika topilmadi' });

    const id = String(req.params.id || '');
    const existing = await prisma.ambulance.findUnique({ where: { id } });
    if (!existing || existing.clinicId !== clinicId) {
        return res.status(404).json({ success: false, message: 'Topilmadi' });
    }

    const items = await prisma.ambulanceStatusLog.findMany({
        where: { ambulanceId: id },
        orderBy: { createdAt: 'desc' },
        take: 50,
    });
    return res.json({ success: true, data: { items } });
};
