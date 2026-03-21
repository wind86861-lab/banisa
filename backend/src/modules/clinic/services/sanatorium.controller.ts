import { Response, NextFunction } from 'express';
import { clinicSanatoriumService } from './sanatorium.service';
import { sendSuccess } from '../../../utils/response';
import { AuthRequest } from '../../../middleware/auth.middleware';

export class ClinicSanatoriumController {

    getAvailableSanatoriumServices = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const { search, categoryId } = req.query as Record<string, string>;
            const data = await clinicSanatoriumService.getAvailableSanatoriumServices(req.user!.id, {
                search,
                categoryId,
            });
            sendSuccess(res, data);
        } catch (error) {
            next(error);
        }
    };

    activateSanatoriumService = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const data = await clinicSanatoriumService.activateSanatoriumService(
                req.user!.id,
                req.body,
            );
            sendSuccess(res, data, null, 'Sanatoriya xizmati muvaffaqiyatli aktivlashtirildi', 201);
        } catch (error) {
            next(error);
        }
    };

    deactivateSanatoriumService = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const data = await clinicSanatoriumService.deactivateSanatoriumService(req.user!.id, req.params.serviceId as string);
            sendSuccess(res, data, null, 'Sanatoriya xizmati nofaol qilindi');
        } catch (error) {
            next(error);
        }
    };
}

export const clinicSanatoriumController = new ClinicSanatoriumController();
