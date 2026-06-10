import { Response, NextFunction } from 'express';
import { teamService } from './team.service';
import { sendSuccess } from '../../../utils/response';
import { ClinicRequest } from '../../../middleware/clinic-permission.middleware';

export const listMembers = async (req: ClinicRequest, res: Response, next: NextFunction) => {
    try {
        const data = await teamService.listMembers(req.clinicContext!.clinicId);
        sendSuccess(res, data);
    } catch (e) { next(e); }
};

export const listRoles = async (req: ClinicRequest, res: Response, next: NextFunction) => {
    try {
        const data = await teamService.listRoles(req.clinicContext!.clinicId);
        sendSuccess(res, data);
    } catch (e) { next(e); }
};

export const invite = async (req: ClinicRequest, res: Response, next: NextFunction) => {
    try {
        const data = await teamService.invite({
            clinicId: req.clinicContext!.clinicId,
            invitedBy: req.user!.id,
            phone: req.body?.phone,
            roleId: req.body?.roleId,
            firstName: req.body?.firstName,
            lastName: req.body?.lastName,
        });
        sendSuccess(res, data, undefined, 'A\'zo qo\'shildi', 201);
    } catch (e) { next(e); }
};

export const changeRole = async (req: ClinicRequest, res: Response, next: NextFunction) => {
    try {
        await teamService.changeRole({
            clinicId: req.clinicContext!.clinicId,
            actorId: req.user!.id,
            userId: req.params.userId as string,
            roleId: req.body?.roleId,
        });
        sendSuccess(res, null, undefined, 'Rol o\'zgartirildi');
    } catch (e) { next(e); }
};

export const remove = async (req: ClinicRequest, res: Response, next: NextFunction) => {
    try {
        await teamService.remove({
            clinicId: req.clinicContext!.clinicId,
            actorId: req.user!.id,
            userId: req.params.userId as string,
        });
        sendSuccess(res, null, undefined, 'A\'zo o\'chirildi');
    } catch (e) { next(e); }
};

export const leave = async (req: ClinicRequest, res: Response, next: NextFunction) => {
    try {
        await teamService.leave({
            clinicId: req.clinicContext!.clinicId,
            userId: req.user!.id,
        });
        sendSuccess(res, null, undefined, 'Klinikadan chiqdingiz');
    } catch (e) { next(e); }
};

/**
 * Reports the caller's own context (which clinic they're acting in, which
 * role, which permissions). The /clinic/team UI uses this to decide which
 * action buttons to render.
 */
export const whoami = async (req: ClinicRequest, res: Response, next: NextFunction) => {
    try {
        sendSuccess(res, req.clinicContext);
    } catch (e) { next(e); }
};

export const botLink = async (req: ClinicRequest, res: Response, next: NextFunction) => {
    try {
        const data = await teamService.generateBindLinkFor({
            clinicId: req.clinicContext!.clinicId,
            actorId: req.user!.id,
            userId: req.params.userId as string,
        });
        sendSuccess(res, data, undefined, 'Bot link yaratildi');
    } catch (e) { next(e); }
};
