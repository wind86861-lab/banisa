import prisma from '../../config/database';
import { AppError, ErrorCodes } from '../../utils/errors';
import { Role } from '@prisma/client';

/**
 * User Service
 * Handles user profile management and user-related operations
 */
export class UserService {
    /**
     * Get user profile by ID
     */
    async getUserProfile(userId: string) {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                phone: true,
                email: true,
                firstName: true,
                lastName: true,
                role: true,
                status: true,
                isActive: true,
                clinicId: true,
                createdAt: true,
                updatedAt: true,
            },
        });

        if (!user) {
            throw new AppError('Foydalanuvchi topilmadi', 404, ErrorCodes.NOT_FOUND);
        }

        return user;
    }

    /**
     * Update user profile
     */
    async updateUserProfile(userId: string, data: {
        firstName?: string;
        lastName?: string;
        email?: string;
    }) {
        const user = await prisma.user.update({
            where: { id: userId },
            data: {
                firstName: data.firstName,
                lastName: data.lastName,
                email: data.email,
            },
            select: {
                id: true,
                phone: true,
                email: true,
                firstName: true,
                lastName: true,
                role: true,
                status: true,
                createdAt: true,
                updatedAt: true,
            },
        });

        return user;
    }

    /**
     * Get user appointments (for PATIENT role)
     */
    async getUserAppointments(userId: string, filters: {
        status?: string;
        page?: number;
        limit?: number;
    }) {
        const page = filters.page || 1;
        const limit = filters.limit || 10;
        const skip = (page - 1) * limit;

        const where: any = { patientId: userId };
        if (filters.status) {
            where.status = filters.status;
        }

        const [appointments, total] = await Promise.all([
            prisma.appointment.findMany({
                where,
                skip,
                take: limit,
                orderBy: { scheduledAt: 'desc' },
                include: {
                    clinic: {
                        select: {
                            id: true,
                            nameUz: true,
                            nameRu: true,
                        },
                    },
                    doctor: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                        },
                    },
                },
            }),
            prisma.appointment.count({ where }),
        ]);

        return {
            appointments,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    /**
     * Get user reviews (for PATIENT role)
     */
    async getUserReviews(userId: string) {
        const reviews = await prisma.review.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            include: {
                clinic: {
                    select: {
                        id: true,
                        nameUz: true,
                        nameRu: true,
                    },
                },
            },
        });

        return reviews;
    }

    /**
     * Create an appointment
     */
    async createAppointment(userId: string, data: {
        clinicId: string;
        serviceType: 'DIAGNOSTIC' | 'SURGICAL' | 'OTHER';
        diagnosticServiceId?: string;
        surgicalServiceId?: string;
        scheduledAt: string;
        notes?: string;
        price: number;
    }) {
        // 1. Verify clinic exists and is APPROVED
        const clinic = await prisma.clinic.findUnique({
            where: { id: data.clinicId },
            select: { id: true, nameUz: true, nameRu: true, status: true },
        });
        if (!clinic) {
            throw new AppError('Klinika topilmadi', 404, ErrorCodes.NOT_FOUND);
        }
        if (clinic.status !== 'APPROVED') {
            throw new AppError('Klinika faol emas', 400, ErrorCodes.VALIDATION_ERROR);
        }

        // 2. Verify diagnostic service if provided
        if (data.serviceType === 'DIAGNOSTIC' && data.diagnosticServiceId) {
            const svc = await prisma.diagnosticService.findUnique({
                where: { id: data.diagnosticServiceId },
                select: { id: true, isActive: true },
            });
            if (!svc || !svc.isActive) {
                throw new AppError('Diagnostika xizmati topilmadi yoki faol emas', 404, ErrorCodes.NOT_FOUND);
            }
        }

        // 3. Verify surgical service if provided
        if (data.serviceType === 'SURGICAL' && data.surgicalServiceId) {
            const svc = await prisma.surgicalService.findUnique({
                where: { id: data.surgicalServiceId },
                select: { id: true },
            });
            if (!svc) {
                throw new AppError('Jarrohlik xizmati topilmadi', 404, ErrorCodes.NOT_FOUND);
            }
        }

        // 4. Check for duplicate appointment same patient+clinic+date
        const scheduledDate = new Date(data.scheduledAt);
        const dayStart = new Date(scheduledDate);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(scheduledDate);
        dayEnd.setHours(23, 59, 59, 999);

        const existing = await prisma.appointment.findFirst({
            where: {
                patientId: userId,
                clinicId: data.clinicId,
                scheduledAt: { gte: dayStart, lte: dayEnd },
                status: { in: ['PENDING', 'CONFIRMED'] },
            },
            include: {
                clinic: { select: { id: true, nameUz: true, nameRu: true } },
                diagnosticService: { select: { id: true, nameUz: true } },
                surgicalService: { select: { id: true, nameUz: true } },
            },
        });

        // If CONFIRMED appointment exists, block duplicate
        if (existing && existing.status === 'CONFIRMED') {
            throw new AppError('Siz bu klinikaga o\'sha kuni allaqachon tasdiqlangan bron qilgansiz', 400, ErrorCodes.VALIDATION_ERROR);
        }

        // If PENDING appointment exists, return it (allows payment retry)
        if (existing && existing.status === 'PENDING') {
            return existing;
        }

        // 5. Create appointment
        const appointment = await prisma.appointment.create({
            data: {
                clinicId: data.clinicId,
                patientId: userId,
                serviceType: data.serviceType,
                diagnosticServiceId: data.diagnosticServiceId,
                surgicalServiceId: data.surgicalServiceId,
                scheduledAt: scheduledDate,
                status: 'PENDING',
                price: data.price,
                notes: data.notes,
            },
            include: {
                clinic: { select: { id: true, nameUz: true, nameRu: true } },
                diagnosticService: { select: { id: true, nameUz: true } },
                surgicalService: { select: { id: true, nameUz: true } },
            },
        });

        return appointment;
    }

    /**
     * Create a review
     */
    async createReview(userId: string, data: {
        clinicId: string;
        rating: number;
        comment?: string;
    }) {
        // Check if user already reviewed this clinic
        const existingReview = await prisma.review.findFirst({
            where: {
                userId,
                clinicId: data.clinicId,
            },
        });

        if (existingReview) {
            throw new AppError('Siz allaqachon ushbu klinikaga sharh qoldirgansiz', 400, ErrorCodes.VALIDATION_ERROR);
        }

        const review = await prisma.review.create({
            data: {
                userId,
                clinicId: data.clinicId,
                rating: data.rating,
                comment: data.comment,
            },
            include: {
                clinic: {
                    select: {
                        id: true,
                        nameUz: true,
                        nameRu: true,
                    },
                },
            },
        });

        return review;
    }
}

export const userService = new UserService();
