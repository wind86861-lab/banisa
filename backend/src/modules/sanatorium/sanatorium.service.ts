import prisma from '../../config/database';
import { AppError, ErrorCodes } from '../../utils/errors';

export const listSanatoriumServices = async (query: any) => {
    const { page = 1, limit = 10, search, categoryId, serviceType, minPrice, maxPrice } = query;
    const skip = (page - 1) * limit;

    let where: any = { isActive: true };
    if (categoryId) where.categoryId = categoryId;
    if (serviceType) where.serviceType = serviceType;

    if (minPrice || maxPrice) {
        where.priceRecommended = {
            ...(minPrice && { gte: parseInt(minPrice) }),
            ...(maxPrice && { lte: parseInt(maxPrice) }),
        };
    }

    if (search && search.length >= 2) {
        const rawQuery = `
      SELECT *, 
        GREATEST(
          similarity("nameUz", $1),
          similarity(COALESCE("nameRu",''), $1),
          similarity(COALESCE("nameEn",''), $1),
          similarity(COALESCE("shortDescription",''), $1) * 0.7
        ) as relevance
      FROM "SanatoriumService"
      WHERE 
        "isActive" = true AND
        ("nameUz" % $1 OR "nameRu" % $1 OR "nameEn" % $1 OR "shortDescription" % $1)
      ORDER BY relevance DESC, "nameUz" ASC
      LIMIT $2 OFFSET $3
    `;

        const countQuery = `
      SELECT COUNT(*)::int as count
      FROM "SanatoriumService"
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

    const [services, total] = await Promise.all([
        prisma.sanatoriumService.findMany({
            where,
            skip,
            take: parseInt(limit),
            orderBy: { nameUz: 'asc' },
            include: { category: true },
        }),
        prisma.sanatoriumService.count({ where }),
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

export const getSanatoriumById = async (id: string) => {
    return prisma.sanatoriumService.findUnique({
        where: { id },
        include: { category: true, createdBy: true },
    });
};

export const createSanatorium = async (data: any, userId: string) => {
    const category = await prisma.serviceCategory.findUnique({
        where: { id: data.categoryId },
    });

    if (!category || category.level !== 2) {
        throw new AppError('Invalid category. Must be level 2.', 400, ErrorCodes.VALIDATION_ERROR);
    }

    return prisma.sanatoriumService.create({
        data: {
            ...data,
            createdById: userId,
        },
    });
};

export const updateSanatorium = async (id: string, data: any) => {
    return prisma.sanatoriumService.update({
        where: { id },
        data,
    });
};

export const deleteSanatorium = async (id: string) => {
    return prisma.sanatoriumService.update({
        where: { id },
        data: { isActive: false },
    });
};
