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
                orderBy: { createdAt: 'desc' },
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
                const images = cust?.images?.map((img: any) => img.url) ?? [];
                const originalPrice = s.priceRecommended ?? s.priceMin ?? 0;
                const customPrice = cust?.customPrice ?? originalPrice;
                const discount = cust?.discountPercent ?? 0;
                const finalPrice = discount > 0 ? Math.round(customPrice * (1 - discount / 100)) : customPrice;

                return {
                    id: s.id,
                    serviceId: s.id,
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
                const anyLink = link as any;
                const cust = anyLink.customizationData || {};
                const custImages = (anyLink.serviceImages || []).map((img: any) => img.url || img);
                const images = custImages.length > 0 ? custImages : (s.imageUrl ? [s.imageUrl] : []);
                const price = cust.customPrice ?? s.priceRecommended ?? s.priceMin ?? 0;
                const discount = cust.discountPercent ?? 0;
                const finalPrice = discount > 0 ? Math.round(price * (1 - discount / 100)) : price;
                return {
                    id: `surgical-${link.clinicId}-${link.surgicalServiceId}`,
                    serviceId: link.surgicalServiceId,
                    category: 'operatsiya',
                    title: (cust.customNameUz || s.nameUz) as string,
                    desc: (cust.descriptionShortUz || s.shortDescription || '') as string,
                    fullDescription: (cust.descriptionFullUz || s.shortDescription || '') as string,
                    specialty: s.category?.nameUz ?? 'Jarrohlik',
                    price: finalPrice,
                    originalPrice: discount > 0 ? price : null,
                    discountPercent: discount > 0 ? discount : null,
                    rating: link.clinic.averageRating ?? 0,
                    reviews: link.clinic.reviewCount ?? 0,
                    duration: cust.durationMinutes ? `${cust.durationMinutes} daqiqa` : duration,
                    availability: ['offline'],
                    images,
                    tags: [],
                    benefits: [],
                    clinic: formatClinic(link.clinic),
                };
            }),

            ...sanatoriumLinks.map(link => {
                const s = link.sanatoriumService;
                const roomImgs = ((link.roomImages as string[] | null) ?? []).map(url =>
                    url
                );
                const mainImg = s.imageUrl ?? null;
                const images = mainImg ? [mainImg, ...roomImgs] : roomImgs;
                const duration = s.durationDays
                    ? `${s.durationDays} kun`
                    : s.durationMinutes
                        ? `${s.durationMinutes} daqiqa`
                        : '';
                return {
                    id: `sanatorium-${link.clinicId}-${link.sanatoriumServiceId}`,
                    serviceId: link.sanatoriumServiceId,
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
                    serviceId: p.id,
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
                    images: p.imageUrl ? [p.imageUrl] : [],
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

        // Handle surgical services (ID format: surgical-{clinicId}-{surgicalServiceId})
        if (id.startsWith('surgical-')) {
            const withoutPrefix = id.substring('surgical-'.length);
            const parts = withoutPrefix.split('-');
            // UUID format: 8-4-4-4-12 characters, so we need to reconstruct two UUIDs
            if (parts.length >= 10) {
                const clinicId = parts.slice(0, 5).join('-');
                const surgicalServiceId = parts.slice(5).join('-');

                const link = await prisma.clinicSurgicalService.findUnique({
                    where: { clinicId_surgicalServiceId: { clinicId, surgicalServiceId } },
                    include: {
                        clinic: true,
                        surgicalService: { include: { category: true } },
                    },
                });

                if (!link || !link.isActive) {
                    return res.status(404).json({ success: false, message: 'Xizmat topilmadi' });
                }

                const s = link.surgicalService;
                const c = link.clinic;
                const anyLink = link as any;
                const cust = anyLink.customizationData || {};
                const custImages = (anyLink.serviceImages || []).map((img: any) => img.url || img);
                const images = custImages.length > 0 ? custImages : (s.imageUrl ? [s.imageUrl] : []);

                const price = cust.customPrice ?? s.priceRecommended ?? s.priceMin ?? 0;
                const discount = cust.discountPercent ?? 0;
                const finalPrice = discount > 0 ? Math.round(price * (1 - discount / 100)) : price;

                const mins = s.durationMinutes;
                const duration = mins >= 60 ? `${Math.round(mins / 60)} soat` : `${mins} daqiqa`;

                const result = {
                    id,
                    isSurgical: true,
                    category: 'operatsiya',
                    specialty: s.category?.nameUz || 'Jarrohlik',
                    nameUz: cust.customNameUz || s.nameUz,
                    nameRu: cust.customNameRu || s.nameRu,
                    nameEn: s.nameEn,
                    // Descriptions
                    shortDescription: cust.descriptionShortUz || s.shortDescription || '',
                    fullDescription: cust.descriptionFullUz || s.fullDescription || s.shortDescription || '',
                    // Surgery specifics
                    surgeryMethod: cust.surgeryMethod || null,
                    anesthesiaType: cust.anesthesiaType || String(s.anesthesiaType),
                    durationMinutes: cust.durationMinutes || s.durationMinutes,
                    duration: cust.durationMinutes ? `${cust.durationMinutes} daqiqa` : duration,
                    recoveryDays: cust.recoveryDays ?? s.recoveryDays,
                    hospitalizationDays: cust.hospitalizationDays ?? null,
                    requiresHospitalization: s.requiresHospitalization,
                    // Pricing
                    price: finalPrice,
                    originalPrice: discount > 0 ? price : null,
                    discountPercent: discount > 0 ? discount : null,
                    priceMin: s.priceMin,
                    priceMax: s.priceMax,
                    priceRecommended: s.priceRecommended,
                    priceIncludesUz: cust.priceIncludesUz || '',
                    installmentAvailable: cust.installmentAvailable || false,
                    installmentMonths: cust.installmentMonths || null,
                    insuranceAccepted: cust.insuranceAccepted || false,
                    insuranceProviders: cust.insuranceProviders || '',
                    // Pre-op preparation
                    preparation: cust.preOpInstructionsUz || null,
                    preOpFastingHours: cust.preOpFastingHours ?? null,
                    preOpMedicationStop: cust.preOpMedicationStop || '',
                    preOpTestsRequired: cust.preOpTestsRequired || '',
                    // Post-op recovery
                    postOpInstructions: cust.postOpInstructionsUz || null,
                    postOpDiet: cust.postOpDietUz || '',
                    postOpActivityRestrictions: cust.postOpActivityRestrictions || '',
                    postOpFollowUpDays: cust.postOpFollowUpDays ?? null,
                    // Images
                    images,
                    imageUrl: images[0] || null,
                    activeClinicsCount: 1,
                    clinics: [{
                        id: c.id,
                        name: c.nameUz,
                        nameRu: c.nameRu,
                        region: c.region,
                        district: c.district,
                        address: `${c.region}, ${c.district}, ${c.street}`,
                        phones: c.phones as string[],
                        logo: c.logo,
                        rating: c.averageRating ?? 0,
                        reviewCount: c.reviewCount ?? 0,
                        workingHours: c.workingHours,
                        hasOnlineBooking: c.hasOnlineBooking,
                        price: finalPrice,
                        originalPrice: discount > 0 ? price : null,
                        discountPercent: discount > 0 ? discount : null,
                        images: custImages,
                    }],
                };

                return res.json({ success: true, data: result });
            }
        }

        // Handle diagnostic services
        const service = await getDiagnosticById(id);

        if (!service || !service.isActive) {
            return res.status(404).json({ success: false, message: 'Xizmat topilmadi' });
        }

        // Format clinics for public consumption
        const allImages: string[] = [];
        if (service.imageUrl) {
            const u = service.imageUrl;
            allImages.push(u);
        }

        const clinics = service.clinicLinks.map((link: any) => {
            const c = link.clinic;
            const cust = link.customization;
            const basePrice = service.priceRecommended || service.priceMin || 0;
            const customPrice = cust?.customPrice ?? basePrice;
            const discount = cust?.discountPercent ?? 0;
            const finalPrice = discount > 0 ? Math.round(customPrice * (1 - discount / 100)) : customPrice;

            const clinicImages = (cust?.images ?? []).map((img: any) => img.url);
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
