import prisma from '../../config/database';
import { AppError, ErrorCodes } from '../../utils/errors';
import { dispatch as dispatchNotification } from '../notifications/notification.dispatcher';
import { broadcastBookingById } from '../telegram/admin-broadcast.service';
import { assertWithinWorkingHours } from '../clinics/working-hours.util';

export class CartService {
    async addToCart(userId: string, data: {
        clinicId: string;
        serviceType: 'DIAGNOSTIC' | 'SURGICAL' | 'SANATORIUM' | 'CHECKUP' | 'AMBULANCE';
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
            case 'AMBULANCE':
                service = await prisma.ambulance.findUnique({ where: { id: data.serviceId } });
                if (service && (service as any).clinicId !== data.clinicId) service = null;
                break;
        }
        if (!service) throw new AppError('Xizmat topilmadi', 404, ErrorCodes.NOT_FOUND);

        // Temporary policy: cart may only hold items from ONE clinic at a time.
        // Matches the checkout-side block; here we stop the conflict at the door.
        const existing = await prisma.cartItem.findFirst({
            where: { userId, NOT: { clinicId: data.clinicId } },
            select: { clinicId: true, clinic: { select: { nameUz: true } } },
        });
        if (existing) {
            throw new AppError(
                `Savatingizda allaqachon boshqa klinika ("${existing.clinic?.nameUz ?? ''}") xizmatlari bor. Bir vaqtning o'zida faqat bitta klinikadan bron qilish mumkin. Avval savatni tozalang yoki o'sha klinika xizmatlarini olib tashlang.`,
                409,
                ErrorCodes.VALIDATION_ERROR,
            );
        }

        // Atomic upsert — prevents race conditions on rapid double-click
        return prisma.cartItem.upsert({
            where: {
                userId_clinicId_serviceType_serviceId: {
                    userId,
                    clinicId: data.clinicId,
                    serviceType: data.serviceType,
                    serviceId: data.serviceId,
                },
            },
            update: {
                quantity: { increment: data.quantity ?? 1 },
            },
            create: {
                userId,
                clinicId: data.clinicId,
                serviceType: data.serviceType,
                serviceId: data.serviceId,
                quantity: data.quantity ?? 1,
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
                let service: any;
                let customization: { customPrice: number | null; discountPercent: number | null } | null = null;

                switch (item.serviceType) {
                    case 'DIAGNOSTIC':
                        service = await prisma.diagnosticService.findUnique({
                            where: { id: item.serviceId },
                            include: { category: { select: { nameUz: true, nameRu: true } } },
                        });
                        // Look up clinic-specific customization (customPrice / discountPercent)
                        {
                            const link = await prisma.clinicDiagnosticService.findUnique({
                                where: {
                                    clinicId_diagnosticServiceId: {
                                        clinicId: item.clinicId,
                                        diagnosticServiceId: item.serviceId,
                                    },
                                },
                                include: { customization: { select: { customPrice: true, discountPercent: true } } },
                            });
                            if (link?.customization) {
                                customization = {
                                    customPrice: link.customization.customPrice,
                                    discountPercent: link.customization.discountPercent,
                                };
                            }
                        }
                        break;
                    case 'SURGICAL':
                        service = await prisma.surgicalService.findUnique({
                            where: { id: item.serviceId },
                            include: { category: { select: { nameUz: true, nameRu: true } } },
                        });
                        {
                            const link = await prisma.clinicSurgicalService.findUnique({
                                where: {
                                    clinicId_surgicalServiceId: {
                                        clinicId: item.clinicId,
                                        surgicalServiceId: item.serviceId,
                                    },
                                },
                            });
                            if (link) {
                                const cust = (link as any).customizationData || {};
                                customization = {
                                    customPrice: cust.customPrice ?? null,
                                    discountPercent: cust.discountPercent ?? null,
                                };
                            }
                        }
                        break;
                    case 'SANATORIUM':
                        service = await prisma.sanatoriumService.findUnique({
                            where: { id: item.serviceId },
                            include: { category: { select: { nameUz: true, nameRu: true } } },
                        });
                        {
                            const link = await prisma.clinicSanatoriumService.findUnique({
                                where: {
                                    clinicId_sanatoriumServiceId: {
                                        clinicId: item.clinicId,
                                        sanatoriumServiceId: item.serviceId,
                                    },
                                },
                            });
                            if (link) {
                                customization = {
                                    customPrice: link.clinicPrice ?? null,
                                    discountPercent: link.discountPercent ?? null,
                                };
                            }
                        }
                        break;
                    case 'CHECKUP':
                        service = await prisma.checkupPackage.findUnique({
                            where: { id: item.serviceId },
                        });
                        {
                            const link = await prisma.clinicCheckupPackage.findUnique({
                                where: {
                                    clinicId_packageId: {
                                        clinicId: item.clinicId,
                                        packageId: item.serviceId,
                                    },
                                },
                            });
                            if (link) {
                                customization = {
                                    customPrice: link.clinicPrice ?? null,
                                    discountPercent: null,
                                };
                            }
                        }
                        break;
                    case 'AMBULANCE': {
                        const amb = await prisma.ambulance.findUnique({ where: { id: item.serviceId } });
                        if (amb && amb.clinicId === item.clinicId) {
                            service = {
                                id: amb.id,
                                nameUz: `🆘 Tez yordam — ${amb.callSign}${amb.vehicleModel ? ' (' + amb.vehicleModel + ')' : ''}`,
                                nameRu: `🆘 Скорая — ${amb.callSign}${amb.vehicleModel ? ' (' + amb.vehicleModel + ')' : ''}`,
                                priceRecommended: amb.baseFee || 0,
                                shortDescription: amb.type,
                                imageUrl: amb.photoUrl,
                            } as any;
                        }
                        break;
                    }
                }

                const basePrice = service?.priceRecommended || service?.recommendedPrice || 0;
                const priceMin = service?.priceMin || 0;
                const priceMax = service?.priceMax || 0;

                // Apply clinic customization for diagnostic services
                const customPrice = customization?.customPrice ?? basePrice;
                const discount = customization?.discountPercent ?? 0;
                const finalPrice = discount > 0
                    ? Math.round(customPrice * (1 - discount / 100))
                    : customPrice;

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
                        // priceRecommended carries the effective price the customer pays
                        priceRecommended: finalPrice,
                        basePrice,
                        originalPrice: customPrice !== finalPrice ? customPrice : null,
                        discountPercent: discount > 0 ? discount : null,
                        priceMin,
                        priceMax,
                        shortDescription: service.shortDescription || null,
                        imageUrl: service?.imageUrl || null,
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

    async checkout(userId: string, data: { scheduledAt: string; notes?: string; paymentMethod?: string; ofertaVersionId?: string }) {
        const cartItems = await prisma.cartItem.findMany({
            where: { userId },
            include: { clinic: true },
        });

        if (cartItems.length === 0) {
            throw new AppError('Savat bo\'sh', 400, ErrorCodes.VALIDATION_ERROR);
        }

        // Oferta gate: bemor faol versiyaga rozi bo'lishi kerak (mavjud bo'lsa).
        const activeOferta = await prisma.ofertaVersion.findFirst({
            where: { isActive: true },
            select: { id: true },
        });
        let ofertaVersionId: string | null = null;
        let ofertaAcceptedAt: Date | null = null;
        if (activeOferta) {
            if (!data.ofertaVersionId || data.ofertaVersionId !== activeOferta.id) {
                throw new AppError(
                    "Buyurtma berish uchun ommaviy oferta shartlariga rozi bo'lishingiz kerak.",
                    400,
                    ErrorCodes.VALIDATION_ERROR,
                );
            }
            ofertaVersionId = activeOferta.id;
            ofertaAcceptedAt = new Date();
        }

        // Temporary policy: one booking may only span ONE clinic.
        // Prevents patient confusion until multi-clinic UX is properly designed.
        const distinctClinicIds = new Set(cartItems.map(i => i.clinicId));
        if (distinctClinicIds.size > 1) {
            throw new AppError(
                "Bitta bron faqat bitta klinikadan bo'lishi mumkin. Boshqa klinika xizmatlarini savatdan olib tashlang.",
                400,
                ErrorCodes.VALIDATION_ERROR,
            );
        }

        // Working-hours gate (server-side defense). The cart UI already
        // clamps the time picker but a manual API call could still ship a
        // time outside the clinic's hours. Emergency ambulance calls
        // bypass the gate — they're 24/7 by definition.
        const hasAmbulance = cartItems.some(i => (i.serviceType as any) === 'AMBULANCE');
        if (!hasAmbulance) {
            assertWithinWorkingHours(cartItems[0].clinic, new Date(data.scheduledAt));
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
            // Calculate total price for this clinic group + collect every
            // service name so the clinic notification can list what the
            // patient actually booked (not just "1 ta xizmat"). itemBreakdown
            // also captures per-item prices so we can persist a row per
            // service into AppointmentService below — without that, only
            // the first cart item ever made it onto the booking and the
            // others vanished.
            let totalPrice = 0;
            const serviceNames: string[] = [];
            const itemBreakdown: Array<{
                serviceType: 'DIAGNOSTIC' | 'SURGICAL' | 'SANATORIUM' | 'CHECKUP' | 'AMBULANCE';
                originalServiceId: string;
                serviceName: string;
                basePrice: number;
                finalPrice: number;
                discountAmount: number;
                quantity: number;
            }> = [];
            for (const item of items) {
                let service: any;
                let customization: { customPrice: number | null; discountPercent: number | null } | null = null;
                switch (item.serviceType) {
                    case 'DIAGNOSTIC':
                        service = await prisma.diagnosticService.findUnique({ where: { id: item.serviceId } });
                        {
                            const link = await prisma.clinicDiagnosticService.findUnique({
                                where: {
                                    clinicId_diagnosticServiceId: {
                                        clinicId: item.clinicId,
                                        diagnosticServiceId: item.serviceId,
                                    },
                                },
                                include: { customization: { select: { customPrice: true, discountPercent: true } } },
                            });
                            if (link?.customization) {
                                customization = {
                                    customPrice: link.customization.customPrice,
                                    discountPercent: link.customization.discountPercent,
                                };
                            }
                        }
                        break;
                    case 'SURGICAL':
                        service = await prisma.surgicalService.findUnique({ where: { id: item.serviceId } });
                        {
                            const link = await prisma.clinicSurgicalService.findUnique({
                                where: {
                                    clinicId_surgicalServiceId: {
                                        clinicId: item.clinicId,
                                        surgicalServiceId: item.serviceId,
                                    },
                                },
                            });
                            if (link) {
                                const cust = (link as any).customizationData || {};
                                customization = {
                                    customPrice: cust.customPrice ?? null,
                                    discountPercent: cust.discountPercent ?? null,
                                };
                            }
                        }
                        break;
                    case 'SANATORIUM':
                        service = await prisma.sanatoriumService.findUnique({ where: { id: item.serviceId } });
                        {
                            const link = await prisma.clinicSanatoriumService.findUnique({
                                where: {
                                    clinicId_sanatoriumServiceId: {
                                        clinicId: item.clinicId,
                                        sanatoriumServiceId: item.serviceId,
                                    },
                                },
                            });
                            if (link) {
                                customization = {
                                    customPrice: link.clinicPrice ?? null,
                                    discountPercent: link.discountPercent ?? null,
                                };
                            }
                        }
                        break;
                    case 'CHECKUP':
                        service = await prisma.checkupPackage.findUnique({ where: { id: item.serviceId } });
                        {
                            const link = await prisma.clinicCheckupPackage.findUnique({
                                where: {
                                    clinicId_packageId: {
                                        clinicId: item.clinicId,
                                        packageId: item.serviceId,
                                    },
                                },
                            });
                            if (link) {
                                customization = {
                                    customPrice: link.clinicPrice ?? null,
                                    discountPercent: null,
                                };
                            }
                        }
                        break;
                    case 'AMBULANCE': {
                        const amb = await prisma.ambulance.findUnique({ where: { id: item.serviceId } });
                        if (amb && amb.clinicId === item.clinicId) {
                            // Synthesize a service-shaped record so the common
                            // pricing path below works untouched. Base fee is
                            // the chaqiruv price; per-km is charged after the
                            // dispatch resolves real distance.
                            service = {
                                nameUz: `🆘 Tez yordam — ${amb.callSign}${amb.vehicleModel ? ' (' + amb.vehicleModel + ')' : ''}`,
                                priceRecommended: amb.baseFee || 0,
                            } as any;
                        }
                        break;
                    }
                }
                if (service) {
                    const basePrice = service.priceRecommended || service.recommendedPrice || 0;
                    const cp = customization?.customPrice ?? basePrice;
                    const disc = customization?.discountPercent ?? 0;
                    const finalPrice = disc > 0 ? Math.round(cp * (1 - disc / 100)) : cp;
                    totalPrice += finalPrice * item.quantity;
                    const name = service.nameUz || service.nameRu || service.title || 'Xizmat';
                    serviceNames.push(item.quantity > 1 ? `${name} ×${item.quantity}` : name);
                    itemBreakdown.push({
                        serviceType: item.serviceType as any,
                        originalServiceId: item.serviceId,
                        serviceName: name,
                        basePrice: cp,
                        finalPrice,
                        discountAmount: Math.max(0, cp - finalPrice),
                        quantity: item.quantity,
                    });
                }
            }

            // Use the first item's service as the primary for the appointment
            const primaryItem = items[0];
            const bookingNumber = `BN-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
            const qrToken = `${bookingNumber}-${require('crypto').randomBytes(16).toString('hex')}`;

            // The cart carries 4 service-type tags, but Prisma's
            // AppointmentServiceType enum only has DIAGNOSTIC/SURGICAL/OTHER.
            // SANATORIUM + CHECKUP fall through to OTHER so the insert
            // doesn't blow up with "Expected AppointmentServiceType".
            const toAppointmentEnum = (t: string): 'DIAGNOSTIC' | 'SURGICAL' | 'OTHER' =>
                t === 'DIAGNOSTIC' ? 'DIAGNOSTIC' : t === 'SURGICAL' ? 'SURGICAL' : 'OTHER';

            const isCash = (data.paymentMethod || 'naqd') === 'naqd' || data.paymentMethod === 'CASH';
            const appointmentData: any = {
                patientId: userId,
                clinicId,
                serviceType: toAppointmentEnum(primaryItem.serviceType),
                scheduledAt: new Date(data.scheduledAt),
                price: totalPrice,
                finalPrice: totalPrice,
                notes: data.notes || `Savat orqali buyurtma: ${items.length} ta xizmat`,
                // Both cash and online flows start as PENDING — the clinic
                // accepts before the booking becomes CONFIRMED. Payment
                // mode is tracked separately in paymentMethod.
                status: 'PENDING',
                paymentMethod: isCash ? 'CASH' : undefined,
                bookingNumber,
                qrToken,
                ofertaVersionId,
                ofertaAcceptedAt,
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
                    patient: { select: { firstName: true, lastName: true, phone: true } },
                    diagnosticService: { select: { nameUz: true } },
                    surgicalService: { select: { nameUz: true } },
                },
            });

            // Persist every cart item as an AppointmentService row so the
            // admin drawer (and any future per-item reporting) sees the full
            // basket — not just the "primary" item we wrote onto the
            // appointment's own service-id field. The clinic-side list
            // endpoint already includes appointment.services[].
            if (itemBreakdown.length > 0) {
                await prisma.appointmentService.createMany({
                    data: itemBreakdown.flatMap(it => Array.from({ length: Math.max(1, it.quantity) }).map(() => ({
                        appointmentId: appointment.id,
                        serviceType: toAppointmentEnum(it.serviceType),
                        serviceName: it.serviceName,
                        originalServiceId: it.originalServiceId,
                        price: it.basePrice,
                        finalPrice: it.finalPrice,
                        discountAmount: it.discountAmount,
                    }))),
                });
            }

            appointments.push(appointment);

            // Notify the clinic the same way single-service bookings do.
            // Best-effort — checkout must not break if telegram/SMS hiccups.
            const a = appointment as any;
            const patientName = [a.patient?.firstName, a.patient?.lastName]
                .filter(Boolean).join(' ') || a.patient?.phone || 'Bemor';
            // Prefer the joined service-name list collected above — for cart
            // orders that span multiple items (incl. checkup packages) this
            // shows the clinic exactly what the patient bought rather than
            // a generic "1 ta xizmat" fallback.
            const serviceName = serviceNames.length
                ? serviceNames.join(', ')
                : a.diagnosticService?.nameUz
                    || a.surgicalService?.nameUz
                    || (items.length > 1 ? `${items.length} ta xizmat` : 'Xizmat');
            dispatchNotification({
                type: 'clinic_new_booking',
                clinicId: a.clinicId,
                appointmentId: a.id,
                bookingNumber: a.bookingNumber,
                patientName,
                serviceName,
                appointmentAt: a.scheduledAt,
                finalPrice: a.finalPrice ?? a.price,
                paymentMethod: a.paymentMethod,
                priority: 'HIGH',
                link: `/clinic/bookings?focus=${a.id}`,
            }).catch(e => console.error('[cart.checkout] notify clinic failed:', e));

            // Fire-and-forget broadcast to the super-admin Telegram group.
            broadcastBookingById(a.id).catch(e => console.error('[cart.checkout] admin broadcast failed:', e));
        }

        // Clear cart after successful checkout
        await prisma.cartItem.deleteMany({ where: { userId } });

        return { appointments, count: appointments.length };
    }
}

export const cartService = new CartService();
