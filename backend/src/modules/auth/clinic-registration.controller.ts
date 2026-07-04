import { Request, Response } from 'express';
import { createClinicRegistration } from './clinic-registration.service';

export const clinicRegisterController = async (req: Request, res: Response) => {
  try {
    const result = await createClinicRegistration(req.body);

    return res.status(201).json({
      success: true,
      message: 'Ariza muvaffaqiyatli yuborildi',
      data: result,
    });
  } catch (error: any) {
    console.error('[clinicRegister] failed:', error?.message, error?.code ?? '');

    return res.status(error.statusCode ?? 500).json({
      success: false,
      error: error.message ?? 'Server xatosi',
      ...(process.env.NODE_ENV === 'development' && {
        detail: error.meta ?? error.code
      }),
    });
  }
};
