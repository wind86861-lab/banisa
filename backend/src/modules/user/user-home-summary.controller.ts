import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware';
import { sendSuccess } from '../../utils/response';
import prisma from '../../config/database';

/**
 * GET /api/user/home-summary
 * Returns the personalised data for the home page banner:
 *   - next upcoming appointment (any active status)
 *   - cart item count + total price
 */
export const getHomeSummary = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const now = new Date();

        const [nextAppointment, cartItems] = await Promise.all([
            prisma.appointment.findFirst({
                where: {
                    patientId: userId,
                    scheduledAt: { gte: now },
                    status: {
                        in: [
                            'PENDING',
                            'OPERATOR_CONFIRMED',
                            'SENT_TO_CLINIC',
                            'CLINIC_ACCEPTED',
                            'PENDING_ARRIVAL',
                            'PAID',
                            'CHECKED_IN',
                        ],
                    },
                },
                orderBy: { scheduledAt: 'asc' },
                select: {
                    id: true,
                    bookingNumber: true,
                    scheduledAt: true,
                    status: true,
                    finalPrice: true,
                    price: true,
                    serviceType: true,
                    clinic: { select: { id: true, nameUz: true, logo: true, district: true } },
                    diagnosticService: { select: { id: true, nameUz: true } },
                    surgicalService: { select: { id: true, nameUz: true } },
                },
            }),
            prisma.cartItem.findMany({
                where: { userId },
                select: { id: true, quantity: true, serviceType: true, serviceId: true, clinicId: true },
            }),
        ]);

        // Compute approximate cart total — fetch service prices in batch
        let cartTotal = 0;
        if (cartItems.length > 0) {
            const diagnosticIds = cartItems.filter((i) => i.serviceType === 'DIAGNOSTIC').map((i) => i.serviceId);
            const surgicalIds = cartItems.filter((i) => i.serviceType === 'SURGICAL').map((i) => i.serviceId);
            const checkupIds = cartItems.filter((i) => i.serviceType === 'CHECKUP').map((i) => i.serviceId);
            const sanatoriumIds = cartItems.filter((i) => i.serviceType === 'SANATORIUM').map((i) => i.serviceId);

            const [d, s, c, sa] = await Promise.all([
                diagnosticIds.length
                    ? prisma.diagnosticService.findMany({
                          where: { id: { in: diagnosticIds } },
                          select: { id: true, priceRecommended: true, priceMin: true },
                      })
                    : Promise.resolve([]),
                surgicalIds.length
                    ? prisma.surgicalService.findMany({
                          where: { id: { in: surgicalIds } },
                          select: { id: true, priceRecommended: true, priceMin: true },
                      })
                    : Promise.resolve([]),
                checkupIds.length
                    ? prisma.checkupPackage.findMany({
                          where: { id: { in: checkupIds } },
                          select: { id: true, recommendedPrice: true },
                      })
                    : Promise.resolve([]),
                sanatoriumIds.length
                    ? prisma.sanatoriumService.findMany({
                          where: { id: { in: sanatoriumIds } },
                          select: { id: true, priceRecommended: true, priceMin: true },
                      })
                    : Promise.resolve([]),
            ]);

            const priceMap = new Map<string, number>();
            for (const x of d) priceMap.set(x.id, (x as any).priceRecommended || (x as any).priceMin || 0);
            for (const x of s) priceMap.set(x.id, (x as any).priceRecommended || (x as any).priceMin || 0);
            for (const x of c) priceMap.set(x.id, (x as any).recommendedPrice || 0);
            for (const x of sa) priceMap.set(x.id, (x as any).priceRecommended || (x as any).priceMin || 0);

            for (const item of cartItems) {
                cartTotal += (priceMap.get(item.serviceId) || 0) * (item.quantity || 1);
            }
        }

        sendSuccess(res, {
            nextAppointment: nextAppointment
                ? {
                      id: nextAppointment.id,
                      bookingNumber: nextAppointment.bookingNumber,
                      scheduledAt: nextAppointment.scheduledAt,
                      status: nextAppointment.status,
                      price: nextAppointment.finalPrice || nextAppointment.price,
                      serviceName:
                          (nextAppointment as any).diagnosticService?.nameUz ||
                          (nextAppointment as any).surgicalService?.nameUz ||
                          'Xizmat',
                      clinic: nextAppointment.clinic,
                  }
                : null,
            cart: {
                itemCount: cartItems.reduce((s, i) => s + (i.quantity || 1), 0),
                total: cartTotal,
            },
        });
    } catch (err) {
        next(err);
    }
};
