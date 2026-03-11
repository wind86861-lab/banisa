import { Response, NextFunction } from 'express';
import { clinicCheckupService } from './checkup.service';
import { sendSuccess } from '../../../utils/response';
import { AuthRequest } from '../../../middleware/auth.middleware';

export class ClinicCheckupController {

    getAvailablePackages = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const data = await clinicCheckupService.getAvailablePackages(req.user!.id);
            sendSuccess(res, data);
        } catch (error) {
            next(error);
        }
    };

    activatePackage = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const data = await clinicCheckupService.activatePackage(req.user!.id, req.body);
            sendSuccess(res, data, null, 'Paket muvaffaqiyatli aktivlashtirildi', 201);
        } catch (error) {
            next(error);
        }
    };

    updatePackage = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const data = await clinicCheckupService.updatePackage(req.user!.id, req.params.id as string, req.body);
            sendSuccess(res, data, null, 'Paket yangilandi');
        } catch (error) {
            next(error);
        }
    };

    deactivatePackage = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const data = await clinicCheckupService.deactivatePackage(req.user!.id, req.params.id as string);
            sendSuccess(res, data, null, 'Paket nofaol qilindi');
        } catch (error) {
            next(error);
        }
    };
}

export const clinicCheckupController = new ClinicCheckupController();
