import prisma from '../../config/database';
import { AppError, ErrorCodes } from '../../utils/errors';
import bcrypt from 'bcrypt';

export const getProfile = async (userId: string) => {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
        },
    });

    if (!user) {
        throw new AppError('Admin not found', 404, ErrorCodes.NOT_FOUND);
    }
    // Mocking phone as it's not in the db schema yet, but UI expects it
    return { ...user, phone: '+998901234567' };
};

export const updateProfile = async (userId: string, data: { firstName: string; lastName: string; email: string; phone?: string }) => {
    const user = await prisma.user.update({
        where: { id: userId },
        data: {
            firstName: data.firstName,
            lastName: data.lastName,
            email: data.email,
        },
        select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
        },
    });

    return { ...user, phone: data.phone || '+998901234567' };
};

export const updatePassword = async (userId: string, currentPassword: string, newPassword: string) => {
    const user = await prisma.user.findUnique({
        where: { id: userId },
    });

    if (!user) {
        throw new AppError('Admin not found', 404, ErrorCodes.NOT_FOUND);
    }

    const isPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isPasswordValid) {
        throw new AppError('Hozirgi parol noto\'g\'ri', 400, ErrorCodes.VALIDATION_ERROR);
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
        where: { id: userId },
        data: { passwordHash: hashedPassword },
    });

    return { success: true };
};

// Mocking notifications since there is no Notification model
const mockNotifications = [
    { id: 1, title: 'Yangi Bemor Ro\'yxati', message: 'Klinikaga yangi bemor ro\'yxatdan o\'tdi.', type: 'info', createdAt: new Date().toISOString(), isRead: false },
    { id: 2, title: 'Tizim xabarnomasi', message: 'Haftalik hisobot tayyor.', type: 'success', createdAt: new Date(Date.now() - 3600000).toISOString(), isRead: false },
];

export const getNotifications = async (userId: string) => {
    return mockNotifications;
};

export const markNotificationAsRead = async (userId: string, notificationId: string) => {
    return { success: true };
};

export const markAllNotificationsAsRead = async (userId: string) => {
    return { success: true };
};

export const getDashboardStats = async () => {
    // Get total counts
    const [
        totalClinics,
        totalUsers,
        totalDiagnosticServices,
        totalSurgicalServices,
        totalSanatoriumServices,
        totalAppointments,
        recentAppointments,
    ] = await Promise.all([
        prisma.clinic.count(),
        prisma.user.count({ where: { role: { not: 'SUPER_ADMIN' } } }),
        prisma.diagnosticService.count({ where: { isActive: true } }),
        prisma.surgicalService.count({ where: { isActive: true } }),
        prisma.sanatoriumService.count({ where: { isActive: true } }),
        prisma.appointment.count(),
        prisma.appointment.findMany({
            take: 10,
            orderBy: { createdAt: 'desc' },
            include: {
                patient: { select: { firstName: true, lastName: true, phone: true } },
                clinic: { select: { nameUz: true } },
            },
        }),
    ]);

    // Get monthly appointment data for chart (last 7 months)
    const sevenMonthsAgo = new Date();
    sevenMonthsAgo.setMonth(sevenMonthsAgo.getMonth() - 6);

    const appointmentsByMonth = await prisma.appointment.groupBy({
        by: ['createdAt'],
        where: {
            createdAt: { gte: sevenMonthsAgo },
        },
        _count: true,
    });

    // Process monthly data
    const monthlyData = [];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthIndex = date.getMonth();
        const year = date.getFullYear();

        const count = appointmentsByMonth.filter(a => {
            const aDate = new Date(a.createdAt);
            return aDate.getMonth() === monthIndex && aDate.getFullYear() === year;
        }).length;

        monthlyData.push({
            name: monthNames[monthIndex],
            appointments: count,
            patients: Math.floor(count * 0.7), // Approximate unique patients
        });
    }

    return {
        totals: {
            clinics: totalClinics,
            users: totalUsers,
            services: totalDiagnosticServices + totalSurgicalServices + totalSanatoriumServices,
            appointments: totalAppointments,
        },
        services: {
            diagnostic: totalDiagnosticServices,
            surgical: totalSurgicalServices,
            sanatorium: totalSanatoriumServices,
        },
        monthlyActivity: monthlyData,
        recentAppointments: recentAppointments.map(apt => ({
            id: apt.id,
            patientName: `${apt.patient?.firstName || ''} ${apt.patient?.lastName || ''}`.trim() || 'N/A',
            clinicName: apt.clinic?.nameUz || 'N/A',
            date: apt.scheduledAt,
            status: apt.status,
            createdAt: apt.createdAt,
        })),
    };
};
