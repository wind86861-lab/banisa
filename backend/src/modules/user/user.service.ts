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
     * Create an appointment — delegates to the new AppointmentService
     * which handles bookingNumber, qrToken, pricing, and audit logging.
     * Kept for backwards compatibility.
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
        const { appointmentService } = await import('../appointments/appointment.service');
        return appointmentService.createBooking(userId, data);
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
