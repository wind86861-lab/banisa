import { Request, Response } from 'express';
import { createClinicRegistration } from './clinic-registration.service';

export const clinicRegisterController = async (req: Request, res: Response) => {
  try {
    // DEBUG LOG — remove after fixing
    console.log('=== CLINIC REGISTER INCOMING ===');
    console.log('persons count:', req.body?.persons?.length);
    console.log('persons[0]:', JSON.stringify(req.body?.persons?.[0], null, 2));
    console.log('foundedYear:', req.body?.foundedYear, typeof req.body?.foundedYear);
    console.log('required fields check:', {
      nameUz: !!req.body?.nameUz,
      clinicType: !!req.body?.clinicType,
      descriptionUz: !!req.body?.descriptionUz,
      regionId: !!req.body?.regionId,
      primaryPhone: !!req.body?.primaryPhone,
      licenseNumber: !!req.body?.licenseNumber,
      inn: !!req.body?.inn,
      bankName: !!req.body?.bankName,
    });
    console.log('================================');

    const result = await createClinicRegistration(req.body);

    return res.status(201).json({
      success: true,
      message: 'Ariza muvaffaqiyatli yuborildi',
      data: result,
    });
  } catch (error: any) {
    // DETAILED ERROR LOG
    console.error('=== REGISTER ERROR ===');
    console.error('message:', error.message);
    console.error('prisma code:', error.code);
    console.error('prisma meta:', JSON.stringify(error.meta, null, 2));
    console.error('stack:', error.stack?.split('\n').slice(0, 5).join('\n'));
    console.error('======================');

    return res.status(error.statusCode ?? 500).json({
      success: false,
      error: error.message ?? 'Server xatosi',
      ...(process.env.NODE_ENV === 'development' && {
        detail: error.meta ?? error.code
      }),
    });
  }
};
