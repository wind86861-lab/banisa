import { Request, Response, NextFunction } from 'express';
import { sendSuccess } from '../../utils/response';
import * as homepageService from './homepage.service';

export const getAllSections = async (_req: Request, res: Response, next: NextFunction) => {
    try {
        const data = await homepageService.getAllSections();
        sendSuccess(res, data);
    } catch (error) {
        next(error);
    }
};

export const getSection = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const data = await homepageService.getSection(req.params.section as string);
        sendSuccess(res, data);
    } catch (error) {
        next(error);
    }
};

export const upsertSection = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const data = await homepageService.upsertSection(req.params.section as string, req.body);
        sendSuccess(res, data);
    } catch (error) {
        next(error);
    }
};
