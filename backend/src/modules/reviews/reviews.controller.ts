import { Response, NextFunction } from 'express';
import { reviewsService } from './reviews.service';
import { sendSuccess } from '../../utils/response';
import { AuthRequest } from '../../middleware/auth.middleware';

export class ReviewsController {
    // ─── CREATE REVIEW (Authenticated Users) ───────────────────────────────
    createReview = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const { serviceId, serviceType, rating, comment } = req.body;
            const userId = req.user!.id;

            const review = await reviewsService.createReview(
                userId,
                String(serviceId),
                serviceType as 'diagnostic' | 'surgical' | 'sanatorium',
                Number(rating),
                comment ? String(comment) : undefined
            );

            sendSuccess(res, review, undefined, 'Sharhingiz muvaffaqiyatli yuborildi. Moderatsiyadan o\'tgandan keyin ko\'rsatiladi', 201);
        } catch (error) {
            next(error);
        }
    };

    // ─── GET REVIEWS BY SERVICE (Public) ────────────────────────────────────
    getReviewsByService = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const serviceId = String(req.params.serviceId);
            const serviceType = req.query.serviceType as string;

            if (!serviceType || !['diagnostic', 'surgical', 'sanatorium'].includes(serviceType)) {
                return res.status(400).json({
                    success: false,
                    error: 'Service type must be diagnostic, surgical, or sanatorium',
                });
            }

            const result = await reviewsService.getReviewsByService(
                serviceId,
                serviceType as 'diagnostic' | 'surgical' | 'sanatorium',
                true
            );

            sendSuccess(res, result);
        } catch (error) {
            next(error);
        }
    };

    // ─── GET ALL REVIEWS (Admin) ────────────────────────────────────────────
    getAllReviews = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const status = req.query.status as string | undefined;
            const page = req.query.page as string | undefined;
            const limit = req.query.limit as string | undefined;

            const result = await reviewsService.getAllReviews(
                status as any,
                page ? Number(page) : 1,
                limit ? Number(limit) : 20
            );

            sendSuccess(res, result);
        } catch (error) {
            next(error);
        }
    };

    // ─── APPROVE REVIEW (Admin) ─────────────────────────────────────────────
    approveReview = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const reviewId = String(req.params.reviewId);
            const adminId = req.user!.id;

            const review = await reviewsService.approveReview(reviewId, adminId);

            sendSuccess(res, review, undefined, 'Sharh tasdiqlandi');
        } catch (error) {
            next(error);
        }
    };

    // ─── REJECT REVIEW (Admin) ──────────────────────────────────────────────
    rejectReview = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const reviewId = String(req.params.reviewId);
            const rejectionReason = req.body.rejectionReason as string | undefined;
            const adminId = req.user!.id;

            const review = await reviewsService.rejectReview(reviewId, adminId, rejectionReason);

            sendSuccess(res, review, undefined, 'Sharh rad etildi');
        } catch (error) {
            next(error);
        }
    };

    // ─── DELETE REVIEW (Admin) ──────────────────────────────────────────────
    deleteReview = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const reviewId = String(req.params.reviewId);

            const result = await reviewsService.deleteReview(reviewId);

            sendSuccess(res, result);
        } catch (error) {
            next(error);
        }
    };

    // ─── GET USER'S REVIEW FOR SERVICE ──────────────────────────────────────
    getUserReviewForService = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const serviceId = String(req.params.serviceId);
            const serviceType = req.query.serviceType as string;
            const userId = req.user!.id;

            if (!serviceType || !['diagnostic', 'surgical', 'sanatorium'].includes(serviceType)) {
                return res.status(400).json({
                    success: false,
                    error: 'Service type must be diagnostic, surgical, or sanatorium',
                });
            }

            const review = await reviewsService.getUserReviewForService(
                userId,
                serviceId,
                serviceType as 'diagnostic' | 'surgical' | 'sanatorium'
            );

            sendSuccess(res, review);
        } catch (error) {
            next(error);
        }
    };
}

export const reviewsController = new ReviewsController();
