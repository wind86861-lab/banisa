import prisma from '../../config/database';
import { AppError, ErrorCodes } from '../../utils/errors';

export class CartService {
    async addToCart(userId: string, data: {
        clinicId: string;
        serviceType: 'DIAGNOSTIC' | 'SURGICAL' | 'SANATORIUM' | 'CHECKUP';
        serviceId: string;
        quantity?: number;
    }) {
        const clinic = await prisma.clinic.findUnique({ where: { id: data.clinicId } });
        if (!clinic) throw new AppError('Klinika topilmadi', 404, ErrorCodes.NOT_FOUND);

        let service;
        switch (data.serviceType) {
            case 'DIAGNOSTIC':
                service = await prisma.diagnosticService.findUnique({ where: { id: data.serviceId } });
                break;
            case 'SURGICAL':
                service = await prisma.surgicalService.findUnique({ where: { id: data.serviceId } });
                break;
            case 'SANATORIUM':
                service = await prisma.sanatoriumService.findUnique({ where: { id: data.serviceId } });
                break;
            case 'CHECKUP':
                service = await prisma.checkupPackage.findUnique({ where: { id: data.serviceId } });
                break;
        }
        if (!service) throw new AppError('Xizmat topilmadi', 404, ErrorCodes.NOT_FOUND);

        const existing = await prisma.cartItem.findUnique({
            where: {
                userId_clinicId_serviceType_serviceId: {
                    userId,
                    clinicId: data.clinicId,
                    serviceType: data.serviceType,
                    serviceId: data.serviceId,
                },
            },
        });

        if (existing) {
            return prisma.cartItem.update({
                where: { id: existing.id },
                data: { quantity: data.quantity || existing.quantity + 1 },
            });
        }

        return prisma.cartItem.create({
            data: {
                userId,
                clinicId: data.clinicId,
                serviceType: data.serviceType,
                serviceId: data.serviceId,
                quantity: data.quantity || 1,
            },
        });
    }

    async getCart(userId: string) {
        const cartItems = await prisma.cartItem.findMany({
            where: { userId },
            include: {
                clinic: true,
            },
            orderBy: [
                { clinic: { nameUz: 'asc' } },
                { createdAt: 'asc' },
            ],
        });

        const itemsWithServices = await Promise.all(
            cartItems.map(async (item) => {
                let service;
                switch (item.serviceType) {
                    case 'DIAGNOSTIC':
                        service = await prisma.diagnosticService.findUnique({
                            where: { id: item.serviceId },
                            include: { category: { select: { nameUz: true, nameRu: true } } },
                        });
                        break;
                    case 'SURGICAL':
                        service = await prisma.surgicalService.findUnique({
                            where: { id: item.serviceId },
                            include: { category: { select: { nameUz: true, nameRu: true } } },
                        });
                        break;
                    case 'SANATORIUM':
                        service = await prisma.sanatoriumService.findUnique({
                            where: { id: item.serviceId },
                            include: { category: { select: { nameUz: true, nameRu: true } } },
                        });
                        break;
                    case 'CHECKUP':
                        service = await prisma.checkupPackage.findUnique({
                            where: { id: item.serviceId },
                        });
                        break;
                }

                const priceRec = (service as any)?.priceRecommended || (service as any)?.recommendedPrice || 0;
                const priceMin = (service as any)?.priceMin || 0;
                const priceMax = (service as any)?.priceMax || 0;

                return {
                    id: item.id,
                    quantity: item.quantity,
                    serviceType: item.serviceType,
                    createdAt: item.createdAt,
                    clinic: item.clinic,
                    service: service ? {
                        id: service.id,
                        nameUz: service.nameUz,
                        nameRu: service.nameRu || null,
                        priceRecommended: priceRec,
                        priceMin: priceMin,
                        priceMax: priceMax,
                        shortDescription: service.shortDescription || null,
                        imageUrl: (service as any)?.imageUrl || null,
                        category: 'category' in service ? service.category : null,
                    } : null,
                };
            })
        );

        const groupedByClinic = itemsWithServices.reduce((acc, item) => {
            const clinicId = item.clinic.id;
            if (!acc[clinicId]) {
                acc[clinicId] = {
                    clinic: item.clinic,
                    items: [],
                    totalPrice: 0,
                    itemCount: 0,
                };
            }
            acc[clinicId].items.push(item);
            acc[clinicId].itemCount += item.quantity;
            if (item.service) {
                acc[clinicId].totalPrice += (item.service.priceRecommended || 0) * item.quantity;
            }
            return acc;
        }, {} as Record<string, any>);

        return Object.values(groupedByClinic);
    }

    async removeFromCart(userId: string, cartItemId: string) {
        const item = await prisma.cartItem.findFirst({
            where: { id: cartItemId, userId },
        });
        if (!item) throw new AppError('Savat elementi topilmadi', 404, ErrorCodes.NOT_FOUND);

        return prisma.cartItem.delete({ where: { id: cartItemId } });
    }

    async updateQuantity(userId: string, cartItemId: string, quantity: number) {
        if (quantity < 1) throw new AppError('Miqdor 1 dan kam bo\'lishi mumkin emas', 400, ErrorCodes.VALIDATION_ERROR);

        const item = await prisma.cartItem.findFirst({
            where: { id: cartItemId, userId },
        });
        if (!item) throw new AppError('Savat elementi topilmadi', 404, ErrorCodes.NOT_FOUND);

        return prisma.cartItem.update({
            where: { id: cartItemId },
            data: { quantity },
        });
    }

    async clearCart(userId: string) {
        return prisma.cartItem.deleteMany({ where: { userId } });
    }

    async getCartCount(userId: string) {
        const count = await prisma.cartItem.count({ where: { userId } });
        return { count };
    }

    async checkout(userId: string, data: { scheduledAt: string; notes?: string; paymentMethod?: string }) {
        const cartItems = await prisma.cartItem.findMany({
            where: { userId },
            include: { clinic: true },
        });

        if (cartItems.length === 0) {
            throw new AppError('Savat bo\'sh', 400, ErrorCodes.VALIDATION_ERROR);
        }

        // Group by clinic
        const byClinic = cartItems.reduce((acc, item) => {
            if (!acc[item.clinicId]) acc[item.clinicId] = [];
            acc[item.clinicId].push(item);
            return acc;
        }, {} as Record<string, typeof cartItems>);

        const appointments: any[] = [];

        // Create one appointment per clinic
        for (const [clinicId, items] of Object.entries(byClinic)) {
            // Calculate total price for this clinic group
            let totalPrice = 0;
            for (const item of items) {
                let service: any;
                switch (item.serviceType) {
                    case 'DIAGNOSTIC':
                        service = await prisma.diagnosticService.findUnique({ where: { id: item.serviceId } });
                        break;
                    case 'SURGICAL':
                        service = await prisma.surgicalService.findUnique({ where: { id: item.serviceId } });
                        break;
                    case 'SANATORIUM':
                        service = await prisma.sanatoriumService.findUnique({ where: { id: item.serviceId } });
                        break;
                    case 'CHECKUP':
                        service = await prisma.checkupPackage.findUnique({ where: { id: item.serviceId } });
                        break;
                }
                if (service) {
                    totalPrice += (service.priceRecommended || service.recommendedPrice || 0) * item.quantity;
                }
            }

            // Use the first item's service as the primary for the appointment
            const primaryItem = items[0];
            const bookingNumber = `BN-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
            const qrToken = `${bookingNumber}-${require('crypto').randomBytes(16).toString('hex')}`;

            const appointmentData: any = {
                patientId: userId,
                clinicId,
                serviceType: primaryItem.serviceType,
                scheduledAt: new Date(data.scheduledAt),
                price: totalPrice,
                notes: data.notes || `Savat orqali buyurtma: ${items.length} ta xizmat. To'lov: ${data.paymentMethod || 'naqd'}`,
                status: 'PENDING',
                bookingNumber,
                qrToken,
            };

            // Set the appropriate service ID field
            if (primaryItem.serviceType === 'DIAGNOSTIC') {
                appointmentData.diagnosticServiceId = primaryItem.serviceId;
            } else if (primaryItem.serviceType === 'SURGICAL') {
                appointmentData.surgicalServiceId = primaryItem.serviceId;
            }

            const appointment = await prisma.appointment.create({
                data: appointmentData,
                include: {
                    clinic: { select: { id: true, nameUz: true, nameRu: true } },
                },
            });

            appointments.push(appointment);
        }

        // Clear cart after successful checkout
        await prisma.cartItem.deleteMany({ where: { userId } });

        return { appointments, count: appointments.length };
    }
}

export const cartService = new CartService();
