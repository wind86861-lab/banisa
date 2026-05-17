import { Request, Response, NextFunction } from 'express';
import { ClinicStatus, Prisma } from '@prisma/client';
import prisma from '../../config/database';
import { getServiceById as getDiagnosticById } from '../diagnostics/diagnostics.service';

/** Parse the `meta` query param: a JSON object of templateKey -> constraint.
 *  Constraint is either a string[] (allowed values) or { min?, max? } for numbers. */
function parseMetaFilter(raw: unknown): Record<string, string[] | { min?: number; max?: number }> {
    if (!raw) return {};
    try {
        const parsed = JSON.parse(String(raw));
        return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
        return {};
    }
}

type MetaRow = { template: { key: string }; value: string };

/** True when this clinic-service's metadata satisfies every active filter (AND). */
function passesMetaFilter(
    rows: MetaRow[],
    metaFilter: Record<string, any>,
    filterKeys: string[],
): boolean {
    for (const key of filterKeys) {
        const row = rows.find(r => r.template.key === key);
        if (!row) return false;
        const constraint = metaFilter[key];
        if (Array.isArray(constraint)) {
            if (!constraint.map(String).includes(row.value)) return false;
        } else {
            const num = Number(row.value);
            if (Number.isNaN(num)) return false;
            if (constraint.min != null && num < Number(constraint.min)) return false;
            if (constraint.max != null && num > Number(constraint.max)) return false;
        }
    }
    return true;
}

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
                where: { isActive: true, clinic: { status: ClinicStatus.APPROVED, isActive: true }, diagnosticService: { isActive: true } },
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
                where: { isActive: true, clinic: { status: ClinicStatus.APPROVED, isActive: true } },
                include: {
                    clinic: { select: CLINIC_SELECT },
                    surgicalService: {
                        include: { category: { select: { id: true, nameUz: true } } },
                    },
                },
                orderBy: { createdAt: 'desc' },
            }),

            prisma.clinicSanatoriumService.findMany({
                where: { isActive: true, clinic: { status: ClinicStatus.APPROVED, isActive: true } },
                include: {
                    clinic: { select: CLINIC_SELECT },
                    sanatoriumService: {
                        include: { category: { select: { id: true, nameUz: true } } },
                    },
                },
            }),

            prisma.clinicCheckupPackage.findMany({
                where: { isActive: true, clinic: { status: ClinicStatus.APPROVED, isActive: true } },
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

        // ── Patient-visible metadata for diagnostic clinic-services ──
        const metaFilter = parseMetaFilter(req.query.meta);
        const filterKeys = Object.keys(metaFilter).filter(k => {
            const v = metaFilter[k];
            return Array.isArray(v) ? v.length > 0 : v && (v.min != null || v.max != null);
        });
        const hasMetaFilter = filterKeys.length > 0;

        const diagClinicIds = [...new Set(diagnosticLinks.map(l => l.clinicId))];
        const diagServiceIds = [...new Set(diagnosticLinks.map(l => l.diagnosticServiceId))];
        // Metadata is an enhancement layer — it must never take the whole public
        // catalog down. If the ClinicServiceMetadata table/columns are absent
        // (e.g. migration not yet applied on this environment), degrade to "no
        // metadata" instead of returning a 500 for every request.
        let metaRows: Prisma.ClinicServiceMetadataGetPayload<{
            include: { template: { select: { key: true; labelUz: true; labelRu: true; unit: true; inputType: true; category: true } } };
        }>[] = [];
        if (diagClinicIds.length) {
            try {
                metaRows = await prisma.clinicServiceMetadata.findMany({
                    where: {
                        serviceType: 'DIAGNOSTIC',
                        clinicId: { in: diagClinicIds },
                        serviceId: { in: diagServiceIds },
                        template: { isActive: true, visibleToPatient: true },
                    },
                    include: {
                        template: {
                            select: { key: true, labelUz: true, labelRu: true, unit: true, inputType: true, category: true },
                        },
                    },
                });
            } catch (err: any) {
                // Metadata is non-critical enrichment. ANY failure here (missing
                // table/column P2021/P2022, bad relation, connection blip, etc.)
                // must degrade to "no metadata" — it must never 500 the whole
                // public catalog. Log loudly so the root cause is still visible.
                console.error(
                    '[public/services] metadata query failed — serving catalog ' +
                    'without metadata. code=%s msg=%s',
                    err?.code, err?.message,
                );
                metaRows = [];
            }
        }

        const metaByPair = new Map<string, typeof metaRows>();
        for (const row of metaRows) {
            const k = `${row.clinicId}:${row.serviceId}`;
            const list = metaByPair.get(k) ?? [];
            list.push(row);
            metaByPair.set(k, list);
        }
        const metaForLink = (clinicId: string, serviceId: string) =>
            metaByPair.get(`${clinicId}:${serviceId}`) ?? [];

        const visibleDiagnosticLinks = hasMetaFilter
            ? diagnosticLinks.filter(l =>
                passesMetaFilter(metaForLink(l.clinicId, l.diagnosticServiceId), metaFilter, filterKeys))
            : diagnosticLinks;

        // A meta filter targets diagnostic-only attributes, so other
        // service types are excluded entirely while one is active.
        const surgicalVisible = hasMetaFilter ? [] : surgicalLinks;
        const sanatoriumVisible = hasMetaFilter ? [] : sanatoriumLinks;
        const checkupVisible = hasMetaFilter ? [] : checkupLinks;

        const services = [
            ...visibleDiagnosticLinks.map(link => {
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
                    metadata: metaForLink(link.clinicId, link.diagnosticServiceId).map(r => ({
                        key: r.template.key,
                        label: r.template.labelUz,
                        value: r.value,
                        unit: r.template.unit,
                        inputType: r.template.inputType,
                        category: r.template.category,
                    })),
                    clinic: formatClinic(link.clinic),
                };
            }),

            ...surgicalVisible.map(link => {
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

            ...sanatoriumVisible.map(link => {
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

            ...checkupVisible.map(link => {
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

/** GET /public/services/filters — facets for the patient catalog filter UI.
 *  Returns each patient-visible metadata template that has at least one
 *  value set by an approved clinic, with its distinct values / numeric range. */
export const getPublicServiceFilters = async (_req: Request, res: Response, next: NextFunction) => {
    try {
        let rows: Prisma.ClinicServiceMetadataGetPayload<{ include: { template: true } }>[] = [];
        try {
            rows = await prisma.clinicServiceMetadata.findMany({
                where: {
                    serviceType: 'DIAGNOSTIC',
                    template: { isActive: true, visibleToPatient: true },
                    clinic: { status: ClinicStatus.APPROVED, isActive: true },
                },
                include: { template: true },
            });
        } catch (err: any) {
            // Any failure → empty facets, never a 500 (see getPublicServices).
            console.error(
                '[public/services/filters] metadata query failed — returning ' +
                'empty facets. code=%s msg=%s',
                err?.code, err?.message,
            );
            rows = [];
        }

        const byTemplate = new Map<string, {
            key: string; labelUz: string; labelRu: string | null;
            unit: string | null; inputType: string; category: string;
            values: Set<string>; nums: number[];
        }>();

        for (const row of rows) {
            const t = row.template;
            let facet = byTemplate.get(t.id);
            if (!facet) {
                facet = {
                    key: t.key, labelUz: t.labelUz, labelRu: t.labelRu,
                    unit: t.unit, inputType: t.inputType, category: t.category,
                    values: new Set(), nums: [],
                };
                byTemplate.set(t.id, facet);
            }
            facet.values.add(row.value);
            const n = Number(row.value);
            if (!Number.isNaN(n)) facet.nums.push(n);
        }

        const data = [...byTemplate.values()].map(f => ({
            key: f.key,
            labelUz: f.labelUz,
            labelRu: f.labelRu,
            unit: f.unit,
            inputType: f.inputType,
            category: f.category,
            options: f.inputType === 'NUMBER' ? [] : [...f.values].sort(),
            range: f.inputType === 'NUMBER' && f.nums.length
                ? { min: Math.min(...f.nums), max: Math.max(...f.nums) }
                : null,
        }));

        res.json({ success: true, data });
    } catch (error) {
        next(error);
    }
};

export const getPublicServiceDetail = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = String(req.params.id);
        const clinicIdFilter = req.query.clinicId as string | undefined;

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

                if (!link || !link.isActive || !link.clinic.isActive || link.clinic.status !== ClinicStatus.APPROVED) {
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

        // Handle sanatorium services (ID format: sanatorium-{clinicId}-{sanatoriumServiceId})
        if (id.startsWith('sanatorium-')) {
            const withoutPrefix = id.substring('sanatorium-'.length);
            const parts = withoutPrefix.split('-');
            if (parts.length >= 10) {
                const clinicId = parts.slice(0, 5).join('-');
                const sanatoriumServiceId = parts.slice(5).join('-');

                const link = await prisma.clinicSanatoriumService.findUnique({
                    where: { clinicId_sanatoriumServiceId: { clinicId, sanatoriumServiceId } },
                    include: {
                        clinic: {
                            select: {
                                id: true, nameUz: true, nameRu: true,
                                region: true, district: true, street: true,
                                phones: true, logo: true, averageRating: true, reviewCount: true,
                                workingHours: true, hasOnlineBooking: true, type: true,
                                status: true, isActive: true,
                            },
                        },
                        sanatoriumService: {
                            include: { category: true },
                        },
                    },
                });

                if (!link || !link.isActive || !link.clinic.isActive || link.clinic.status !== ClinicStatus.APPROVED) {
                    return res.status(404).json({ success: false, message: 'Xizmat topilmadi' });
                }

                const s = link.sanatoriumService;
                const c = link.clinic;
                const mainImg = s.imageUrl ?? null;
                const roomImgs = ((link.roomImages as string[] | null) ?? []);
                const images = mainImg ? [mainImg, ...roomImgs] : roomImgs;
                const duration = s.durationDays
                    ? `${s.durationDays} kun`
                    : s.durationMinutes
                        ? `${s.durationMinutes} daqiqa`
                        : '';

                return res.json({
                    success: true,
                    data: {
                        id,
                        isSanatorium: true,
                        serviceId: sanatoriumServiceId,
                        nameUz: link.customNameUz ?? s.nameUz,
                        nameRu: link.customNameRu ?? s.nameRu,
                        category: 'sanatoriya',
                        shortDescription: link.customDescription ?? s.shortDescription,
                        fullDescription: s.shortDescription,
                        targetAudience: null,
                        price: link.clinicPrice ?? s.priceRecommended ?? s.priceMin ?? 0,
                        priceMin: s.priceMin,
                        priceMax: s.priceMax,
                        priceRecommended: link.clinicPrice ?? s.priceRecommended ?? 0,
                        imageUrl: mainImg,
                        images,
                        durationMinutes: s.durationMinutes ?? 480,
                        resultTimeHours: (s.durationDays ?? 1) * 24,
                        activeClinicsCount: 1,
                        includes: link.includes,
                        excludes: link.excludes,
                        features: link.features,
                        mealPlan: link.mealPlan,
                        maxGuests: link.maxGuests,
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
                            price: link.clinicPrice ?? s.priceRecommended ?? 0,
                            originalPrice: null,
                            discountPercent: link.discountPercent ?? null,
                        }],
                    },
                });
            }
        }

        // Handle checkup packages (ClinicCheckupPackage ID — cuid)
        const checkupLink = await prisma.clinicCheckupPackage.findUnique({
            where: { id },
            include: {
                package: {
                    include: { items: { orderBy: { sortOrder: 'asc' } } },
                },
                clinic: {
                    select: {
                        id: true, nameUz: true, nameRu: true,
                        region: true, district: true, street: true,
                        phones: true, logo: true, averageRating: true, reviewCount: true,
                        workingHours: true, hasOnlineBooking: true, type: true,
                        status: true, isActive: true,
                    },
                },
            },
        });

        if (
            checkupLink &&
            checkupLink.isActive &&
            checkupLink.package.isActive &&
            checkupLink.clinic.isActive &&
            checkupLink.clinic.status === ClinicStatus.APPROVED
        ) {
            const p = checkupLink.package;
            const c = checkupLink.clinic;
            const cust = (checkupLink.customizationData as any) || {};

            return res.json({
                success: true,
                data: {
                    id: checkupLink.id,
                    isCheckup: true,
                    serviceId: p.id,
                    nameUz: cust.customNameUz || p.nameUz,
                    nameRu: cust.customNameRu || p.nameRu,
                    category: 'checkup',
                    targetAudience: p.targetAudience,
                    shortDescription: cust.customNotes || p.shortDescription,
                    fullDescription: p.fullDescription || p.shortDescription,
                    price: checkupLink.clinicPrice,
                    priceMin: p.priceMin,
                    priceMax: p.priceMax,
                    priceRecommended: checkupLink.clinicPrice,
                    discount: p.discount,
                    imageUrl: p.imageUrl,
                    images: p.imageUrl ? [p.imageUrl] : [],
                    items: p.items,
                    durationMinutes: 480,
                    resultTimeHours: 24,
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
                        price: checkupLink.clinicPrice,
                        originalPrice: null,
                        discountPercent: null,
                    }],
                },
            });
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

        // Filter clinics if clinicId query parameter is provided
        const filteredClinics = clinicIdFilter
            ? clinics.filter(c => c.id === clinicIdFilter)
            : clinics;

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
            clinics: filteredClinics,
            relatedServices: service.relatedServices,
        };

        res.json({ success: true, data: result });
    } catch (error) {
        next(error);
    }
};
