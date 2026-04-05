import { Response, NextFunction } from 'express';
import * as surgicalService from './surgical.service';
import { sendSuccess } from '../../utils/response';
import { AppError, ErrorCodes } from '../../utils/errors';
import { AuthRequest } from '../../middleware/auth.middleware';

export const tree = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const result = await surgicalService.getSurgicalTree();
        sendSuccess(res, result);
    } catch (error) {
        next(error);
    }
};

export const list = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const result = await surgicalService.listSurgicalServices(req.query);
        sendSuccess(res, result.services, result.meta);
    } catch (error) {
        next(error);
    }
};

export const getById = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const id = req.params.id as string;
        const service = await surgicalService.getSurgicalById(id);
        if (!service) {
            throw new AppError('Surgical service not found', 404, ErrorCodes.NOT_FOUND);
        }
        sendSuccess(res, service);
    } catch (error) {
        next(error);
    }
};

export const create = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const service = await surgicalService.createSurgical(req.body, req.user!.id);
        sendSuccess(res, service, null, 'Surgical service created successfully', 201);
    } catch (error) {
        next(error);
    }
};

export const update = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const id = req.params.id as string;
        const service = await surgicalService.updateSurgical(id, req.body);
        sendSuccess(res, service, null, 'Surgical service updated successfully');
    } catch (error) {
        next(error);
    }
};

export const remove = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const id = req.params.id as string;
        await surgicalService.deleteSurgical(id);
        sendSuccess(res, null, null, 'Surgical service deactivated successfully');
    } catch (error) {
        next(error);
    }
};
