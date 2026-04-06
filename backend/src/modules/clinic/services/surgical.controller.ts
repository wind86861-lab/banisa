import { Response, NextFunction } from 'express';
import { clinicSurgicalService } from './surgical.service';
import { sendSuccess } from '../../../utils/response';
import { AuthRequest } from '../../../middleware/auth.middleware';

export class ClinicSurgicalController {

    getAvailableSurgicalServices = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const { search, categoryId } = req.query as Record<string, string>;
            const data = await clinicSurgicalService.getAvailableSurgicalServices(req.user!.id, {
                search,
                categoryId,
            });
            sendSuccess(res, data);
        } catch (error) {
            next(error);
        }
    };

    activateSurgicalService = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const data = await clinicSurgicalService.activateSurgicalService(req.user!.id, req.body.serviceId);
            sendSuccess(res, data, null, 'Operatsiya muvaffaqiyatli aktivlashtirildi', 201);
        } catch (error) {
            next(error);
        }
    };

    deactivateSurgicalService = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const data = await clinicSurgicalService.deactivateSurgicalService(req.user!.id, req.params.serviceId as string);
            sendSuccess(res, data, null, 'Operatsiya nofaol qilindi');
        } catch (error) {
            next(error);
        }
    };

    getCustomization = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const data = await clinicSurgicalService.getSurgicalCustomization(req.user!.id, String(req.params.serviceId));
            sendSuccess(res, data);
        } catch (error) {
            next(error);
        }
    };

    upsertCustomization = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const data = await clinicSurgicalService.upsertSurgicalCustomization(req.user!.id, String(req.params.serviceId), req.body);
            sendSuccess(res, data, null, 'Moslashtirish saqlandi');
        } catch (error) {
            next(error);
        }
    };

    deleteCustomization = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const data = await clinicSurgicalService.deleteSurgicalCustomization(req.user!.id, String(req.params.serviceId));
            sendSuccess(res, data);
        } catch (error) {
            next(error);
        }
    };
}

export const clinicSurgicalController = new ClinicSurgicalController();
