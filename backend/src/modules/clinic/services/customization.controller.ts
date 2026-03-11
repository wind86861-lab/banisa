import { Response, NextFunction } from 'express';
import { customizationService } from './customization.service';
import { sendSuccess } from '../../../utils/response';
import { AuthRequest } from '../../../middleware/auth.middleware';

export class CustomizationController {

    // GET /api/clinic/services/:clinicServiceId/customization
    getCustomization = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const data = await customizationService.getCustomization(
                req.user!.id,
                String(req.params.clinicServiceId),
            );
            sendSuccess(res, data);
        } catch (error) {
            next(error);
        }
    };

    // PUT /api/clinic/services/:clinicServiceId/customization
    upsertCustomization = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const data = await customizationService.upsertCustomization(
                req.user!.id,
                String(req.params.clinicServiceId),
                req.body,
            );
            sendSuccess(res, data, null, 'Moslashtirish saqlandi');
        } catch (error) {
            next(error);
        }
    };

    // DELETE /api/clinic/services/:clinicServiceId/customization
    deleteCustomization = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const result = await customizationService.deleteCustomization(
                req.user!.id,
                String(req.params.clinicServiceId),
            );
            sendSuccess(res, result);
        } catch (error) {
            next(error);
        }
    };

    // POST /api/clinic/services/:clinicServiceId/customization/images
    uploadImage = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            if (!req.file) {
                return res.status(400).json({ success: false, message: 'Fayl yuklanmadi' });
            }

            const fileUrl = `/uploads/services/${req.file.filename}`;

            const data = await customizationService.uploadImage(
                req.user!.id,
                String(req.params.clinicServiceId),
                fileUrl,
                req.body.alt,
            );
            sendSuccess(res, data, null, 'Rasm yuklandi', 201);
        } catch (error) {
            next(error);
        }
    };

    // DELETE /api/clinic/services/:clinicServiceId/customization/images/:imageId
    deleteImage = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const result = await customizationService.deleteImage(
                req.user!.id,
                String(req.params.clinicServiceId),
                String(req.params.imageId),
            );
            sendSuccess(res, result);
        } catch (error) {
            next(error);
        }
    };

    // PUT /api/clinic/services/:clinicServiceId/customization/images/reorder
    reorderImages = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const result = await customizationService.reorderImages(
                req.user!.id,
                String(req.params.clinicServiceId),
                req.body.imageIds,
            );
            sendSuccess(res, result);
        } catch (error) {
            next(error);
        }
    };

    // PUT /api/clinic/services/:clinicServiceId/customization/images/:imageId/primary
    setPrimaryImage = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const result = await customizationService.setPrimaryImage(
                req.user!.id,
                String(req.params.clinicServiceId),
                String(req.params.imageId),
            );
            sendSuccess(res, result);
        } catch (error) {
            next(error);
        }
    };
}

export const customizationController = new CustomizationController();
