import { Request, Response, NextFunction } from 'express';
import { ClinicStatus, ClinicType } from '@prisma/client';
import prisma from '../../config/database';

// ─── HELPERS ────────────────────────────────────────────────────────────────

const formatPhones = (phones: any): string[] => {
    if (!phones) return [];
    try {
        const arr = Array.isArray(phones) ? phones : JSON.parse(String(phones));
        return arr.map((p: string) => {
            const clean = String(p).replace(/\D/g, '');
            if (clean.length === 12 && clean.startsWith('998')) {
                return `+${clean.slice(0, 3)} ${clean.slice(3, 5)} ${clean.slice(5, 8)} ${clean.slice(8, 10)} ${clean.slice(10)}`;
            }
            return p;
        });
    } catch { return []; }
};

const UZ_TO_EN_DAYS: Record<string, string> = {
    'dushanba': 'monday', 'seshanba': 'tuesday', 'chorshanba': 'wednesday',
    'payshanba': 'thursday', 'juma': 'friday', 'shanba': 'saturday', 'yakshanba': 'sunday',
};

const normalizeWorkingHours = (raw: any): Record<string, any> => {
    // Handle old array format: [{day:"Dushanba", from:"08:00", to:"18:00"}]
    if (Array.isArray(raw)) {
        const result: Record<string, any> = {};
        for (const item of raw) {
            const key = UZ_TO_EN_DAYS[String(item.day || '').toLowerCase()];
            if (key) result[key] = { start: item.from || '08:00', end: item.to || '18:00', isDayOff: false };
        }
        return result;
    }
    // Handle nested { schedule: {...} } format
    if (raw && raw.schedule && typeof raw.schedule === 'object') return raw.schedule;
    return raw || {};
};

const checkIsOpen = (workingHours: any): boolean => {
    if (!workingHours) return false;
    try {
        const raw = typeof workingHours === 'string' ? JSON.parse(workingHours) : workingHours;
        const wh = normalizeWorkingHours(raw);
        const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const today = days[new Date().getDay()];
        const now = new Date().toTimeString().slice(0, 5);
        const d = wh[today];
        if (!d) return false;
        const isDayOff = d.isDayOff !== undefined ? d.isDayOff : (d.isWorking !== undefined ? !d.isWorking : (d.isOpen !== undefined ? !d.isOpen : false));
        if (isDayOff) return false;
        const open = d.open ?? d.start ?? d.openTime ?? '08:00';
        const close = d.close ?? d.end ?? d.closeTime ?? '18:00';
        if (!open || !close) return false;
        return now >= open && now <= close;
    } catch { return false; }
};

// ─── GET PUBLIC CLINICS LIST ─────────────────────────────────────────────────

export const getPublicClinics = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const {
            search, city, type, rating,
            isOpen, sort = 'rating',
            page = '1', limit = '12',
        } = req.query;

        const skip = (Number(page) - 1) * Number(limit);

        const where: any = {
            status: ClinicStatus.APPROVED,
            isActive: true,
        };

        if (search && String(search).length >= 2) {
            where.OR = [
                { nameUz: { contains: String(search), mode: 'insensitive' } },
                { nameRu: { contains: String(search), mode: 'insensitive' } },
                { district: { contains: String(search), mode: 'insensitive' } },
                { street: { contains: String(search), mode: 'insensitive' } },
            ];
        }

        if (city) {
            const cityStr = Array.isArray(city) ? city[0] : String(city);
            where.region = { contains: cityStr, mode: 'insensitive' as const };
        }

        if (type && Object.values(ClinicType).includes(type as ClinicType)) {
            where.type = type as ClinicType;
        }

        if (rating) {
            where.averageRating = { gte: Number(rating) };
        }

        let orderBy: any = { averageRating: 'desc' };
        if (sort === 'name') orderBy = { nameUz: 'asc' };
        if (sort === 'newest') orderBy = { createdAt: 'desc' };

        const [clinics, total] = await Promise.all([
            prisma.clinic.findMany({
                where,
                skip,
                take: Number(limit),
                orderBy,
                select: {
                    id: true, nameUz: true, nameRu: true, type: true,
                    logo: true, coverImage: true,
                    region: true, district: true, street: true,
                    phones: true, workingHours: true,
                    hasEmergency: true, hasAmbulance: true,
                    hasOnlineBooking: true, parkingAvailable: true,
                    averageRating: true, reviewCount: true, description: true,
                    _count: {
                        select: {
                            diagnosticServices: { where: { isActive: true } },
                            surgicalServices: { where: { isActive: true } },
                            checkupPackages: { where: { isActive: true } },
                            appointments: { where: { status: 'CONFIRMED' } },
                        },
                    },
                },
            }),
            prisma.clinic.count({ where }),
        ]);

        let formatted = clinics.map((c: any) => ({
            ...c,
            phones: formatPhones(c.phones),
            isOpen: checkIsOpen(c.workingHours),
            serviceCount:
                c._count.diagnosticServices +
                c._count.surgicalServices +
                c._count.checkupPackages,
            appointmentCount: c._count.appointments,
        }));

        if (isOpen === 'true') {
            formatted = formatted.filter((c: any) => c.isOpen);
        }

        const effectiveTotal = isOpen === 'true' ? formatted.length : total;

        res.json({
            success: true,
            data: formatted,
            meta: {
                total: effectiveTotal,
                page: Number(page),
                limit: Number(limit),
                totalPages: Math.ceil(effectiveTotal / Number(limit)),
            },
        });
    } catch (error) {
        next(error);
    }
};

// ─── GET PUBLIC CLINIC DETAIL ────────────────────────────────────────────────

export const getPublicClinicDetail = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const clinicId = Array.isArray(id) ? id[0] : id;

        const clinic = await prisma.clinic.findFirst({
            where: { id: clinicId, status: ClinicStatus.APPROVED, isActive: true },
            include: {
                diagnosticServices: {
                    where: { isActive: true },
                    include: {
                        diagnosticService: {
                            select: {
                                id: true, nameUz: true, nameRu: true,
                                priceMin: true, priceRecommended: true, durationMinutes: true,
                                category: { select: { id: true, nameUz: true } },
                            },
                        },
                        customization: {
                            select: {
                                customNameUz: true, customPrice: true,
                                discountPercent: true, estimatedDurationMinutes: true,
                            },
                        },
                    },
                    take: 50,
                },
                surgicalServices: {
                    where: { isActive: true },
                    include: {
                        surgicalService: {
                            select: {
                                id: true, nameUz: true, nameRu: true,
                                priceMin: true, priceRecommended: true, durationMinutes: true,
                                category: { select: { id: true, nameUz: true } },
                            },
                        },
                    },
                    take: 50,
                },
                checkupPackages: {
                    where: { isActive: true },
                    include: {
                        package: {
                            select: {
                                id: true, nameUz: true, nameRu: true,
                                recommendedPrice: true, shortDescription: true, imageUrl: true,
                            },
                        },
                    },
                    take: 20,
                },
                sanatoriumServices: {
                    where: { isActive: true },
                    include: {
                        sanatoriumService: {
                            select: {
                                id: true, nameUz: true, nameRu: true,
                                priceMin: true, priceRecommended: true,
                                category: { select: { id: true, nameUz: true } },
                            },
                        },
                    },
                    take: 20,
                },
                reviews: {
                    where: { isActive: true },
                    orderBy: { createdAt: 'desc' },
                    take: 10,
                    include: {
                        user: { select: { id: true, firstName: true, lastName: true } },
                    },
                },
                _count: {
                    select: {
                        appointments: { where: { status: 'CONFIRMED' } },
                        diagnosticServices: { where: { isActive: true } },
                        surgicalServices: { where: { isActive: true } },
                        checkupPackages: { where: { isActive: true } },
                        sanatoriumServices: { where: { isActive: true } },
                    },
                },
            },
        });

        if (!clinic) {
            return res.status(404).json({ success: false, message: 'Klinika topilmadi' });
        }

        const diagnosticServices = (clinic as any).diagnosticServices.map((link: any) => {
            const s = link.diagnosticService;
            const cust = link.customization;
            const basePrice = s.priceRecommended ?? s.priceMin ?? 0;
            const price = cust?.customPrice ?? basePrice;
            const discount = cust?.discountPercent ?? 0;
            const finalPrice = discount > 0 ? Math.round(price * (1 - discount / 100)) : price;
            return {
                id: s.id,
                type: 'DIAGNOSTIC',
                nameUz: cust?.customNameUz ?? s.nameUz,
                nameRu: s.nameRu,
                category: s.category?.nameUz ?? '',
                price: finalPrice,
                originalPrice: discount > 0 ? price : null,
                discountPercent: discount > 0 ? discount : null,
                duration: cust?.estimatedDurationMinutes ?? s.durationMinutes,
            };
        });

        const surgicalServices = (clinic as any).surgicalServices.map((link: any) => {
            const s = link.surgicalService;
            return {
                id: s.id,
                type: 'SURGICAL',
                nameUz: s.nameUz,
                nameRu: s.nameRu,
                category: s.category?.nameUz ?? '',
                price: s.priceRecommended ?? s.priceMin ?? 0,
                duration: s.durationMinutes,
            };
        });

        const checkupPackages = (clinic as any).checkupPackages.map((link: any) => ({
            id: link.id,
            type: 'CHECKUP',
            nameUz: link.package.nameUz,
            nameRu: link.package.nameRu,
            category: 'Checkup',
            price: link.clinicPrice ?? link.package.recommendedPrice ?? 0,
            description: link.package.shortDescription,
        }));

        const sanatoriumServices = (clinic as any).sanatoriumServices.map((link: any) => ({
            id: link.sanatoriumServiceId,
            type: 'SANATORIUM',
            nameUz: link.customNameUz ?? link.sanatoriumService.nameUz,
            nameRu: link.sanatoriumService.nameRu,
            category: link.sanatoriumService.category?.nameUz ?? '',
            price: link.clinicPrice ?? link.sanatoriumService.priceRecommended ?? 0,
        }));

        const reviews = (clinic as any).reviews;
        const ratingDist: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
        reviews.forEach((r: any) => {
            const key = Math.round(r.rating) as keyof typeof ratingDist;
            if (ratingDist[key] !== undefined) ratingDist[key]++;
        });

        const result = {
            id: clinic.id,
            nameUz: clinic.nameUz,
            nameRu: clinic.nameRu,
            type: clinic.type,
            description: (clinic as any).description,
            logo: clinic.logo,
            coverImage: (clinic as any).coverImage,
            region: clinic.region,
            district: clinic.district,
            street: clinic.street,
            landmark: (clinic as any).landmark,
            latitude: (clinic as any).latitude,
            longitude: (clinic as any).longitude,
            fullAddress: [clinic.region, clinic.district, clinic.street].filter(Boolean).join(', '),
            phones: formatPhones((clinic as any).phones),
            emails: (clinic as any).emails,
            website: (clinic as any).website,
            socialMedia: (clinic as any).socialMedia,
            workingHours: (clinic as any).workingHours,
            isOpen: checkIsOpen((clinic as any).workingHours),
            hasEmergency: (clinic as any).hasEmergency,
            hasAmbulance: (clinic as any).hasAmbulance,
            hasOnlineBooking: (clinic as any).hasOnlineBooking,
            bedsCount: (clinic as any).bedsCount,
            parkingAvailable: (clinic as any).parkingAvailable,
            amenities: (clinic as any).amenities,
            paymentMethods: (clinic as any).paymentMethods,
            insuranceAccepted: (clinic as any).insuranceAccepted,
            averageRating: (clinic as any).averageRating ?? 0,
            reviewCount: (clinic as any).reviewCount ?? 0,
            ratingDistribution: ratingDist,
            diagnosticServices,
            surgicalServices,
            checkupPackages,
            sanatoriumServices,
            serviceCounts: {
                diagnostic: (clinic as any)._count.diagnosticServices,
                surgical: (clinic as any)._count.surgicalServices,
                checkup: (clinic as any)._count.checkupPackages,
                sanatorium: (clinic as any)._count.sanatoriumServices,
                total:
                    (clinic as any)._count.diagnosticServices +
                    (clinic as any)._count.surgicalServices +
                    (clinic as any)._count.checkupPackages +
                    (clinic as any)._count.sanatoriumServices,
            },
            reviews: reviews.map((r: any) => ({
                id: r.id,
                rating: r.rating,
                comment: r.comment,
                createdAt: r.createdAt,
                user: {
                    name: r.user
                        ? `${r.user.firstName ?? ''} ${r.user.lastName ?? ''}`.trim() || 'Foydalanuvchi'
                        : 'Foydalanuvchi',
                    initial: r.user?.firstName?.[0]?.toUpperCase() ?? 'F',
                },
            })),
            confirmedAppointments: (clinic as any)._count.appointments,
        };

        res.json({ success: true, data: result });
    } catch (error) {
        next(error);
    }
};
