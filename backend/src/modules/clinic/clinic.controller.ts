import { Response } from 'express';
import prisma from '../../config/database';
import { AuthRequest } from '../../middleware/auth.middleware';
import { resolveUserClinicId } from './clinic-context.util';

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

    // Membership-aware: secondary admins have clinicId=null and reach the
    // clinic only via ClinicMembership, so resolve it that way for display.
    const clinicId = await resolveUserClinicId(req.user!.id);
    let clinic = null;
    if (clinicId) {
        clinic = await prisma.clinic.findUnique({
            where: { id: clinicId },
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
