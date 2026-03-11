import { Response, NextFunction } from 'express';
import { clinicSettingsService } from './settings.service';
import { sendSuccess } from '../../../utils/response';
import { AuthRequest } from '../../../middleware/auth.middleware';

export class ClinicSettingsController {

    getWorkingHours = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const data = await clinicSettingsService.getWorkingHours(req.user!.id);
            sendSuccess(res, data);
        } catch (error) {
            next(error);
        }
    };

    updateWorkingHours = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const data = await clinicSettingsService.updateWorkingHours(req.user!.id, req.body);
            sendSuccess(res, data, null, 'Ish vaqti muvaffaqiyatli yangilandi');
        } catch (error) {
            next(error);
        }
    };

    getQueueSettings = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const data = await clinicSettingsService.getQueueSettings(req.user!.id);
            sendSuccess(res, data);
        } catch (error) {
            next(error);
        }
    };

    updateQueueSettings = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const data = await clinicSettingsService.updateQueueSettings(req.user!.id, req.body);
            sendSuccess(res, data, null, 'Navbat sozlamalari muvaffaqiyatli yangilandi');
        } catch (error) {
            next(error);
        }
    };
}

export const clinicSettingsController = new ClinicSettingsController();
