import { Response, NextFunction } from 'express';
import * as sanatoriumService from './sanatorium.service';
import { sendSuccess } from '../../utils/response';
import { AppError, ErrorCodes } from '../../utils/errors';
import { AuthRequest } from '../../middleware/auth.middleware';

export const list = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const result = await sanatoriumService.listSanatoriumServices(req.query);
        sendSuccess(res, result.services, result.meta);
    } catch (error) {
        next(error);
    }
};

export const getById = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const id = req.params.id as string;
        const service = await sanatoriumService.getSanatoriumById(id);
        if (!service) {
            throw new AppError('Sanatorium service not found', 404, ErrorCodes.NOT_FOUND);
        }
        sendSuccess(res, service);
    } catch (error) {
        next(error);
    }
};

export const create = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const service = await sanatoriumService.createSanatorium(req.body, req.user!.id);
        sendSuccess(res, service, null, 'Sanatoriya xizmati muvaffaqiyatli yaratildi', 201);
    } catch (error) {
        next(error);
    }
};

export const update = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const id = req.params.id as string;
        const service = await sanatoriumService.updateSanatorium(id, req.body);
        sendSuccess(res, service, null, 'Sanatoriya xizmati yangilandi');
    } catch (error) {
        next(error);
    }
};

export const remove = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const id = req.params.id as string;
        await sanatoriumService.deleteSanatorium(id);
        sendSuccess(res, null, null, 'Sanatoriya xizmati nofaol qilindi');
    } catch (error) {
        next(error);
    }
};
