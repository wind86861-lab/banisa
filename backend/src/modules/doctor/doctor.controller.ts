import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware';
import { sendSuccess } from '../../utils/response';
import { env } from '../../config/env';
import * as doctorService from './doctor.service';

function setRefreshCookie(res: Response, token: string) {
    res.cookie('user_refreshToken', token, {
        httpOnly: true,
        secure: env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: '/api/user/auth',
    });
}

// ─── Doctor (Mini App) ───────────────────────────────────────────────────────

export const register = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { initData, firstName, lastName, phone, specialty, bio, documents } = req.body;
        const result = await doctorService.registerDoctor({
            initDataRaw: String(initData || ''),
            firstName, lastName, phone, specialty, bio, documents,
        });
        setRefreshCookie(res, result.refreshToken);
        sendSuccess(res, result, undefined, 'Ariza yuborildi', 201);
    } catch (e) { next(e); }
};

export const me = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        sendSuccess(res, await doctorService.getMyDoctor(req.user!.id));
    } catch (e) { next(e); }
};

export const updateMe = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { specialty, bio, documents, firstName, lastName } = req.body || {};
        sendSuccess(res, await doctorService.updateMyDoctor(req.user!.id, { specialty, bio, documents, firstName, lastName }));
    } catch (e) { next(e); }
};

// ─── Recommendations ─────────────────────────────────────────────────────────

export const patientLookup = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        sendSuccess(res, await doctorService.lookupPatient(String(req.query.phone || '')));
    } catch (e) { next(e); }
};

export const createRecommendation = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { patientPhone, clinicId, note, items } = req.body || {};
        sendSuccess(res, await doctorService.createRecommendation(req.user!.id, { patientPhone, clinicId, note, items }), undefined, 'Tavsiya yuborildi', 201);
    } catch (e) { next(e); }
};

export const listRecommendations = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        sendSuccess(res, await doctorService.listMyRecommendations(req.user!.id));
    } catch (e) { next(e); }
};

// ─── Admin ───────────────────────────────────────────────────────────────────

export const adminList = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const status = req.query.status ? String(req.query.status) : undefined;
        sendSuccess(res, await doctorService.adminListDoctors(status));
    } catch (e) { next(e); }
};

export const adminGet = async (req: Request, res: Response, next: NextFunction) => {
    try {
        sendSuccess(res, await doctorService.adminGetDoctor(String(req.params.id)));
    } catch (e) { next(e); }
};

export const adminApprove = async (req: Request, res: Response, next: NextFunction) => {
    try {
        sendSuccess(res, await doctorService.adminApproveDoctor(String(req.params.id)), undefined, 'Tasdiqlandi');
    } catch (e) { next(e); }
};

export const adminReject = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const reason = String(req.body?.reason || '');
        sendSuccess(res, await doctorService.adminRejectDoctor(String(req.params.id), reason), undefined, 'Rad etildi');
    } catch (e) { next(e); }
};
