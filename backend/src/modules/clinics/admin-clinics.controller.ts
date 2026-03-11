import { Response, NextFunction } from 'express';
import * as adminClinicsService from './admin-clinics.service';
import { sendSuccess } from '../../utils/response';
import { AppError, ErrorCodes } from '../../utils/errors';
import { AuthRequest } from '../../middleware/auth.middleware';

// 1. List clinics with filters, search, sort
export const list = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const result = await adminClinicsService.listClinics(req.query);
        sendSuccess(res, result.clinics, result.meta);
    } catch (error) {
        next(error);
    }
};

// 2. Get clinic by ID with full details
export const getById = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const clinic = await adminClinicsService.getClinicById(req.params.id as string);
        if (!clinic) throw new AppError('Clinic not found', 404, ErrorCodes.NOT_FOUND);
        sendSuccess(res, clinic);
    } catch (error) {
        next(error);
    }
};

// 3. Create new clinic
export const create = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const clinic = await adminClinicsService.createClinic(req.body, req.user!.id);
        sendSuccess(res, clinic, null, 'Clinic created successfully', 201);
    } catch (error) {
        next(error);
    }
};

// 4. Update clinic
export const update = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const clinic = await adminClinicsService.updateClinic(req.params.id as string, req.body);
        sendSuccess(res, clinic, null, 'Clinic updated successfully');
    } catch (error) {
        next(error);
    }
};

// 5. Soft delete (deactivate) clinic
export const remove = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        await adminClinicsService.deleteClinic(req.params.id as string);
        sendSuccess(res, null, null, 'Clinic deleted successfully');
    } catch (error) {
        next(error);
    }
};

// 6. Activate clinic
export const activate = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const clinic = await adminClinicsService.setActiveStatus(req.params.id as string, true);
        sendSuccess(res, clinic, null, 'Clinic activated successfully');
    } catch (error) {
        next(error);
    }
};

// 7. Deactivate clinic
export const deactivate = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const clinic = await adminClinicsService.setActiveStatus(req.params.id as string, false);
        sendSuccess(res, clinic, null, 'Clinic deactivated successfully');
    } catch (error) {
        next(error);
    }
};

// 8. Approve clinic (SELF_REGISTERED workflow)
export const approve = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const clinic = await adminClinicsService.approveClinic(req.params.id as string, req.user!.id);
        sendSuccess(res, clinic, null, 'Klinika tasdiqlandi');
    } catch (error) {
        next(error);
    }
};

// 9. Reject clinic
export const reject = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { reason } = req.body;
        if (!reason) throw new AppError('Rad etish sababi kiritilishi shart', 400, ErrorCodes.VALIDATION_ERROR);
        const clinic = await adminClinicsService.rejectClinic(req.params.id as string, reason, req.user!.id);
        sendSuccess(res, clinic, null, 'Klinika rad etildi');
    } catch (error) {
        next(error);
    }
};

// 10. Reopen rejected clinic
export const reopen = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const clinic = await adminClinicsService.reopenClinic(req.params.id as string);
        sendSuccess(res, clinic, null, 'Klinika qayta ko\'rib chiqishga yuborildi');
    } catch (error) {
        next(error);
    }
};

// 11. Update clinic status (SUSPENDED, DELETED, IN_REVIEW)
export const updateStatus = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { status, rejectionReason } = req.body;
        const clinic = await adminClinicsService.updateClinicStatus(req.params.id as string, status, rejectionReason, req.user!.id);
        sendSuccess(res, clinic, null, 'Status yangilandi');
    } catch (error) {
        next(error);
    }
};

// 23. Bulk activate
export const bulkActivate = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { ids } = req.body;
        const result = await adminClinicsService.bulkSetActiveStatus(ids, true);
        sendSuccess(res, result, null, `${result.count} clinics activated successfully`);
    } catch (error) {
        next(error);
    }
};

// 24. Bulk deactivate
export const bulkDeactivate = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { ids } = req.body;
        const result = await adminClinicsService.bulkSetActiveStatus(ids, false);
        sendSuccess(res, result, null, `${result.count} clinics deactivated successfully`);
    } catch (error) {
        next(error);
    }
};

// 25. Export to CSV
export const exportCSV = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const csv = await adminClinicsService.exportClinicsToCSV(req.query);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=clinics.csv');
        res.send(csv);
    } catch (error) {
        next(error);
    }
};

// ─── Nested Resources ─────────────────────────────────────────────────────────

// 18. Get clinic services
export const getServices = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const services = await adminClinicsService.getClinicServices(req.params.id as string);
        sendSuccess(res, services);
    } catch (error) {
        next(error);
    }
};

// 19. Get clinic doctors
export const getDoctors = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const doctors = await adminClinicsService.getClinicDoctors(req.params.id as string);
        sendSuccess(res, doctors);
    } catch (error) {
        next(error);
    }
};

// 20. Get clinic statistics
export const getStats = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const stats = await adminClinicsService.getClinicStats(req.params.id as string);
        sendSuccess(res, stats);
    } catch (error) {
        next(error);
    }
};

// 21. Get clinic reviews
export const getReviews = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const reviews = await adminClinicsService.getClinicReviews(req.params.id as string);
        sendSuccess(res, reviews);
    } catch (error) {
        next(error);
    }
};
