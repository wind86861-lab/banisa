import { Request, Response } from 'express';
import prisma from '../../config/database';

// Haversine distance in km.
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
                    street: true, phones: true,
                    latitude: true, longitude: true,
                },
            },
        },
    });

    let items = rows.map((a) => {
        const useLat = a.currentLatitude ?? a.baseLatitude ?? a.clinic.latitude;
        const useLng = a.currentLongitude ?? a.baseLongitude ?? a.clinic.longitude;
        const distanceKm = hasOrigin && Number.isFinite(useLat) && Number.isFinite(useLng)
            ? haversine(lat, lng, useLat!, useLng!)
            : null;
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
            baseFee: a.baseFee,
            pricePerKm: a.pricePerKm,
            dispatchPhone: a.dispatchPhone,
            distanceKm,
            clinic: {
                id: a.clinic.id,
                name: a.clinic.nameUz,
                region: a.clinic.region,
                district: a.clinic.district,
                phones: a.clinic.phones as string[],
            },
        };
    });

    // Equipment filter (Array contains all required)
    if (equipmentReq.length > 0) {
        items = items.filter((a) =>
            equipmentReq.every((e) => (a.equipment || []).includes(e)),
        );
    }

    // Radius filter
    if (hasOrigin && radiusKm > 0) {
        items = items.filter((a) => a.distanceKm != null && a.distanceKm <= radiusKm);
    }

    // Sort: distance asc if origin given, else status (AVAILABLE first) then callSign
    if (hasOrigin) {
        items.sort((a, b) => {
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
        },
    });
};
