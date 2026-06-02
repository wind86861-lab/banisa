import { Request, Response } from 'express';
import prisma from '../../config/database';
import { AuthRequest } from '../../middleware/auth.middleware';

// ─── Helper: get clinicId from authenticated user ─────────────────────────────
async function getClinicId(userId: string): Promise<string | null> {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { clinicId: true } });
    return user?.clinicId ?? null;
}

// ─── Stats ────────────────────────────────────────────────────────────────────
export const getClinicStats = async (req: AuthRequest, res: Response) => {
    const clinicId = await getClinicId(req.user!.id);
    if (!clinicId) return res.status(404).json({ success: false, message: 'Klinika topilmadi' });

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    // ── Core counts ──
    const [totalAppointments, pendingCount, confirmedCount, completedCount, cancelledCount, totalDoctors] =
        await Promise.all([
            prisma.appointment.count({ where: { clinicId } }),
            prisma.appointment.count({ where: { clinicId, status: 'PENDING' } }),
            prisma.appointment.count({ where: { clinicId, status: 'CONFIRMED' } }),
            prisma.appointment.count({ where: { clinicId, status: 'COMPLETED' } }),
            prisma.appointment.count({ where: { clinicId, status: 'CANCELLED' } }),
            prisma.doctor.count({ where: { clinicId, isActive: true } }),
        ]);

    // ── Active services by type ──
    const [activeDiagnostics, activeSurgical, activeSanatorium, activeCheckups] = await Promise.all([
        prisma.clinicDiagnosticService.count({ where: { clinicId, isActive: true } }),
        prisma.clinicSurgicalService.count({ where: { clinicId, isActive: true } }),
        prisma.clinicSanatoriumService.count({ where: { clinicId, isActive: true } }),
        prisma.clinicCheckupPackage.count({ where: { clinicId, isActive: true } }),
    ]);
    const activeServices = activeDiagnostics + activeSurgical + activeSanatorium + activeCheckups;

    // ── Today's appointments ──
    const todayAppointments = await prisma.appointment.count({
        where: { clinicId, scheduledAt: { gte: today, lt: tomorrow } },
    });

    // ── This month vs last month ──
    const [thisMonthCount, lastMonthCount] = await Promise.all([
        prisma.appointment.count({ where: { clinicId, createdAt: { gte: thisMonthStart } } }),
        prisma.appointment.count({ where: { clinicId, createdAt: { gte: lastMonthStart, lte: lastMonthEnd } } }),
    ]);
    const monthGrowth = lastMonthCount > 0 ? Math.round(((thisMonthCount - lastMonthCount) / lastMonthCount) * 100) : 0;

    // ── Revenue (this month & total) ──
    const revenueThisMonth = await prisma.appointment.aggregate({
        where: { clinicId, status: 'COMPLETED', createdAt: { gte: thisMonthStart } },
        _sum: { price: true },
    });
    const revenueTotal = await prisma.appointment.aggregate({
        where: { clinicId, status: 'COMPLETED' },
        _sum: { price: true },
    });

    // ── Weekly trend (last 7 days) ──
    const weeklyTrend: { day: string; appointments: number; completed: number; revenue: number }[] = [];
    const dayNames = ['Yak', 'Dush', 'Sesh', 'Chor', 'Pay', 'Jum', 'Shan'];
    for (let i = 6; i >= 0; i--) {
        const dayStart = new Date(today); dayStart.setDate(dayStart.getDate() - i);
        const dayEnd = new Date(dayStart); dayEnd.setDate(dayEnd.getDate() + 1);

        const [dayAppts, dayCompleted, dayRevAgg] = await Promise.all([
            prisma.appointment.count({ where: { clinicId, scheduledAt: { gte: dayStart, lt: dayEnd } } }),
            prisma.appointment.count({ where: { clinicId, scheduledAt: { gte: dayStart, lt: dayEnd }, status: 'COMPLETED' } }),
            prisma.appointment.aggregate({ where: { clinicId, scheduledAt: { gte: dayStart, lt: dayEnd }, status: 'COMPLETED' }, _sum: { price: true } }),
        ]);
        weeklyTrend.push({
            day: dayNames[dayStart.getDay()],
            appointments: dayAppts,
            completed: dayCompleted,
            revenue: dayRevAgg._sum.price || 0,
        });
    }

    // ── Service type breakdown ──
    const serviceTypeBreakdown = await prisma.appointment.groupBy({
        by: ['serviceType'],
        where: { clinicId },
        _count: true,
    });

    // ── Recent appointments (last 5) ──
    const recentAppointments = await prisma.appointment.findMany({
        where: { clinicId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
            patient: { select: { id: true, firstName: true, lastName: true, phone: true } },
            doctor: { select: { id: true, firstName: true, lastName: true, specialty: true } },
        },
    });

    // ── Top doctors by appointment count ──
    const topDoctors = await prisma.appointment.groupBy({
        by: ['doctorId'],
        where: { clinicId, doctorId: { not: null } },
        _count: true,
        orderBy: { _count: { doctorId: 'desc' } },
        take: 5,
    });
    const doctorIds = topDoctors.map(d => d.doctorId).filter(Boolean) as string[];
    const doctorMap = doctorIds.length > 0
        ? await prisma.doctor.findMany({ where: { id: { in: doctorIds } }, select: { id: true, firstName: true, lastName: true, specialty: true } })
        : [];
    const topDoctorsData = topDoctors.map(d => {
        const doc = doctorMap.find(dm => dm.id === d.doctorId);
        return { ...doc, appointmentCount: d._count };
    });

    // ── Appointment status for donut chart ──
    const statusBreakdown = [
        { name: 'Kutilmoqda', value: pendingCount, color: '#f59e0b' },
        { name: 'Tasdiqlangan', value: confirmedCount, color: '#06b6d4' },
        { name: 'Bajarilgan', value: completedCount, color: '#10b981' },
        { name: 'Bekor', value: cancelledCount, color: '#ef4444' },
    ];

    // ── Reviews summary ──
    const reviewStats = await prisma.review.aggregate({
        where: { clinicId, isActive: true },
        _avg: { rating: true },
        _count: true,
    });

    return res.json({
        success: true,
        data: {
            totalAppointments,
            pendingCount,
            confirmedCount,
            completedCount,
            cancelledCount,
            totalDoctors,
            activeServices,
            todayAppointments,
            thisMonthCount,
            lastMonthCount,
            monthGrowth,
            revenueThisMonth: revenueThisMonth._sum.price || 0,
            revenueTotal: revenueTotal._sum.price || 0,
            weeklyTrend,
            serviceTypeBreakdown: serviceTypeBreakdown.map(s => ({
                type: s.serviceType,
                count: s._count,
            })),
            statusBreakdown,
            recentAppointments,
            topDoctors: topDoctorsData,
            serviceBreakdown: {
                diagnostics: activeDiagnostics,
                surgical: activeSurgical,
                sanatorium: activeSanatorium,
                checkup: activeCheckups,
            },
            reviewStats: {
                averageRating: reviewStats._avg.rating ? Math.round(reviewStats._avg.rating * 10) / 10 : 0,
                totalReviews: reviewStats._count,
            },
        },
    });
};

// ─── Bookings / Appointments ──────────────────────────────────────────────────
export const getClinicBookings = async (req: AuthRequest, res: Response) => {
    const clinicId = await getClinicId(req.user!.id);
    if (!clinicId) return res.status(404).json({ success: false, message: 'Klinika topilmadi' });

    const status = String(req.query.status ?? '');
    const search = String(req.query.search ?? '');
    const page = String(req.query.page ?? '1');
    const limit = String(req.query.limit ?? '20');
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where: any = { clinicId };
    if (status && status !== 'ALL') where.status = status;
    if (search) {
        where.OR = [
            { patient: { firstName: { contains: search, mode: 'insensitive' } } },
            { patient: { lastName: { contains: search, mode: 'insensitive' } } },
            { patient: { phone: { contains: search } } },
        ];
    }

    const [appointments, total] = await Promise.all([
        prisma.appointment.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip,
            take: parseInt(limit),
            include: {
                patient: { select: { id: true, firstName: true, lastName: true, phone: true, email: true } },
                doctor: { select: { id: true, firstName: true, lastName: true, specialty: true } },
            },
        }),
        prisma.appointment.count({ where }),
    ]);

    return res.json({
        success: true,
        data: appointments,
        meta: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / parseInt(limit)) },
    });
};

export const updateBookingStatus = async (req: AuthRequest, res: Response) => {
    const clinicId = await getClinicId(req.user!.id);
    if (!clinicId) return res.status(404).json({ success: false, message: 'Klinika topilmadi' });

    const id = String(req.params.id);
    const { status, cancellationReason } = req.body;

    const appointment = await prisma.appointment.findFirst({ where: { id, clinicId } });
    if (!appointment) return res.status(404).json({ success: false, message: 'Bron topilmadi' });

    const allowed = ['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'NO_SHOW'];
    if (!allowed.includes(status)) return res.status(400).json({ success: false, message: 'Noto\'g\'ri status' });

    const updated = await prisma.appointment.update({
        where: { id },
        data: { status, ...(cancellationReason && { cancellationReason }) },
        include: { patient: { select: { id: true, firstName: true, lastName: true, phone: true } } },
    });

    return res.json({ success: true, data: updated });
};

// ─── Profile ──────────────────────────────────────────────────────────────────
export const getClinicProfile = async (req: AuthRequest, res: Response) => {
    const clinicId = await getClinicId(req.user!.id);
    if (!clinicId) return res.status(404).json({ success: false, message: 'Klinika topilmadi' });

    const clinic = await prisma.clinic.findUnique({
        where: { id: clinicId },
        select: {
            id: true,
            // Basic
            nameUz: true, nameRu: true, nameEn: true,
            type: true, foundedYear: true,
            description: true, descriptionRu: true,
            logo: true, coverImage: true,
            // Address
            region: true, district: true, street: true, apartment: true,
            addressUz: true, addressRu: true, zipCode: true,
            googleMapsUrl: true, landmark: true,
            latitude: true, longitude: true,
            // Contact
            phones: true, emails: true, website: true, socialMedia: true,
            // Schedule
            workingHours: true, isAlwaysOpen: true,
            lunchBreakStart: true, lunchBreakEnd: true, holidayNotes: true,
            // Facility
            hasEmergency: true, hasAmbulance: true, parkingAvailable: true,
            hasOnlineBooking: true, bedsCount: true, floorsCount: true,
            amenities: true, insuranceAccepted: true, priceRange: true,
            // Legal / license
            registrationNumber: true, taxId: true,
            licenseNumber: true, licenseUrl: true,
            licenseIssuedAt: true, licenseExpiresAt: true, licenseIssuedBy: true,
            legalName: true, legalAddress: true, legalForm: true,
            certificates: true,
            // Bank / payments
            paymentMethods: true,
            bankName: true, bankAccountNumber: true, mfo: true, oked: true,
            vatNumber: true, invoiceEmail: true,
            // Admin person
            adminFirstName: true, adminLastName: true,
            adminEmail: true, adminPhone: true, adminPosition: true,
            // Meta
            status: true, isActive: true, averageRating: true, reviewCount: true,
            createdAt: true,
        },
    });

    return res.json({ success: true, data: clinic });
};

// Fields the clinic admin is allowed to self-edit. Status, ratings, commission,
// approval state, etc. are deliberately excluded — those are admin-only.
const EDITABLE_FIELDS = [
    'nameUz', 'nameRu', 'nameEn', 'foundedYear',
    'description', 'descriptionRu', 'logo', 'coverImage',
    'region', 'district', 'street', 'apartment',
    'addressUz', 'addressRu', 'zipCode', 'googleMapsUrl', 'landmark',
    'latitude', 'longitude',
    'phones', 'emails', 'website', 'socialMedia',
    'isAlwaysOpen', 'lunchBreakStart', 'lunchBreakEnd', 'holidayNotes',
    'hasEmergency', 'hasAmbulance', 'parkingAvailable', 'hasOnlineBooking',
    'bedsCount', 'floorsCount', 'amenities', 'insuranceAccepted', 'priceRange',
    'registrationNumber', 'taxId',
    'licenseNumber', 'licenseUrl', 'licenseIssuedBy',
    'legalName', 'legalAddress', 'legalForm', 'certificates',
    'paymentMethods',
    'bankName', 'bankAccountNumber', 'mfo', 'oked', 'vatNumber', 'invoiceEmail',
    'adminFirstName', 'adminLastName', 'adminEmail', 'adminPhone', 'adminPosition',
] as const;

export const updateClinicProfile = async (req: AuthRequest, res: Response) => {
    const clinicId = await getClinicId(req.user!.id);
    if (!clinicId) return res.status(404).json({ success: false, message: 'Klinika topilmadi' });

    const data: Record<string, unknown> = {};
    for (const key of EDITABLE_FIELDS) {
        if (req.body[key] !== undefined) data[key] = req.body[key];
    }

    // Coerce date-only strings to DateTime for the two timestamp columns.
    for (const dateKey of ['licenseIssuedAt', 'licenseExpiresAt'] as const) {
        const v = req.body[dateKey];
        if (v !== undefined) {
            data[dateKey] = v === null || v === '' ? null : new Date(v);
        }
    }

    // foundedYear comes in as string from <input type="number"> on some browsers.
    if (data.foundedYear !== undefined && data.foundedYear !== null) {
        const n = Number(data.foundedYear);
        data.foundedYear = Number.isFinite(n) ? Math.trunc(n) : null;
    }
    if (data.bedsCount !== undefined && data.bedsCount !== null && data.bedsCount !== '') {
        const n = Number(data.bedsCount);
        data.bedsCount = Number.isFinite(n) ? Math.trunc(n) : null;
    } else if (data.bedsCount === '') {
        data.bedsCount = null;
    }
    if (data.floorsCount !== undefined && data.floorsCount !== null && data.floorsCount !== '') {
        const n = Number(data.floorsCount);
        data.floorsCount = Number.isFinite(n) ? Math.trunc(n) : null;
    } else if (data.floorsCount === '') {
        data.floorsCount = null;
    }
    if (data.latitude !== undefined && data.latitude !== null && data.latitude !== '') {
        const n = Number(data.latitude);
        data.latitude = Number.isFinite(n) && n >= -90 && n <= 90 ? n : null;
    } else if (data.latitude === '') {
        data.latitude = null;
    }
    if (data.longitude !== undefined && data.longitude !== null && data.longitude !== '') {
        const n = Number(data.longitude);
        data.longitude = Number.isFinite(n) && n >= -180 && n <= 180 ? n : null;
    } else if (data.longitude === '') {
        data.longitude = null;
    }

    const updated = await prisma.clinic.update({ where: { id: clinicId }, data });
    return res.json({ success: true, data: updated });
};

// ─── Staff / Doctors ──────────────────────────────────────────────────────────
export const getClinicStaff = async (req: AuthRequest, res: Response) => {
    const clinicId = await getClinicId(req.user!.id);
    if (!clinicId) return res.status(404).json({ success: false, message: 'Klinika topilmadi' });

    const search = String(req.query.search ?? '');
    const page = String(req.query.page ?? '1');
    const limit = String(req.query.limit ?? '20');
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where: any = { clinicId };
    if (search) {
        where.OR = [
            { firstName: { contains: search, mode: 'insensitive' } },
            { lastName: { contains: search, mode: 'insensitive' } },
            { specialty: { contains: search, mode: 'insensitive' } },
        ];
    }

    const [doctors, total] = await Promise.all([
        prisma.doctor.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: parseInt(limit) }),
        prisma.doctor.count({ where }),
    ]);

    return res.json({
        success: true,
        data: doctors,
        meta: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / parseInt(limit)) },
    });
};

export const createClinicStaff = async (req: AuthRequest, res: Response) => {
    const clinicId = await getClinicId(req.user!.id);
    if (!clinicId) return res.status(404).json({ success: false, message: 'Klinika topilmadi' });

    const { firstName, lastName, specialty, phone } = req.body;
    if (!firstName || !lastName) return res.status(400).json({ success: false, message: 'Ism va familiya kiritilishi shart' });

    const doctor = await prisma.doctor.create({
        data: { clinicId, firstName, lastName, specialty: specialty ?? null, phone: phone ?? null },
    });

    return res.status(201).json({ success: true, data: doctor });
};

export const updateClinicStaff = async (req: AuthRequest, res: Response) => {
    const clinicId = await getClinicId(req.user!.id);
    if (!clinicId) return res.status(404).json({ success: false, message: 'Klinika topilmadi' });

    const id = String(req.params.id);
    const doctor = await prisma.doctor.findFirst({ where: { id, clinicId } });
    if (!doctor) return res.status(404).json({ success: false, message: 'Shifokor topilmadi' });

    const { firstName, lastName, specialty, phone, isActive } = req.body;

    const updated = await prisma.doctor.update({
        where: { id },
        data: {
            ...(firstName !== undefined && { firstName }),
            ...(lastName !== undefined && { lastName }),
            ...(specialty !== undefined && { specialty }),
            ...(phone !== undefined && { phone }),
            ...(isActive !== undefined && { isActive }),
        },
    });

    return res.json({ success: true, data: updated });
};

export const deleteClinicStaff = async (req: AuthRequest, res: Response) => {
    const clinicId = await getClinicId(req.user!.id);
    if (!clinicId) return res.status(404).json({ success: false, message: 'Klinika topilmadi' });

    const id = String(req.params.id);
    const doctor = await prisma.doctor.findFirst({ where: { id, clinicId } });
    if (!doctor) return res.status(404).json({ success: false, message: 'Shifokor topilmadi' });

    await prisma.doctor.delete({ where: { id } });
    return res.json({ success: true, message: 'Shifokor o\'chirildi' });
};

// ─── Discounts (simple JSON-stored, no dedicated table yet) ───────────────────
// We store discounts as a JSON field in Clinic.metadata or use a simple approach
// For now return empty array — can be extended when Discount model is added
export const getClinicDiscounts = async (req: AuthRequest, res: Response) => {
    return res.json({ success: true, data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } });
};

export const createClinicDiscount = async (_req: Request, res: Response) => {
    return res.status(501).json({ success: false, message: 'Chegirmalar moduli tez kunda' });
};

export const updateClinicDiscount = async (_req: Request, res: Response) => {
    return res.status(501).json({ success: false, message: 'Chegirmalar moduli tez kunda' });
};

export const deleteClinicDiscount = async (_req: Request, res: Response) => {
    return res.status(501).json({ success: false, message: 'Chegirmalar moduli tez kunda' });
};

// ─── Resolve a Google/Yandex map link into lat/lng ───────────────────────────
// Short links (maps.app.goo.gl, goo.gl/maps, yandex.com/maps/-/...) redirect to
// long URLs whose query string carries the coordinates. The browser can't
// follow these redirects across origins, so we proxy it here.
const COORD_PATTERNS: RegExp[] = [
    /@(-?\d{1,3}\.\d+),\s*(-?\d{1,3}\.\d+)/,
    /[?&](?:q|ll|center|pt|sll|destination)=(-?\d{1,3}\.\d+),(-?\d{1,3}\.\d+)/,
    /!3d(-?\d{1,3}\.\d+)!4d(-?\d{1,3}\.\d+)/,
    /[?&]daddr=(-?\d{1,3}\.\d+),(-?\d{1,3}\.\d+)/,
];

function extractCoords(text: string): { lat: number; lng: number } | null {
    if (!text) return null;
    for (const re of COORD_PATTERNS) {
        const m = text.match(re);
        if (m) {
            const lat = parseFloat(m[1]);
            const lng = parseFloat(m[2]);
            if (Number.isFinite(lat) && Number.isFinite(lng) &&
                lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
                return { lat, lng };
            }
        }
    }
    return null;
}

async function followRedirects(url: string, maxHops = 6): Promise<string> {
    let current = url;
    for (let i = 0; i < maxHops; i++) {
        const res = await fetch(current, {
            method: 'GET',
            redirect: 'manual',
            headers: { 'User-Agent': 'Mozilla/5.0 (banisa-bot)' },
        });
        if (res.status >= 300 && res.status < 400) {
            const next = res.headers.get('location');
            if (!next) break;
            current = new URL(next, current).toString();
            continue;
        }
        // Some short-link services return 200 with the canonical URL in the body
        // (HTML meta refresh or JS redirect). Try to read coords from body too.
        const body = await res.text();
        const inBody = extractCoords(body) ? body : null;
        return inBody || current;
    }
    return current;
}

export const resolveMapLink = async (req: AuthRequest, res: Response) => {
    try {
        const { url } = req.body as { url?: string };
        if (!url || typeof url !== 'string') {
            return res.status(400).json({ success: false, message: 'URL kerak' });
        }
        // Cheap path: maybe coords are already in the input
        const direct = extractCoords(url);
        if (direct) return res.json({ success: true, data: direct });

        // Reject anything that isn't a recognized maps host to avoid SSRF.
        const allowed = /^(https?:\/\/)([a-z0-9-]+\.)?(goo\.gl|google\.[a-z.]+|maps\.app\.goo\.gl|yandex\.[a-z.]+)\//i;
        if (!allowed.test(url)) {
            return res.status(400).json({ success: false, message: 'Faqat Google/Yandex Maps havolasi qo\'llab-quvvatlanadi' });
        }

        const resolved = await followRedirects(url);
        const coords = extractCoords(resolved);
        if (!coords) {
            return res.status(404).json({ success: false, message: 'Linkdan koordinata olib bo\'lmadi' });
        }
        return res.json({ success: true, data: coords });
    } catch (err: any) {
        return res.status(500).json({ success: false, message: err?.message || 'Linkni ochib bo\'lmadi' });
    }
};
