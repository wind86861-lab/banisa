import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware';
import * as service from './clinic-registration.service';
import { sendSuccess } from '../../utils/response';

export const getAllRegistrations = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const status = req.query.status as string | undefined;
    const registrations = await service.getAllRegistrations(status);
    sendSuccess(res, registrations);
  } catch (error) {
    next(error);
  }
};

export const getRegistrationById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const registration = await service.getRegistrationById(req.params.id as string);
    sendSuccess(res, registration);
  } catch (error) {
    next(error);
  }
};

export const reviewRegistration = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await service.reviewRegistration(req.params.id as string);
    sendSuccess(res, result, null, 'Ariza ko\'rib chiqish boshlandi');
  } catch (error) {
    next(error);
  }
};

export const approveRegistration = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await service.approveRegistration(req.params.id as string);
    sendSuccess(res, result, null, 'Ariza tasdiqlandi');
  } catch (error) {
    next(error);
  }
};

export const rejectRegistration = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { reason } = req.body;
    const result = await service.rejectRegistration(req.params.id as string, reason);
    sendSuccess(res, result, null, 'Ariza rad etildi');
  } catch (error) {
    next(error);
  }
};
