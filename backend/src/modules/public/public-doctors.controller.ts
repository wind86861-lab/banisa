import { Request, Response } from 'express';
import prisma from '../../config/database';

// ─── GET /api/public/doctors — paginated + filterable ────────────────────────
export const listDoctors = async (req: Request, res: Response) => {
    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1);
    const pageSize = Math.min(50, Math.max(1, parseInt(String(req.query.pageSize || '20'), 10) || 20));
    const search = String(req.query.search || '').trim();
    const specialtyId = req.query.specialtyId ? String(req.query.specialtyId) : null;
    const region = req.query.region ? String(req.query.region) : null;
    const minRating = parseFloat(String(req.query.minRating || '0')) || 0;
    const sort = String(req.query.sort || 'rating'); // rating | experience | price

    // Filter on the Doctor level
    const where: any = { isActive: true };
    if (specialtyId) where.specialtyId = specialtyId;
    if (minRating > 0) where.averageRating = { gte: minRating };
    if (search) {
        where.OR = [
            { firstName: { contains: search, mode: 'insensitive' } },
            { lastName: { contains: search, mode: 'insensitive' } },
            { specialty: { contains: search, mode: 'insensitive' } },
        ];
    }
    // Doctor must have at least one active clinic (optionally in given region)
    where.doctorClinics = {
        some: {
            isActive: true,
            ...(region ? { clinic: { region } } : {}),
        },
    };

    const orderBy: any[] = [];
    if (sort === 'experience') orderBy.push({ yearsExperience: 'desc' });
    else if (sort === 'price') orderBy.push({ averageRating: 'desc' }); // price sort done in memory
    else orderBy.push({ averageRating: 'desc' });
    orderBy.push({ reviewCount: 'desc' });

    const [rows, total] = await Promise.all([
        prisma.doctor.findMany({
            where,
            orderBy,
            skip: (page - 1) * pageSize,
            take: pageSize,
            include: {
                specialtyRef: { select: { id: true, nameUz: true, icon: true } },
                doctorClinics: {
                    where: { isActive: true },
                    include: {
                        clinic: { select: { id: true, nameUz: true, region: true, district: true } },
                    },
                },
            },
        }),
        prisma.doctor.count({ where }),
    ]);

    const items = rows.map((d) => {
        const prices = d.doctorClinics
            .map((dc) => dc.consultationPrice)
            .filter((p) => p > 0)
            .sort((a, b) => a - b);
        return {
            id: d.id,
            firstName: d.firstName,
            lastName: d.lastName,
            // Patronymic + qualification + academic title travel on the
            // list payload too so doctor cards can render the full
            // greeting form ("Karimov Bahodir A.") and a credential
            // pill ("Oliy toifa", "Professor") without a second roundtrip.
            middleName: (d as any).middleName ?? null,
            category: (d as any).category ?? null,
            academicTitle: (d as any).academicTitle ?? null,
            specialtyName: d.specialtyRef?.nameUz ?? d.specialty ?? null,
            specialtyIcon: d.specialtyRef?.icon ?? null,
            photoUrl: d.photoUrl,
            yearsExperience: d.yearsExperience,
            averageRating: d.averageRating ?? 0,
            reviewCount: d.reviewCount ?? 0,
            priceFrom: prices[0] ?? null,
            priceTo: prices[prices.length - 1] ?? null,
            clinics: d.doctorClinics.map((dc) => ({
                id: dc.clinic.id,
                name: dc.clinic.nameUz,
                region: dc.clinic.region,
                district: dc.clinic.district,
                price: dc.consultationPrice,
            })),
            clinicCount: d.doctorClinics.length,
        };
    });

    return res.json({
        success: true,
        data: {
            items,
            page,
            pageSize,
            total,
            totalPages: Math.max(1, Math.ceil(total / pageSize)),
        },
    });
};

// ─── GET /api/public/doctors/:id — profile + reviews + clinics + schedule ────
export const getDoctorDetail = async (req: Request, res: Response) => {
    const id = String(req.params.id || '');
    if (!id) return res.status(400).json({ success: false, message: 'id kerak' });

    const doctor = await prisma.doctor.findUnique({
        where: { id },
        include: {
            specialtyRef: { select: { id: true, nameUz: true, icon: true } },
            doctorClinics: {
                where: { isActive: true },
                include: {
                    clinic: {
                        select: {
                            id: true, nameUz: true, region: true, district: true,
                            street: true, phones: true, latitude: true, longitude: true,
                        },
                    },
                    schedules: { where: { isActive: true }, orderBy: { dayOfWeek: 'asc' } },
                },
            },
            reviews: {
                where: { isActive: true },
                orderBy: { createdAt: 'desc' },
                take: 20,
                include: {
                    patient: { select: { firstName: true, lastName: true } },
                    appointment: { select: { scheduledAt: true } },
                },
            },
        },
    });

    if (!doctor || !doctor.isActive) {
        return res.status(404).json({ success: false, message: 'Doktor topilmadi' });
    }

    return res.json({
        success: true,
        data: {
            id: doctor.id,
            firstName: doctor.firstName,
            lastName: doctor.lastName,
            // Patronymic + qualification + academic block. These replace
            // the old phone/email surface — patient sees the doctor's
            // professional credentials, not their personal contact info.
            middleName: (doctor as any).middleName ?? null,
            category: (doctor as any).category ?? null,
            academicDegree: (doctor as any).academicDegree ?? null,
            academicTitle: (doctor as any).academicTitle ?? null,
            // Education — TEXT ONLY. The uploaded diploma/certificate documents
            // (bachelorDiplomaUrl, masterDiplomaUrl, categoryDocUrl,
            // academicDegreeDocUrl, academicTitleDocUrl) are for clinic-side
            // verification and are deliberately NOT exposed to patients.
            bachelorSpecialty: (doctor as any).bachelorSpecialty ?? null,
            masterSpecialty: (doctor as any).masterSpecialty ?? null,
            treatedDiseases: Array.isArray((doctor as any).treatedDiseases)
                ? (doctor as any).treatedDiseases as string[]
                : [],
            surgicalProcedures: Array.isArray((doctor as any).surgicalProcedures)
                ? (doctor as any).surgicalProcedures as string[]
                : [],
            specialty: doctor.specialty,
            specialtyName: doctor.specialtyRef?.nameUz ?? doctor.specialty ?? null,
            specialtyIcon: doctor.specialtyRef?.icon ?? null,
            photoUrl: doctor.photoUrl,
            photoUrls: Array.isArray(doctor.photoUrls) ? (doctor.photoUrls as string[]) : [],
            bio: doctor.bio,
            yearsExperience: doctor.yearsExperience,
            averageRating: doctor.averageRating ?? 0,
            reviewCount: doctor.reviewCount ?? 0,
            clinics: doctor.doctorClinics.map((dc) => ({
                doctorClinicId: dc.id,
                clinicId: dc.clinic.id,
                clinicName: dc.clinic.nameUz,
                region: dc.clinic.region,
                district: dc.clinic.district,
                street: dc.clinic.street,
                phones: dc.clinic.phones,
                latitude: dc.clinic.latitude,
                longitude: dc.clinic.longitude,
                consultationPrice: dc.consultationPrice,
                roomNumber: dc.roomNumber,
                schedules: dc.schedules.map((s) => ({
                    dayOfWeek: s.dayOfWeek,
                    startTime: s.startTime,
                    endTime: s.endTime,
                    slotDurationMin: s.slotDurationMin,
                    breakStart: s.breakStart,
                    breakEnd: s.breakEnd,
                })),
            })),
            reviews: doctor.reviews.map((r) => ({
                id: r.id,
                rating: r.rating,
                comment: r.comment,
                patientName: `${r.patient?.firstName ?? ''} ${(r.patient?.lastName ?? '')[0] || ''}.`.trim(),
                visitDate: r.appointment?.scheduledAt ?? null,
                createdAt: r.createdAt,
            })),
        },
    });
};
