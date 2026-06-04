import { Response } from 'express';
import prisma from '../../config/database';
import { AuthRequest } from '../../middleware/auth.middleware';

const MAX_CLINICS_PER_DOCTOR = 3;

async function resolveClinicId(userId: string): Promise<string | null> {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { clinicId: true } });
    return user?.clinicId ?? null;
}

// ─── GET /api/clinic/doctors ─────────────────────────────────────────────────
export const listDoctors = async (req: AuthRequest, res: Response) => {
    const clinicId = await resolveClinicId(req.user!.id);
    if (!clinicId) return res.status(404).json({ success: false, message: 'Klinika topilmadi' });

    const rows = await prisma.doctorClinic.findMany({
        where: { clinicId },
        orderBy: { joinedAt: 'desc' },
        include: {
            doctor: {
                include: {
                    specialtyRef: { select: { id: true, nameUz: true, icon: true } },
                    _count: { select: { doctorClinics: true } },
                },
            },
            schedules: true,
        },
    });

    return res.json({
        success: true,
        data: {
            items: rows.map((dc) => ({
                doctorClinicId: dc.id,
                consultationPrice: dc.consultationPrice,
                roomNumber: dc.roomNumber,
                isActive: dc.isActive,
                joinedAt: dc.joinedAt,
                doctor: {
                    id: dc.doctor.id,
                    firstName: dc.doctor.firstName,
                    lastName: dc.doctor.lastName,
                    specialty: dc.doctor.specialty,
                    specialtyId: dc.doctor.specialtyId,
                    specialtyName: dc.doctor.specialtyRef?.nameUz ?? dc.doctor.specialty ?? null,
                    photoUrl: dc.doctor.photoUrl,
                    phone: dc.doctor.phone,
                    email: dc.doctor.email,
                    bio: dc.doctor.bio,
                    yearsExperience: dc.doctor.yearsExperience,
                    averageRating: dc.doctor.averageRating ?? 0,
                    reviewCount: dc.doctor.reviewCount ?? 0,
                    isActiveGlobal: dc.doctor.isActive,
                    totalClinics: dc.doctor._count.doctorClinics,
                },
                schedules: dc.schedules.map((s) => ({
                    id: s.id,
                    dayOfWeek: s.dayOfWeek,
                    startTime: s.startTime,
                    endTime: s.endTime,
                    slotDurationMin: s.slotDurationMin,
                    breakStart: s.breakStart,
                    breakEnd: s.breakEnd,
                    isActive: s.isActive,
                })),
            })),
        },
    });
};

// ─── POST /api/clinic/doctors/lookup — find by phone for "attach existing" ──
export const lookupDoctor = async (req: AuthRequest, res: Response) => {
    const clinicId = await resolveClinicId(req.user!.id);
    if (!clinicId) return res.status(404).json({ success: false, message: 'Klinika topilmadi' });

    const phone = String(req.body?.phone || '').trim();
    if (phone.length < 5) return res.status(400).json({ success: false, message: 'phone kerak' });

    const doctor = await prisma.doctor.findFirst({
        where: { phone },
        include: {
            specialtyRef: { select: { id: true, nameUz: true } },
            doctorClinics: {
                where: { isActive: true },
                select: {
                    clinicId: true,
                    clinic: { select: { nameUz: true } },
                },
            },
        },
    });

    if (!doctor) return res.json({ success: true, data: { found: false } });

    const alreadyHere = doctor.doctorClinics.some((dc) => dc.clinicId === clinicId);
    return res.json({
        success: true,
        data: {
            found: true,
            doctor: {
                id: doctor.id,
                firstName: doctor.firstName,
                lastName: doctor.lastName,
                specialty: doctor.specialty,
                specialtyId: doctor.specialtyId,
                specialtyName: doctor.specialtyRef?.nameUz ?? doctor.specialty ?? null,
                photoUrl: doctor.photoUrl,
                phone: doctor.phone,
                clinics: doctor.doctorClinics.map((dc) => ({
                    clinicId: dc.clinicId,
                    clinicName: dc.clinic?.nameUz,
                })),
                alreadyHere,
                clinicCount: doctor.doctorClinics.length,
            },
        },
    });
};

// ─── POST /api/clinic/doctors — create new OR attach existing ───────────────
export const createOrAttach = async (req: AuthRequest, res: Response) => {
    const clinicId = await resolveClinicId(req.user!.id);
    if (!clinicId) return res.status(404).json({ success: false, message: 'Klinika topilmadi' });

    const {
        doctorId,         // if attaching existing doctor
        firstName, lastName, specialtyId, phone, email, photoUrl, bio, yearsExperience,
        consultationPrice = 0,
        roomNumber,
    } = req.body || {};

    let useDoctorId: string | null = null;

    if (doctorId) {
        const exists = await prisma.doctor.findUnique({
            where: { id: doctorId },
            include: { doctorClinics: { where: { isActive: true } } },
        });
        if (!exists) return res.status(404).json({ success: false, message: 'Doktor topilmadi' });
        if (exists.doctorClinics.length >= MAX_CLINICS_PER_DOCTOR) {
            return res.status(400).json({
                success: false,
                message: `Bu doktor allaqachon ${MAX_CLINICS_PER_DOCTOR} klinikada faol. Limit oshib bo'lmaydi.`,
            });
        }
        const alreadyHere = exists.doctorClinics.some((dc) => dc.clinicId === clinicId);
        if (alreadyHere) {
            return res.status(400).json({
                success: false,
                message: 'Bu doktor allaqachon sizning klinikangizda',
            });
        }
        useDoctorId = doctorId;
    } else {
        if (typeof firstName !== 'string' || firstName.trim().length < 2) {
            return res.status(400).json({ success: false, message: 'firstName kerak' });
        }
        if (typeof lastName !== 'string' || lastName.trim().length < 2) {
            return res.status(400).json({ success: false, message: 'lastName kerak' });
        }
        const created = await prisma.doctor.create({
            data: {
                firstName: firstName.trim(),
                lastName: lastName.trim(),
                specialtyId: specialtyId || null,
                phone: phone?.trim() || null,
                email: email?.trim() || null,
                photoUrl: photoUrl?.trim() || null,
                bio: bio?.trim() || null,
                yearsExperience: Number.isFinite(yearsExperience) ? yearsExperience : null,
                clinicId, // legacy primary clinic
                isActive: true,
            },
        });
        useDoctorId = created.id;
    }

    const dc = await prisma.doctorClinic.create({
        data: {
            doctorId: useDoctorId!,
            clinicId,
            consultationPrice: Math.max(0, Number(consultationPrice) || 0),
            roomNumber: roomNumber?.trim() || null,
            isActive: true,
        },
    });

    return res.json({ success: true, data: { doctorClinicId: dc.id, doctorId: useDoctorId } });
};

// ─── PATCH /api/clinic/doctors/:doctorClinicId — price/room/active ──────────
export const updateAttachment = async (req: AuthRequest, res: Response) => {
    const clinicId = await resolveClinicId(req.user!.id);
    if (!clinicId) return res.status(404).json({ success: false, message: 'Klinika topilmadi' });

    const dcId = String(req.params.doctorClinicId || '');
    const dc = await prisma.doctorClinic.findUnique({ where: { id: dcId } });
    if (!dc || dc.clinicId !== clinicId) {
        return res.status(404).json({ success: false, message: 'Topilmadi' });
    }

    const { consultationPrice, roomNumber, isActive } = req.body || {};
    const data: any = {};
    if (Number.isFinite(consultationPrice)) data.consultationPrice = Math.max(0, consultationPrice);
    if (typeof roomNumber === 'string') data.roomNumber = roomNumber.trim() || null;
    if (typeof isActive === 'boolean') data.isActive = isActive;

    const updated = await prisma.doctorClinic.update({ where: { id: dcId }, data });
    return res.json({ success: true, data: updated });
};

// ─── PATCH /api/clinic/doctors/:doctorClinicId/profile — update Doctor data ─
// Allowed only if THIS clinic is the only/primary clinic for the doctor.
// Otherwise editing would affect other clinics' view of the doctor.
export const updateDoctorProfile = async (req: AuthRequest, res: Response) => {
    const clinicId = await resolveClinicId(req.user!.id);
    if (!clinicId) return res.status(404).json({ success: false, message: 'Klinika topilmadi' });

    const dcId = String(req.params.doctorClinicId || '');
    const dc = await prisma.doctorClinic.findUnique({ where: { id: dcId } });
    if (!dc || dc.clinicId !== clinicId) {
        return res.status(404).json({ success: false, message: 'Topilmadi' });
    }

    const {
        firstName, lastName, specialtyId, phone, email, photoUrl, bio, yearsExperience,
    } = req.body || {};
    const data: any = {};
    if (typeof firstName === 'string' && firstName.trim().length >= 2) data.firstName = firstName.trim();
    if (typeof lastName === 'string' && lastName.trim().length >= 2) data.lastName = lastName.trim();
    if (typeof specialtyId === 'string' || specialtyId === null) data.specialtyId = specialtyId || null;
    if (typeof phone === 'string') data.phone = phone.trim() || null;
    if (typeof email === 'string') data.email = email.trim() || null;
    if (typeof photoUrl === 'string') data.photoUrl = photoUrl.trim() || null;
    if (typeof bio === 'string') data.bio = bio.trim() || null;
    if (Number.isFinite(yearsExperience) || yearsExperience === null) data.yearsExperience = yearsExperience;

    const updated = await prisma.doctor.update({ where: { id: dc.doctorId }, data });
    return res.json({ success: true, data: updated });
};

// ─── PUT /api/clinic/doctors/:doctorClinicId/schedule — bulk replace ────────
export const replaceSchedule = async (req: AuthRequest, res: Response) => {
    const clinicId = await resolveClinicId(req.user!.id);
    if (!clinicId) return res.status(404).json({ success: false, message: 'Klinika topilmadi' });

    const dcId = String(req.params.doctorClinicId || '');
    const dc = await prisma.doctorClinic.findUnique({ where: { id: dcId } });
    if (!dc || dc.clinicId !== clinicId) {
        return res.status(404).json({ success: false, message: 'Topilmadi' });
    }

    const items: Array<{
        dayOfWeek: number;
        startTime: string;
        endTime: string;
        slotDurationMin?: number;
        breakStart?: string | null;
        breakEnd?: string | null;
    }> = Array.isArray(req.body?.items) ? req.body.items : [];

    const HHMM = /^\d{2}:\d{2}$/;
    const valid = items.filter((it) =>
        Number.isInteger(it.dayOfWeek) && it.dayOfWeek >= 0 && it.dayOfWeek <= 6 &&
        HHMM.test(it.startTime) && HHMM.test(it.endTime) && it.startTime < it.endTime
    );

    await prisma.$transaction([
        prisma.doctorSchedule.deleteMany({ where: { doctorClinicId: dcId } }),
        ...(valid.length > 0 ? [prisma.doctorSchedule.createMany({
            data: valid.map((it) => ({
                doctorClinicId: dcId,
                dayOfWeek: it.dayOfWeek,
                startTime: it.startTime,
                endTime: it.endTime,
                slotDurationMin: Number.isFinite(it.slotDurationMin) ? it.slotDurationMin! : 30,
                breakStart: it.breakStart && HHMM.test(it.breakStart) ? it.breakStart : null,
                breakEnd: it.breakEnd && HHMM.test(it.breakEnd) ? it.breakEnd : null,
                isActive: true,
            })),
        })] : []),
    ]);

    const updated = await prisma.doctorSchedule.findMany({
        where: { doctorClinicId: dcId },
        orderBy: { dayOfWeek: 'asc' },
    });
    return res.json({ success: true, data: { items: updated } });
};

// ─── DELETE /api/clinic/doctors/:doctorClinicId — detach (soft if upcoming) ─
export const detachDoctor = async (req: AuthRequest, res: Response) => {
    const clinicId = await resolveClinicId(req.user!.id);
    if (!clinicId) return res.status(404).json({ success: false, message: 'Klinika topilmadi' });

    const dcId = String(req.params.doctorClinicId || '');
    const dc = await prisma.doctorClinic.findUnique({ where: { id: dcId } });
    if (!dc || dc.clinicId !== clinicId) {
        return res.status(404).json({ success: false, message: 'Topilmadi' });
    }

    // If there are upcoming appointments — soft-disable instead of hard delete.
    const upcoming = await prisma.appointment.count({
        where: {
            clinicId,
            doctorId: dc.doctorId,
            scheduledAt: { gte: new Date() },
            status: { in: ['PENDING', 'CONFIRMED'] },
        },
    });
    if (upcoming > 0) {
        await prisma.doctorClinic.update({ where: { id: dcId }, data: { isActive: false } });
        return res.json({ success: true, data: { soft: true, upcoming } });
    }

    await prisma.doctorClinic.delete({ where: { id: dcId } });
    return res.json({ success: true, data: { soft: false } });
};
