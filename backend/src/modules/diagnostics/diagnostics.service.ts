import prisma from '../../config/database';
import { AppError, ErrorCodes } from '../../utils/errors';

export const listServices = async (query: any) => {
    const { page = 1, limit = 10, search, categoryId, minPrice, maxPrice } = query;
    const skip = (page - 1) * limit;

    // Base where clause for Prisma
    let where: any = { isActive: true };
    if (categoryId) where.categoryId = categoryId;
    if (minPrice || maxPrice) {
        where.priceRecommended = {
            ...(minPrice && { gte: parseInt(minPrice) }),
            ...(maxPrice && { lte: parseInt(maxPrice) }),
        };
    }

    // If search is provided, use raw SQL for pg_trgm
    if (search && search.length >= 2) {
        const rawQuery = `
      SELECT *, 
        GREATEST(
          similarity("nameUz", $1),
          similarity("nameRu", $1),
          similarity("nameEn", $1),
          similarity("shortDescription", $1) * 0.7
        ) as relevance
      FROM "DiagnosticService"
      WHERE 
        "isActive" = true AND
        ("nameUz" % $1 OR "nameRu" % $1 OR "nameEn" % $1 OR "shortDescription" % $1)
      ORDER BY relevance DESC, "nameUz" ASC
      LIMIT $2 OFFSET $3
    `;

        const countQuery = `
      SELECT COUNT(*)::int as count
      FROM "DiagnosticService"
      WHERE 
        "isActive" = true AND
        ("nameUz" % $1 OR "nameRu" % $1 OR "nameEn" % $1 OR "shortDescription" % $1)
    `;

        const services = await prisma.$queryRawUnsafe<any[]>(rawQuery, search, parseInt(limit), skip);
        const countResult = await prisma.$queryRawUnsafe<any[]>(countQuery, search);
        const total = countResult[0].count;

        return {
            services,
            meta: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    // Normal Prisma query if no search
    const [services, total] = await Promise.all([
        prisma.diagnosticService.findMany({
            where,
            skip,
            take: parseInt(limit),
            orderBy: { nameUz: 'asc' },
            include: { category: true },
        }),
        prisma.diagnosticService.count({ where }),
    ]);

    return {
        services,
        meta: {
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(total / limit),
        },
    };
};

export const getServiceById = async (id: string) => {
    const service = await prisma.diagnosticService.findUnique({
        where: { id },
        include: {
            category: {
                include: {
                    parent: { select: { id: true, nameUz: true, slug: true } },
                },
            },
            clinicLinks: {
                where: { isActive: true, clinic: { status: 'APPROVED' } },
                include: {
                    clinic: {
                        select: {
                            id: true,
                            nameUz: true,
                            nameRu: true,
                            region: true,
                            district: true,
                            street: true,
                            phones: true,
                            logo: true,
                            averageRating: true,
                            reviewCount: true,
                            workingHours: true,
                            hasOnlineBooking: true,
                            type: true,
                            hasEmergency: true,
                            hasAmbulance: true,
                            parkingAvailable: true,
                            bedsCount: true,
                        },
                    },
                    customization: {
                        select: {
                            customPrice: true,
                            discountPercent: true,
                            customNameUz: true,
                            customNameRu: true,
                            customDescriptionUz: true,
                            customDescriptionRu: true,
                            fullDescriptionUz: true,
                            fullDescriptionRu: true,
                            processDescription: true,
                            preparationUz: true,
                            preparationRu: true,
                            preparationJson: true,
                            benefits: true,
                            tags: true,
                            bookingPolicy: true,
                            additionalInfo: true,
                            equipment: true,
                            accuracy: true,
                            certifications: true,
                            sampleVolume: true,
                            resultFormat: true,
                            resultTimeHours: true,
                            estimatedDurationMinutes: true,
                            customCategory: true,
                            isHighlighted: true,
                            availableDays: true,
                            availableTimeSlots: true,
                            images: { orderBy: { order: 'asc' as const } },
                        },
                    },
                },
            },
        },
    });

    if (!service) return null;

    // Fetch related services from same category (max 6)
    const relatedServices = await prisma.diagnosticService.findMany({
        where: {
            categoryId: service.categoryId,
            id: { not: service.id },
            isActive: true,
        },
        take: 6,
        select: {
            id: true,
            nameUz: true,
            shortDescription: true,
            priceMin: true,
            durationMinutes: true,
            resultTimeHours: true,
            imageUrl: true,
        },
        orderBy: { nameUz: 'asc' },
    });

    // Count active clinics offering this service
    const activeClinicsCount = service.clinicLinks.length;

    return { ...service, relatedServices, activeClinicsCount };
};

export const createService = async (data: any, userId: string) => {
    // Check category level
    const category = await prisma.serviceCategory.findUnique({
        where: { id: data.categoryId },
    });

    if (!category || category.level !== 2) {
        throw new AppError('Invalid category. Must be level 2.', 400, ErrorCodes.VALIDATION_ERROR);
    }

    return prisma.diagnosticService.create({
        data: {
            ...data,
            createdById: userId,
        },
    });
};

export const updateService = async (id: string, data: any) => {
    return prisma.diagnosticService.update({
        where: { id },
        data,
    });
};

export const deleteService = async (id: string) => {
    return prisma.diagnosticService.update({
        where: { id },
        data: { isActive: false },
    });
};
