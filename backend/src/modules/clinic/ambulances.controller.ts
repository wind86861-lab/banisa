import { Response } from 'express';
import prisma from '../../config/database';
import { AuthRequest } from '../../middleware/auth.middleware';

async function resolveClinicId(userId: string): Promise<string | null> {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { clinicId: true } });
    return user?.clinicId ?? null;
}

const AMBULANCE_TYPES = ['BASIC', 'INTENSIVE_CARE', 'NEONATAL', 'CARDIAC', 'TRAUMA', 'OBSTETRIC'] as const;
const AMBULANCE_STATUSES = ['AVAILABLE', 'BUSY', 'MAINTENANCE', 'OFFLINE'] as const;
type AmbStatus = typeof AMBULANCE_STATUSES[number];

// ─── GET /api/clinic/ambulances ──────────────────────────────────────────────
export const listAmbulances = async (req: AuthRequest, res: Response) => {
    const clinicId = await resolveClinicId(req.user!.id);
    if (!clinicId) return res.status(404).json({ success: false, message: 'Klinika topilmadi' });

    const items = await prisma.ambulance.findMany({
        where: { clinicId },
        orderBy: [{ status: 'asc' }, { callSign: 'asc' }],
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
        dispatchPhone, notes, status,
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
                baseFee: Number.isFinite(baseFee) ? baseFee : null,
                pricePerKm: Number.isFinite(pricePerKm) ? pricePerKm : null,
                dispatchPhone: dispatchPhone?.trim() || null,
                notes: notes?.trim() || null,
                status: (status || 'OFFLINE') as any,
                lastStatusAt: new Date(),
            },
        });
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
        dispatchPhone, notes, isActive,
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
    if (typeof dispatchPhone === 'string') data.dispatchPhone = dispatchPhone.trim() || null;
    if (typeof notes === 'string') data.notes = notes.trim() || null;
    if (typeof isActive === 'boolean') data.isActive = isActive;

    try {
        const updated = await prisma.ambulance.update({ where: { id }, data });
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
