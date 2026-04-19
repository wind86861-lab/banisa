import prisma from '../../config/database';
import { AppError, ErrorCodes } from '../../utils/errors';

export const listSurgicalServices = async (query: any) => {
    const { page = 1, limit = 10, search, categoryId, minPrice, maxPrice, complexity, riskLevel } = query;
    const skip = (page - 1) * limit;

    let where: any = { isActive: true };
    if (categoryId) where.categoryId = categoryId;
    if (complexity) where.complexity = complexity;
    if (riskLevel) where.riskLevel = riskLevel;

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
          similarity("nameRu", $1),
          similarity("nameEn", $1),
          similarity("shortDescription", $1) * 0.7
        ) as relevance
      FROM "SurgicalService"
      WHERE 
        "isActive" = true AND
        ("nameUz" % $1 OR "nameRu" % $1 OR "nameEn" % $1 OR "shortDescription" % $1)
      ORDER BY relevance DESC, "nameUz" ASC
      LIMIT $2 OFFSET $3
    `;

        const countQuery = `
      SELECT COUNT(*)::int as count
      FROM "SurgicalService"
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
        prisma.surgicalService.findMany({
            where,
            skip,
            take: parseInt(limit),
            orderBy: { nameUz: 'asc' },
            include: { category: true },
        }),
        prisma.surgicalService.count({ where }),
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

export const getSurgicalTree = async () => {
    const root = await prisma.serviceCategory.findFirst({
        where: { slug: 'operations', level: 0 },
    });
    if (!root) return [];

    const level1 = await prisma.serviceCategory.findMany({
        where: { parentId: root.id, level: 1 },
        orderBy: { sortOrder: 'asc' },
    });

    const tree = await Promise.all(
        level1.map(async (l1) => {
            const subs = await prisma.serviceCategory.findMany({
                where: { parentId: l1.id, level: 2 },
                orderBy: { sortOrder: 'asc' },
            });

            const subsWithOps = await Promise.all(
                subs.map(async (sub) => {
                    const operations = await prisma.surgicalService.findMany({
                        where: { categoryId: sub.id, isActive: true },
                        orderBy: { nameUz: 'asc' },
                        select: {
                            id: true, nameUz: true, nameRu: true, nameEn: true,
                            priceRecommended: true, priceMin: true, priceMax: true,
                            complexity: true, riskLevel: true, anesthesiaType: true,
                            durationMinutes: true, hospitalizationDays: true, recoveryDays: true,
                        },
                    });
                    return { ...sub, operations };
                })
            );

            return { ...l1, children: subsWithOps };
        })
    );

    return tree;
};

export const getSurgicalById = async (id: string) => {
    return prisma.surgicalService.findUnique({
        where: { id },
        include: { category: true, createdBy: true },
    });
};

export const createSurgical = async (data: any, userId: string) => {
    const category = await prisma.serviceCategory.findUnique({
        where: { id: data.categoryId },
    });

    if (!category || category.level !== 2) {
        throw new AppError('Invalid category. Must be level 2.', 400, ErrorCodes.VALIDATION_ERROR);
    }

    return prisma.surgicalService.create({
        data: {
            ...data,
            createdById: userId,
        },
    });
};

export const updateSurgical = async (id: string, data: any) => {
    const { categoryId, createdById, id: _id, createdAt, updatedAt, category, createdBy, appointments, clinicLinks, serviceReviews, ...rest } = data;
    const updateData: any = { ...rest };
    if (categoryId) {
        updateData.category = { connect: { id: categoryId } };
    }
    return prisma.surgicalService.update({
        where: { id },
        data: updateData,
    });
};

export const deleteSurgical = async (id: string) => {
    return prisma.surgicalService.update({
        where: { id },
        data: { isActive: false },
    });
};
