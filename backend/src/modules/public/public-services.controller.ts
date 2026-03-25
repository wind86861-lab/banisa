import { Request, Response, NextFunction } from 'express';
import { ClinicStatus } from '@prisma/client';
import prisma from '../../config/database';
import { getServiceById as getDiagnosticById } from '../diagnostics/diagnostics.service';

const CLINIC_SELECT = {
    id: true,
    nameUz: true,
    region: true,
    district: true,
    street: true,
    phones: true,
    logo: true,
    averageRating: true,
    reviewCount: true,
};

export const getPublicServices = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const [diagnosticLinks, surgicalLinks, sanatoriumLinks, checkupLinks] = await Promise.all([
            prisma.clinicDiagnosticService.findMany({
                where: { isActive: true, clinic: { status: ClinicStatus.APPROVED }, diagnosticService: { isActive: true } },
                include: {
                    clinic: { select: CLINIC_SELECT },
                    diagnosticService: {
                        include: { category: { select: { id: true, nameUz: true } } },
                    },
                    customization: {
                        include: { images: { orderBy: { order: 'asc' } } },
                    },
                },
            }),

            prisma.clinicSurgicalService.findMany({
                where: { isActive: true, clinic: { status: ClinicStatus.APPROVED } },
                include: {
                    clinic: { select: CLINIC_SELECT },
                    surgicalService: {
                        include: { category: { select: { id: true, nameUz: true } } },
                    },
                },
            }),

            prisma.clinicSanatoriumService.findMany({
                where: { isActive: true, clinic: { status: ClinicStatus.APPROVED } },
                include: {
                    clinic: { select: CLINIC_SELECT },
                    sanatoriumService: {
                        include: { category: { select: { id: true, nameUz: true } } },
                    },
                },
            }),

            prisma.clinicCheckupPackage.findMany({
                where: { isActive: true, clinic: { status: ClinicStatus.APPROVED } },
                include: {
                    clinic: { select: CLINIC_SELECT },
                    package: true,
                },
            }),
        ]);

        const formatClinic = (c: typeof diagnosticLinks[0]['clinic']) => ({
            id: c.id,
            name: c.nameUz,
            region: c.region,
            district: c.district,
            address: `${c.region}, ${c.district}, ${c.street}`,
            phones: c.phones as string[],
            logo: c.logo,
        });

        const services = [
            ...diagnosticLinks.map(link => {
                const s = link.diagnosticService;
                const cust = link.customization;
                const images = cust?.images?.map(img => {
                    const url = img.url;
                    return url.startsWith('http') ? url : `http://localhost:5000${url}`;
                }) ?? [];
                const originalPrice = s.priceRecommended ?? s.priceMin ?? 0;
                const customPrice = cust?.customPrice ?? originalPrice;
                const discount = cust?.discountPercent ?? 0;
                const finalPrice = discount > 0 ? Math.round(customPrice * (1 - discount / 100)) : customPrice;

                return {
                    id: s.id,
                    category: 'diagnostika',
                    title: cust?.customNameUz ?? s.nameUz,
                    customNameUz: cust?.customNameUz,
                    desc: cust?.customDescriptionUz ?? s.shortDescription ?? '',
                    fullDescription: s.shortDescription ?? '',
                    specialty: s.category?.nameUz ?? 'Umumiy',
                    price: finalPrice,
                    originalPrice: customPrice !== finalPrice ? customPrice : null,
                    discountPercent: discount > 0 ? discount : null,
                    rating: link.clinic.averageRating ?? 0,
                    reviews: link.clinic.reviewCount ?? 0,
                    duration: cust?.estimatedDurationMinutes
                        ? `${cust.estimatedDurationMinutes} daqiqa`
                        : s.durationMinutes ? `${s.durationMinutes} daqiqa` : '',
                    availability: ['offline'],
                    images,
                    tags: cust?.tags ?? [],
                    benefits: (cust?.benefits as string[] | null) ?? [],
                    preparationUz: cust?.preparationUz,
                    customCategory: cust?.customCategory,
                    isHighlighted: cust?.isHighlighted ?? false,
                    requiresAppointment: cust?.requiresAppointment ?? true,
                    clinic: formatClinic(link.clinic),
                };
            }),

            ...surgicalLinks.map(link => {
                const s = link.surgicalService;
                const mins = s.durationMinutes;
                const duration = mins >= 60 ? `${Math.round(mins / 60)} soat` : `${mins} daqiqa`;
                return {
                    id: `surgical-${link.clinicId}-${link.surgicalServiceId}`,
                    category: 'operatsiya',
                    title: s.nameUz,
                    desc: s.shortDescription ?? '',
                    fullDescription: s.shortDescription ?? '',
                    specialty: s.category?.nameUz ?? 'Jarrohlik',
                    price: s.priceRecommended ?? s.priceMin ?? 0,
                    rating: link.clinic.averageRating ?? 0,
                    reviews: link.clinic.reviewCount ?? 0,
                    duration,
                    availability: ['offline'],
                    images: s.imageUrl ? [s.imageUrl.startsWith('http') ? s.imageUrl : `http://localhost:5000${s.imageUrl}`] : [],
                    tags: [],
                    benefits: [],
                    clinic: formatClinic(link.clinic),
                };
            }),

            ...sanatoriumLinks.map(link => {
                const s = link.sanatoriumService;
                const roomImgs = ((link.roomImages as string[] | null) ?? []).map(url =>
                    url.startsWith('http') ? url : `http://localhost:5000${url}`
                );
                const mainImg = s.imageUrl ? (s.imageUrl.startsWith('http') ? s.imageUrl : `http://localhost:5000${s.imageUrl}`) : null;
                const images = mainImg ? [mainImg, ...roomImgs] : roomImgs;
                const duration = s.durationDays
                    ? `${s.durationDays} kun`
                    : s.durationMinutes
                        ? `${s.durationMinutes} daqiqa`
                        : '';
                return {
                    id: `sanatorium-${link.clinicId}-${link.sanatoriumServiceId}`,
                    category: 'sanatoriya',
                    title: link.customNameUz ?? s.nameUz,
                    desc: link.customDescription ?? s.shortDescription ?? '',
                    fullDescription: s.shortDescription ?? '',
                    specialty: s.category?.nameUz ?? 'Sanatoriya',
                    price: link.clinicPrice ?? s.priceRecommended ?? s.priceMin ?? 0,
                    rating: link.clinic.averageRating ?? 0,
                    reviews: link.clinic.reviewCount ?? 0,
                    duration,
                    availability: ['offline'],
                    images,
                    tags: [],
                    benefits: [],
                    clinic: formatClinic(link.clinic),
                };
            }),

            ...checkupLinks.map(link => {
                const p = link.package;
                return {
                    id: link.id,
                    category: 'checkup',
                    title: p.nameUz,
                    desc: p.shortDescription ?? '',
                    fullDescription: p.fullDescription ?? p.shortDescription ?? '',
                    specialty: 'Checkup',
                    price: link.clinicPrice ?? p.recommendedPrice ?? 0,
                    rating: link.clinic.averageRating ?? 0,
                    reviews: link.clinic.reviewCount ?? 0,
                    duration: '1 kun',
                    availability: ['offline'],
                    images: p.imageUrl ? [p.imageUrl.startsWith('http') ? p.imageUrl : `http://localhost:5000${p.imageUrl}`] : [],
                    tags: [],
                    benefits: [],
                    clinic: formatClinic(link.clinic),
                };
            }),
        ];

        res.json({ success: true, data: services, meta: { total: services.length } });
    } catch (error) {
        next(error);
    }
};

export const getPublicServiceDetail = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = String(req.params.id);
        const service = await getDiagnosticById(id);

        if (!service || !service.isActive) {
            return res.status(404).json({ success: false, message: 'Xizmat topilmadi' });
        }

        // Format clinics for public consumption
        const allImages: string[] = [];
        if (service.imageUrl) {
            const u = service.imageUrl;
            allImages.push(u.startsWith('http') ? u : `http://localhost:5000${u}`);
        }

        const clinics = service.clinicLinks.map((link: any) => {
            const c = link.clinic;
            const cust = link.customization;
            const basePrice = service.priceRecommended || service.priceMin || 0;
            const customPrice = cust?.customPrice ?? basePrice;
            const discount = cust?.discountPercent ?? 0;
            const finalPrice = discount > 0 ? Math.round(customPrice * (1 - discount / 100)) : customPrice;

            const clinicImages = (cust?.images ?? []).map((img: any) => {
                const url = img.url;
                return url.startsWith('http') ? url : `http://localhost:5000${url}`;
            });
            clinicImages.forEach((img: string) => { if (!allImages.includes(img)) allImages.push(img); });

            return {
                id: c.id,
                name: cust?.customNameUz || c.nameUz,
                nameRu: cust?.customNameRu || c.nameRu,

                // Clinic-specific descriptions (prioritize clinic's version)
                shortDescription: cust?.customDescriptionUz || null,
                fullDescription: cust?.fullDescriptionUz || service.fullDescription,
                processDescription: cust?.processDescription || service.processDescription,

                // Clinic-specific technical details
                sampleVolume: cust?.sampleVolume || service.sampleVolume,
                resultFormat: cust?.resultFormat || service.resultFormat,
                resultTimeHours: cust?.resultTimeHours ?? service.resultTimeHours,
                durationMinutes: cust?.estimatedDurationMinutes || service.durationMinutes,

                // Clinic-specific equipment & quality
                equipment: cust?.equipment || (service.additionalInfo as any)?.equipment,
                accuracy: cust?.accuracy || (service.additionalInfo as any)?.accuracy,
                certifications: cust?.certifications || (service.additionalInfo as any)?.certifications,

                // Clinic-specific preparation
                preparation: cust?.preparationUz || service.preparation,
                preparationJson: cust?.preparationJson || service.preparationJson,

                // Clinic-specific booking policy
                bookingPolicy: cust?.bookingPolicy || service.bookingPolicy,

                // Clinic-specific schedule
                availableDays: cust?.availableDays || [],
                availableTimeSlots: cust?.availableTimeSlots || null,

                // Additional clinic info
                additionalInfo: cust?.additionalInfo || service.additionalInfo,
                benefits: cust?.benefits,
                tags: cust?.tags || [],

                // Location & contact
                region: c.region,
                district: c.district,
                address: `${c.region}, ${c.district}, ${c.street}`,
                phones: c.phones as string[],
                logo: c.logo,
                rating: c.averageRating ?? 0,
                reviewCount: c.reviewCount ?? 0,
                workingHours: c.workingHours,
                hasOnlineBooking: c.hasOnlineBooking,
                type: c.type ?? null,
                hasEmergency: c.hasEmergency ?? false,
                hasAmbulance: c.hasAmbulance ?? false,
                parkingAvailable: c.parkingAvailable ?? false,
                bedsCount: c.bedsCount ?? null,

                // Pricing
                price: finalPrice,
                originalPrice: customPrice !== finalPrice ? customPrice : null,
                discountPercent: discount > 0 ? discount : null,

                // Images
                images: clinicImages,
            };
        });

        // Build public response (strip internal fields)
        const result = {
            id: service.id,
            nameUz: service.nameUz,
            nameRu: service.nameRu,
            nameEn: service.nameEn,
            category: service.category,
            shortDescription: service.shortDescription,
            fullDescription: service.fullDescription,
            priceRecommended: service.priceRecommended,
            priceMin: service.priceMin,
            priceMax: service.priceMax,
            durationMinutes: service.durationMinutes,
            resultTimeHours: service.resultTimeHours,
            sampleType: service.sampleType,
            sampleVolume: service.sampleVolume,
            resultFormat: service.resultFormat,
            processDescription: service.processDescription,
            preparation: service.preparation,
            contraindications: service.contraindications,
            resultParameters: service.resultParameters,
            preparationJson: service.preparationJson,
            indicationsJson: service.indicationsJson,
            contraindicationsJson: service.contraindicationsJson,
            additionalInfo: service.additionalInfo,
            bookingPolicy: service.bookingPolicy,
            imageUrl: service.imageUrl,
            images: allImages,
            activeClinicsCount: service.activeClinicsCount,
            clinics,
            relatedServices: service.relatedServices,
        };

        res.json({ success: true, data: result });
    } catch (error) {
        next(error);
    }
};
