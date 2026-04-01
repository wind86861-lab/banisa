import { Response, NextFunction } from 'express';
import { userService } from './user.service';
import { sendSuccess } from '../../utils/response';
import { AuthRequest } from '../../middleware/auth.middleware';

/**
 * User Controller
 * Handles HTTP requests for user-related operations
 */
export class UserController {
    /**
     * Get current user profile
     */
    getProfile = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const user = await userService.getUserProfile(req.user!.id);
            sendSuccess(res, user);
        } catch (error) {
            next(error);
        }
    };

    /**
     * Update current user profile
     */
    updateProfile = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const user = await userService.updateUserProfile(req.user!.id, req.body);
            sendSuccess(res, user, null, 'Profil muvaffaqiyatli yangilandi');
        } catch (error) {
            next(error);
        }
    };

    /**
     * Get user appointments
     */
    getAppointments = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const { status, page, limit } = req.query;
            const result = await userService.getUserAppointments(req.user!.id, {
                status: status as string,
                page: page ? parseInt(page as string) : undefined,
                limit: limit ? parseInt(limit as string) : undefined,
            });
            sendSuccess(res, result.appointments, result.meta);
        } catch (error) {
            next(error);
        }
    };

    /**
     * Get user reviews
     */
    getReviews = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const reviews = await userService.getUserReviews(req.user!.id);
            sendSuccess(res, reviews);
        } catch (error) {
            next(error);
        }
    };

    /**
     * Create an appointment
     */
    createAppointment = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const appointment = await userService.createAppointment(req.user!.id, req.body);
            sendSuccess(res, appointment, null, 'Bron muvaffaqiyatli yaratildi', 201);
        } catch (error) {
            next(error);
        }
    };

    /**
     * Create a review
     */
    createReview = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const review = await userService.createReview(req.user!.id, req.body);
            sendSuccess(res, review, null, 'Sharh muvaffaqiyatli qo\'shildi', 201);
        } catch (error) {
            next(error);
        }
    };
}

export const userController = new UserController();
