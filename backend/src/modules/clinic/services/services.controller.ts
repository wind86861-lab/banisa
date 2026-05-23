import { Response, NextFunction } from 'express';
import { clinicServicesService, MetadataServiceType } from './services.service';
import { sendSuccess } from '../../../utils/response';
import { AuthRequest } from '../../../middleware/auth.middleware';

function normalizeServiceType(v: unknown): MetadataServiceType {
    const s = String(v ?? '').toUpperCase();
    if (s === 'SURGICAL' || s === 'CHECKUP' || s === 'DIAGNOSTIC') return s as MetadataServiceType;
    return 'DIAGNOSTIC';
}

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

    getServiceMetadata = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const serviceType = normalizeServiceType(req.query.serviceType as string | undefined);
            const data = await clinicServicesService.getServiceMetadata(
                req.user!.id,
                req.params.serviceId as string,
                serviceType,
            );
            sendSuccess(res, data);
        } catch (error) {
            next(error);
        }
    };

    saveServiceMetadata = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const serviceType = normalizeServiceType(req.body.serviceType);
            const data = await clinicServicesService.saveServiceMetadata(
                req.user!.id,
                req.params.serviceId as string,
                req.body.values,
                serviceType,
            );
            sendSuccess(res, data, null, 'Metadata saqlandi');
        } catch (error) {
            next(error);
        }
    };
}

export const clinicServicesController = new ClinicServicesController();
