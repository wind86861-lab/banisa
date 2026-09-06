import { Response, NextFunction } from 'express';
import { Request } from 'express';
import { ClinicRequest } from '../../../middleware/clinic-permission.middleware';
import { sendSuccess } from '../../../utils/response';
import { listUnavailableDates, replaceUnavailableDates } from './unavailable-dates.service';

// ─── Clinic side (session + CLINIC_SETTINGS_EDIT) ────────────────────────────

export const getDates = async (req: ClinicRequest, res: Response, next: NextFunction) => {
    try {
        const clinicId = req.clinicContext!.clinicId;
        const serviceType = String(req.query.serviceType || '');
        const serviceId = String(req.query.serviceId || '');
        sendSuccess(res, { dates: await listUnavailableDates(clinicId, serviceType, serviceId) });
    } catch (e) { next(e); }
};

export const putDates = async (req: ClinicRequest, res: Response, next: NextFunction) => {
    try {
        const clinicId = req.clinicContext!.clinicId;
        const { serviceType, serviceId, dates } = req.body || {};
        const saved = await replaceUnavailableDates(clinicId, String(serviceType || ''), String(serviceId || ''), dates);
        sendSuccess(res, { dates: saved }, undefined, 'Saqlandi');
    } catch (e) { next(e); }
};

// ─── Public read (no auth) ───────────────────────────────────────────────────

export const publicGetDates = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const clinicId = String(req.query.clinicId || '');
        const serviceType = String(req.params.serviceType || '');
        const serviceId = String(req.params.serviceId || '');
        if (!clinicId) { res.json({ success: true, data: { dates: [] } }); return; }
        const dates = await listUnavailableDates(clinicId, serviceType, serviceId);
        res.set('Cache-Control', 'public, max-age=30');
        res.json({ success: true, data: { dates } });
    } catch (e) { next(e); }
};
