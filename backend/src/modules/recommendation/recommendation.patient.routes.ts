import { Router, Response, NextFunction } from 'express';
import { requireAuth, requireRole, AuthRequest } from '../../middleware/auth.middleware';
import { sendSuccess } from '../../utils/response';
import * as svc from './recommendation.patient.service';

// ─── /api/user/recommendations — patient ─────────────────────────────────────
export const patientRecommendationRouter = Router();
patientRecommendationRouter.use(requireAuth, requireRole(['PATIENT']));

patientRecommendationRouter.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { sendSuccess(res, await svc.listForPatient(req.user!.id)); } catch (e) { next(e); }
});

patientRecommendationRouter.get('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { sendSuccess(res, await svc.getForPatient(String(req.params.id), req.user!.id)); } catch (e) { next(e); }
});

patientRecommendationRouter.post('/:id/remove-item', async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { sendSuccess(res, await svc.removeItem(String(req.params.id), req.user!.id, String(req.body?.itemId || ''))); } catch (e) { next(e); }
});

patientRecommendationRouter.post('/:id/accept', async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { sendSuccess(res, await svc.respond(String(req.params.id), req.user!.id, 'accept'), undefined, 'Qabul qilindi'); } catch (e) { next(e); }
});

patientRecommendationRouter.post('/:id/reject', async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { sendSuccess(res, await svc.respond(String(req.params.id), req.user!.id, 'reject'), undefined, 'Rad etildi'); } catch (e) { next(e); }
});
