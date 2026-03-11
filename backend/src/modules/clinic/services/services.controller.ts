import { Response, NextFunction } from 'express';
import { clinicServicesService } from './services.service';
import { sendSuccess } from '../../../utils/response';
import { AuthRequest } from '../../../middleware/auth.middleware';

export class ClinicServicesController {

    getAvailableServices = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const { search, categoryId, onlyActive } = req.query as Record<string, string>;
            const data = await clinicServicesService.getAvailableServices(req.user!.id, {
                search,
                categoryId,
                onlyActive: onlyActive === 'true',
            });
            sendSuccess(res, data);
        } catch (error) {
            next(error);
        }
    };

    activateService = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const data = await clinicServicesService.activateService(req.user!.id, req.body.serviceId);
            sendSuccess(res, data, null, 'Xizmat muvaffaqiyatli aktivlashtirildi', 201);
        } catch (error) {
            next(error);
        }
    };

    deactivateService = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const data = await clinicServicesService.deactivateService(req.user!.id, req.params.serviceId as string);
            sendSuccess(res, data, null, 'Xizmat nofaol qilindi');
        } catch (error) {
            next(error);
        }
    };
}

export const clinicServicesController = new ClinicServicesController();
