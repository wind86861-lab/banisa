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

    const [totalAppointments, pendingCount, confirmedCount, completedCount, cancelledCount, totalDoctors] =
        await Promise.all([
            prisma.appointment.count({ where: { clinicId } }),
            prisma.appointment.count({ where: { clinicId, status: 'PENDING' } }),
            prisma.appointment.count({ where: { clinicId, status: 'CONFIRMED' } }),
            prisma.appointment.count({ where: { clinicId, status: 'COMPLETED' } }),
            prisma.appointment.count({ where: { clinicId, status: 'CANCELLED' } }),
            prisma.doctor.count({ where: { clinicId, isActive: true } }),
        ]);

    const activeServices = await prisma.clinicDiagnosticService.count({ where: { clinicId, isActive: true } });

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
            id: true, nameUz: true, nameRu: true, nameEn: true,
            type: true, description: true, logo: true,
            region: true, district: true, street: true, landmark: true,
            latitude: true, longitude: true,
            phones: true, emails: true, website: true, workingHours: true,
            taxId: true, licenseNumber: true,
            adminFirstName: true, adminLastName: true, adminEmail: true, adminPhone: true,
            status: true, isActive: true, averageRating: true, reviewCount: true,
            createdAt: true,
        },
    });

    return res.json({ success: true, data: clinic });
};

export const updateClinicProfile = async (req: AuthRequest, res: Response) => {
    const clinicId = await getClinicId(req.user!.id);
    if (!clinicId) return res.status(404).json({ success: false, message: 'Klinika topilmadi' });

    const {
        nameUz, nameRu, nameEn, description, logo,
        region, district, street, landmark, latitude, longitude,
        phones, emails, website,
        taxId, licenseNumber,
        adminFirstName, adminLastName, adminEmail, adminPhone,
    } = req.body;

    const updated = await prisma.clinic.update({
        where: { id: clinicId },
        data: {
            ...(nameUz !== undefined && { nameUz }),
            ...(nameRu !== undefined && { nameRu }),
            ...(nameEn !== undefined && { nameEn }),
            ...(description !== undefined && { description }),
            ...(logo !== undefined && { logo }),
            ...(region !== undefined && { region }),
            ...(district !== undefined && { district }),
            ...(street !== undefined && { street }),
            ...(landmark !== undefined && { landmark }),
            ...(latitude !== undefined && { latitude }),
            ...(longitude !== undefined && { longitude }),
            ...(phones !== undefined && { phones }),
            ...(emails !== undefined && { emails }),
            ...(website !== undefined && { website }),
            ...(taxId !== undefined && { taxId }),
            ...(licenseNumber !== undefined && { licenseNumber }),
            ...(adminFirstName !== undefined && { adminFirstName }),
            ...(adminLastName !== undefined && { adminLastName }),
            ...(adminEmail !== undefined && { adminEmail }),
            ...(adminPhone !== undefined && { adminPhone }),
        },
    });

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
