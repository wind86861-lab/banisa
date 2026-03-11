import { Response } from 'express';
import prisma from '../../config/database';
import { AuthRequest } from '../../middleware/auth.middleware';

export const getClinicMe = async (req: AuthRequest, res: Response) => {
    const user = await prisma.user.findUnique({
        where: { id: req.user!.id },
        select: {
            id: true,
            phone: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            status: true,
            clinicId: true,
        },
    });

    let clinic = null;
    if (user?.clinicId) {
        clinic = await prisma.clinic.findUnique({
            where: { id: user.clinicId },
            select: {
                id: true,
                nameUz: true,
                nameRu: true,
                type: true,
                status: true,
                averageRating: true,
                reviewCount: true,
            },
        });
    }

    return res.json({ success: true, data: { user, clinic } });
};
