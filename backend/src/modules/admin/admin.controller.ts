import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware';
import { sendSuccess } from '../../utils/response';
import * as adminService from './admin.service';

export const getProfile = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const profile = await adminService.getProfile(userId);
        sendSuccess(res, profile);
    } catch (error) {
        next(error);
    }
};

export const updateProfile = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const profile = await adminService.updateProfile(userId, req.body);
        sendSuccess(res, profile);
    } catch (error) {
        next(error);
    }
};

export const updatePassword = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const { currentPassword, newPassword } = req.body;
        const result = await adminService.updatePassword(userId, currentPassword, newPassword);
        sendSuccess(res, result);
    } catch (error) {
        next(error);
    }
};

export const getNotifications = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const notifications = await adminService.getNotifications(userId);
        sendSuccess(res, notifications);
    } catch (error) {
        next(error);
    }
};

export const markNotificationAsRead = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const id = req.params.id as string;
        const result = await adminService.markNotificationAsRead(userId, id);
        sendSuccess(res, result);
    } catch (error) {
        next(error);
    }
};

export const markAllNotificationsAsRead = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const result = await adminService.markAllNotificationsAsRead(req.user!.id);
        sendSuccess(res, result);
    } catch (error) {
        next(error);
    }
};

export const getDashboardStats = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const stats = await adminService.getDashboardStats();
        sendSuccess(res, stats);
    } catch (error) {
        next(error);
    }
};
