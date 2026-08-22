import prisma from '../../config/database';
import { AppError, ErrorCodes } from '../../utils/errors';

async function getOwned(id: string, patientId: string) {
    const rec: any = await (prisma as any).recommendation.findUnique({
        where: { id },
        include: {
            items: true,
            clinic: { select: { id: true, nameUz: true, logo: true } },
            doctor: { select: { firstName: true, lastName: true } },
        },
    });
    if (!rec || rec.patientId !== patientId) throw new AppError('Tavsiya topilmadi', 404, ErrorCodes.NOT_FOUND);
    return rec;
}

function shape(rec: any, status: string) {
    return {
        id: rec.id,
        status,
        total: rec.totalAmount,
        note: rec.note,
        createdAt: rec.createdAt,
        expiresAt: rec.expiresAt,
        doctorName: [rec.doctor?.firstName, rec.doctor?.lastName].filter(Boolean).join(' ') || 'Shifokor',
        clinic: { id: rec.clinic?.id, name: rec.clinic?.nameUz, logo: rec.clinic?.logo },
        items: (rec.items || []).map((i: any) => ({
            id: i.id, serviceType: i.serviceType, serviceId: i.serviceId,
            name: i.nameSnapshot, price: i.priceSnapshot, quantity: i.quantity,
        })),
    };
}

/** Lazily expire a still-PENDING recommendation whose 3-day window has passed. */
async function maybeExpire(rec: any): Promise<string> {
    if (rec.status === 'PENDING' && new Date(rec.expiresAt) < new Date()) {
        await (prisma as any).recommendation.update({ where: { id: rec.id }, data: { status: 'EXPIRED' } });
        return 'EXPIRED';
    }
    return rec.status;
}

export async function getForPatient(id: string, patientId: string) {
    const rec = await getOwned(id, patientId);
    return shape(rec, await maybeExpire(rec));
}

export async function listForPatient(patientId: string) {
    const rows: any[] = await (prisma as any).recommendation.findMany({
        where: { patientId },
        orderBy: { createdAt: 'desc' },
        include: { items: { select: { id: true } }, clinic: { select: { nameUz: true } }, doctor: { select: { firstName: true, lastName: true } } },
    });
    return rows.map(r => ({
        id: r.id, status: r.status, total: r.totalAmount, createdAt: r.createdAt, expiresAt: r.expiresAt,
        clinicName: r.clinic?.nameUz ?? null,
        doctorName: [r.doctor?.firstName, r.doctor?.lastName].filter(Boolean).join(' ') || 'Shifokor',
        itemCount: r.items.length,
    }));
}

export async function removeItem(id: string, patientId: string, itemId: string) {
    const rec = await getOwned(id, patientId);
    if (rec.status !== 'PENDING') throw new AppError('Bu tavsiyani tahrirlab bo\'lmaydi', 400, ErrorCodes.VALIDATION_ERROR);
    const item = rec.items.find((i: any) => i.id === itemId);
    if (!item) throw new AppError('Xizmat topilmadi', 404, ErrorCodes.NOT_FOUND);
    if (rec.items.length <= 1) throw new AppError('Kamida bitta xizmat qolishi kerak', 400, ErrorCodes.VALIDATION_ERROR);
    await (prisma as any).$transaction(async (tx: any) => {
        await tx.recommendationItem.delete({ where: { id: itemId } });
        const total = rec.items.filter((i: any) => i.id !== itemId).reduce((s: number, i: any) => s + i.priceSnapshot * i.quantity, 0);
        await tx.recommendation.update({ where: { id }, data: { totalAmount: total } });
    });
    return getForPatient(id, patientId);
}

export async function respond(id: string, patientId: string, action: 'accept' | 'reject') {
    const rec = await getOwned(id, patientId);
    if (rec.status !== 'PENDING') throw new AppError('Bu tavsiyaga allaqachon javob berilgan', 400, ErrorCodes.VALIDATION_ERROR);
    if (new Date(rec.expiresAt) < new Date()) {
        await (prisma as any).recommendation.update({ where: { id }, data: { status: 'EXPIRED' } });
        throw new AppError('Tavsiya muddati o\'tgan', 400, ErrorCodes.VALIDATION_ERROR);
    }
    const status = action === 'accept' ? 'ACCEPTED' : 'REJECTED';
    await (prisma as any).recommendation.update({ where: { id }, data: { status, respondedAt: new Date() } });
    // TODO(P4): on accept → seed the patient cart from items → existing checkout → BOOKED.
    return { id, status };
}
