import { Response } from 'express';
import prisma from '../../config/database';
import { AuthRequest } from '../../middleware/auth.middleware';
import { isDateBlocked } from '../clinic/services/unavailable-dates.service';
import crypto from 'crypto';

// Generate a short booking number (legacy-compatible).
async function generateBookingNumber(): Promise<string> {
    for (let i = 0; i < 5; i++) {
        const n = `B${Date.now().toString().slice(-7)}${Math.floor(Math.random() * 90 + 10)}`;
        const exists = await prisma.appointment.findUnique({ where: { bookingNumber: n } });
        if (!exists) return n;
    }
    return `B${Date.now()}${crypto.randomBytes(2).toString('hex')}`;
}

const generateQrToken = () => crypto.randomBytes(16).toString('hex');

// POST /api/user/doctor-bookings
// Books a doctor appointment with global slot lock. Race-safe via Serializable.
export const createDoctorBooking = async (req: AuthRequest, res: Response) => {
    const patientId = req.user!.id;
    const { doctorId, clinicId, scheduledAt, notes } = req.body || {};

    if (typeof doctorId !== 'string' || typeof clinicId !== 'string' || typeof scheduledAt !== 'string') {
        return res.status(400).json({ success: false, message: 'doctorId, clinicId, scheduledAt kerak' });
    }

    const scheduledDate = new Date(scheduledAt);
    if (Number.isNaN(scheduledDate.getTime())) {
        return res.status(400).json({ success: false, message: 'scheduledAt noto\'g\'ri' });
    }
    if (scheduledDate < new Date()) {
        return res.status(400).json({ success: false, message: 'O\'tgan vaqtga band qilib bo\'lmaydi' });
    }

    // Clinic closed this doctor for the chosen date.
    if (await isDateBlocked(clinicId, 'DOCTOR', doctorId, scheduledDate)) {
        return res.status(400).json({ success: false, message: 'Tanlangan sana bu doktor uchun band emas. Boshqa sana tanlang.' });
    }

    const dc = await prisma.doctorClinic.findFirst({
        where: { doctorId, clinicId, isActive: true },
        include: {
            clinic: { select: { id: true, commissionRate: true, defaultDiscountPercent: true } },
            doctor: { select: { id: true, firstName: true, lastName: true, isActive: true } },
        },
    });
    if (!dc || !dc.doctor?.isActive) {
        return res.status(404).json({ success: false, message: 'Doktor bu klinikada faol emas' });
    }

    const bookingNumber = await generateBookingNumber();
    const qrToken = generateQrToken();
    const price = dc.consultationPrice;
    const discountPercent = dc.clinic.defaultDiscountPercent || 0;
    const discountAmount = Math.round((price * discountPercent) / 100);
    const finalPrice = price - discountAmount;

    try {
        const appointment = await prisma.$transaction(async (tx) => {
            // 1. Global slot lock — doctor must not have another active booking at this exact time.
            const conflict = await tx.appointment.findFirst({
                where: {
                    doctorId,
                    scheduledAt: scheduledDate,
                    status: { notIn: ['CANCELLED', 'NO_SHOW'] },
                },
                select: { id: true, clinicId: true },
            });
            if (conflict) {
                throw new Error('SLOT_TAKEN');
            }

            // 2. Patient duplicate — same patient already booked this exact slot
            const myDuplicate = await tx.appointment.findFirst({
                where: {
                    patientId,
                    doctorId,
                    scheduledAt: scheduledDate,
                    status: { notIn: ['CANCELLED', 'NO_SHOW'] },
                },
            });
            if (myDuplicate) return myDuplicate;

            // 3. Create
            return tx.appointment.create({
                data: {
                    bookingNumber,
                    clinicId,
                    patientId,
                    doctorId,
                    serviceType: 'OTHER',
                    scheduledAt: scheduledDate,
                    status: 'PENDING',
                    price,
                    notes: notes?.trim() || null,
                    qrToken,
                    discountPercent,
                    discountAmount,
                    finalPrice,
                    commissionRate: dc.clinic.commissionRate,
                    paymentStatus: 'UNPAID',
                },
            });
        }, { isolationLevel: 'Serializable' });

        return res.json({ success: true, data: {
            id: appointment.id,
            bookingNumber: appointment.bookingNumber,
            scheduledAt: appointment.scheduledAt,
            price: appointment.price,
            finalPrice: appointment.finalPrice,
        }});
    } catch (err: any) {
        if (err.message === 'SLOT_TAKEN') {
            return res.status(409).json({
                success: false,
                message: 'Bu vaqt boshqa bemor tomonidan band qilib olindi. Boshqa vaqtni tanlang.',
                code: 'SLOT_TAKEN',
            });
        }
        // Prisma serialization error → retry-friendly message
        if (err.code === 'P2034' || err.message?.includes('could not serialize')) {
            return res.status(409).json({
                success: false,
                message: 'Tizim band — qaytadan urinib ko\'ring',
                code: 'RETRY',
            });
        }
        throw err;
    }
};
