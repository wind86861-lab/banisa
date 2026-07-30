import prisma from '../../config/database';
import { AppError, ErrorCodes } from '../../utils/errors';
import { ReviewStatus } from '@prisma/client';

// Map the public review serviceType to the cart AppointmentService enum.
const CART_TYPE: Record<string, string> = {
    diagnostic: 'DIAGNOSTIC', surgical: 'SURGICAL', sanatorium: 'SANATORIUM',
};

/**
 * Has this patient actually USED this service? True only when they have a
 * COMPLETED appointment that includes it — either as a solo booking (the
 * appointment's own service field) or as a line in a cart booking
 * (AppointmentService.originalServiceId). This is the gate that stops people
 * who never received the service from reviewing it.
 */
export async function hasUsedService(
    userId: string,
    serviceId: string,
    serviceType: 'diagnostic' | 'surgical' | 'sanatorium',
): Promise<boolean> {
    const soloField = serviceType === 'diagnostic'
        ? { diagnosticServiceId: serviceId }
        : serviceType === 'surgical'
            ? { surgicalServiceId: serviceId }
            : null; // sanatorium has no solo field on Appointment — cart only

    const count = await prisma.appointment.count({
        where: {
            patientId: userId,
            status: 'COMPLETED',
            OR: [
                ...(soloField ? [soloField] : []),
                { services: { some: { serviceType: CART_TYPE[serviceType] as any, originalServiceId: serviceId } } },
            ],
        },
    });
    return count > 0;
}

export class ReviewsService {
    // ─── CREATE REVIEW ──────────────────────────────────────────────────────
    async createReview(
        userId: string,
        serviceId: string,
        serviceType: 'diagnostic' | 'surgical' | 'sanatorium',
        rating: number,
        comment?: string
    ) {
        // Check if service exists
        const serviceField = serviceType === 'diagnostic'
            ? 'diagnosticService'
            : serviceType === 'surgical'
                ? 'surgicalService'
                : 'sanatoriumService';

        const serviceIdField = serviceType === 'diagnostic'
            ? 'diagnosticServiceId'
            : serviceType === 'surgical'
                ? 'surgicalServiceId'
                : 'sanatoriumServiceId';

        const service = await (prisma as any)[serviceField].findUnique({
            where: { id: serviceId },
        });

        if (!service) {
            throw new AppError('Xizmat topilmadi', 404, ErrorCodes.NOT_FOUND);
        }

        // Only patients who actually used the service may review it.
        const used = await hasUsedService(userId, serviceId, serviceType);
        if (!used) {
            throw new AppError(
                'Sharh faqat xizmatdan foydalangandan keyin qoldiriladi',
                403,
                ErrorCodes.FORBIDDEN,
            );
        }

        // Check if user already reviewed this service
        const existingReview = await prisma.serviceReview.findFirst({
            where: {
                userId,
                [serviceIdField]: serviceId,
            },
        });

        if (existingReview) {
            throw new AppError('Siz allaqachon bu xizmatga sharh qoldirgan ekansiz', 400, ErrorCodes.VALIDATION_ERROR);
        }

        // Create review - auto-approve (no moderation)
        const review = await prisma.serviceReview.create({
            data: {
                userId,
                [serviceIdField]: serviceId,
                rating,
                comment,
                status: ReviewStatus.APPROVED,
            },
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        phone: true,
                    },
                },
            },
        });

        return review;
    }

    // ─── UPDATE OWN REVIEW COMMENT ──────────────────────────────────────────
    // Used by the in-bot flow: the patient rates first (creating the review),
    // then optionally sends a comment as a follow-up message.
    async updateOwnComment(reviewId: string, userId: string, comment: string) {
        const trimmed = (comment || '').trim().slice(0, 1000);
        if (!trimmed) return null;
        const res = await prisma.serviceReview.updateMany({
            where: { id: reviewId, userId },
            data: { comment: trimmed },
        });
        return res.count > 0;
    }

    // ─── GET REVIEWS BY SERVICE ─────────────────────────────────────────────
    async getReviewsByService(
        serviceId: string,
        serviceType: 'diagnostic' | 'surgical' | 'sanatorium',
        includeStats = true
    ) {
        const serviceIdField = serviceType === 'diagnostic'
            ? 'diagnosticServiceId'
            : serviceType === 'surgical'
                ? 'surgicalServiceId'
                : 'sanatoriumServiceId';

        const reviews = await prisma.serviceReview.findMany({
            where: {
                [serviceIdField]: serviceId,
                status: ReviewStatus.APPROVED,
            },
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        if (!includeStats) {
            return { reviews };
        }

        // Calculate statistics
        const totalReviews = reviews.length;
        const averageRating = totalReviews > 0
            ? reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
            : 0;

        const ratingDistribution = {
            5: reviews.filter(r => r.rating === 5).length,
            4: reviews.filter(r => r.rating === 4).length,
            3: reviews.filter(r => r.rating === 3).length,
            2: reviews.filter(r => r.rating === 2).length,
            1: reviews.filter(r => r.rating === 1).length,
        };

        return {
            reviews,
            stats: {
                totalReviews,
                averageRating: Math.round(averageRating * 10) / 10,
                ratingDistribution,
            },
        };
    }

    // ─── GET ALL REVIEWS (ADMIN) ────────────────────────────────────────────
    async getAllReviews(
        status?: ReviewStatus,
        page = 1,
        limit = 20
    ) {
        const where = status ? { status } : {};
        const skip = (page - 1) * limit;

        const [reviews, total] = await Promise.all([
            prisma.serviceReview.findMany({
                where,
                include: {
                    user: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            phone: true,
                        },
                    },
                    diagnosticService: {
                        select: {
                            id: true,
                            nameUz: true,
                        },
                    },
                    surgicalService: {
                        select: {
                            id: true,
                            nameUz: true,
                        },
                    },
                    sanatoriumService: {
                        select: {
                            id: true,
                            nameUz: true,
                        },
                    },
                },
                orderBy: {
                    createdAt: 'desc',
                },
                skip,
                take: limit,
            }),
            prisma.serviceReview.count({ where }),
        ]);

        return {
            reviews,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    // ─── APPROVE REVIEW ─────────────────────────────────────────────────────
    async approveReview(reviewId: string, adminId: string) {
        const review = await prisma.serviceReview.findUnique({
            where: { id: reviewId },
        });

        if (!review) {
            throw new AppError('Sharh topilmadi', 404, ErrorCodes.NOT_FOUND);
        }

        if (review.status === ReviewStatus.APPROVED) {
            throw new AppError('Sharh allaqachon tasdiqlangan', 400, ErrorCodes.VALIDATION_ERROR);
        }

        const updatedReview = await prisma.serviceReview.update({
            where: { id: reviewId },
            data: {
                status: ReviewStatus.APPROVED,
                reviewedBy: adminId,
                reviewedAt: new Date(),
                rejectionReason: null,
            },
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                    },
                },
            },
        });

        return updatedReview;
    }

    // ─── REJECT REVIEW ──────────────────────────────────────────────────────
    async rejectReview(reviewId: string, adminId: string, rejectionReason?: string) {
        const review = await prisma.serviceReview.findUnique({
            where: { id: reviewId },
        });

        if (!review) {
            throw new AppError('Sharh topilmadi', 404, ErrorCodes.NOT_FOUND);
        }

        const updatedReview = await prisma.serviceReview.update({
            where: { id: reviewId },
            data: {
                status: ReviewStatus.REJECTED,
                reviewedBy: adminId,
                reviewedAt: new Date(),
                rejectionReason,
            },
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                    },
                },
            },
        });

        return updatedReview;
    }

    // ─── DELETE REVIEW ──────────────────────────────────────────────────────
    async deleteReview(reviewId: string) {
        const review = await prisma.serviceReview.findUnique({
            where: { id: reviewId },
        });

        if (!review) {
            throw new AppError('Sharh topilmadi', 404, ErrorCodes.NOT_FOUND);
        }

        await prisma.serviceReview.delete({
            where: { id: reviewId },
        });

        return { message: 'Sharh o\'chirildi' };
    }

    // ─── GET USER'S REVIEW FOR SERVICE ──────────────────────────────────────
    async getUserReviewForService(
        userId: string,
        serviceId: string,
        serviceType: 'diagnostic' | 'surgical' | 'sanatorium'
    ) {
        const serviceIdField = serviceType === 'diagnostic'
            ? 'diagnosticServiceId'
            : serviceType === 'surgical'
                ? 'surgicalServiceId'
                : 'sanatoriumServiceId';

        const review = await prisma.serviceReview.findFirst({
            where: {
                userId,
                [serviceIdField]: serviceId,
            },
        });

        return review;
    }
}

export const reviewsService = new ReviewsService();
