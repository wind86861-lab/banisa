import prisma from '../../../config/database';
import { AppError, ErrorCodes } from '../../../utils/errors';

export class ClinicSanatoriumServiceClass {

    private async getClinicId(userId: string): Promise<string> {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { clinicId: true },
        });
        if (!user?.clinicId) throw new AppError('Klinika topilmadi', 404, ErrorCodes.NOT_FOUND);
        return user.clinicId;
    }

    private async getDescendantCategoryIds(categoryId: string): Promise<string[]> {
        const result: string[] = [categoryId];
        const children = await prisma.serviceCategory.findMany({
            where: { parentId: categoryId },
            select: { id: true },
        });
        for (const child of children) {
            const descendants = await this.getDescendantCategoryIds(child.id);
            result.push(...descendants);
        }
        return result;
    }

    async getAvailableSanatoriumServices(userId: string, filters: {
        search?: string;
        categoryId?: string;
    }) {
        const clinicId = await this.getClinicId(userId);

        let categoryIds: string[] | undefined;
        if (filters.categoryId) {
            categoryIds = await this.getDescendantCategoryIds(filters.categoryId);
        }

        const where: any = {
            isActive: true,
            ...(categoryIds && categoryIds.length > 0 && { categoryId: { in: categoryIds } }),
            ...(filters.search && {
                OR: [
                    { nameUz: { contains: filters.search, mode: 'insensitive' } },
                    { nameRu: { contains: filters.search, mode: 'insensitive' } },
                ],
            }),
        };

        const services = await prisma.sanatoriumService.findMany({
            where,
            include: {
                category: { select: { id: true, nameUz: true, nameRu: true, level: true } },
                clinicLinks: { where: { clinicId } },
            },
            orderBy: [{ category: { nameUz: 'asc' } }, { nameUz: 'asc' }],
        });

        return services.map(s => ({
            id: s.id,
            nameUz: s.nameUz,
            nameRu: s.nameRu,
            shortDescription: s.shortDescription,
            serviceType: s.serviceType,
            priceMin: s.priceMin,
            priceMax: s.priceMax,
            priceRecommended: s.priceRecommended,
            pricePer: s.pricePer,
            durationMinutes: s.durationMinutes,
            durationDays: s.durationDays,
            sessionsCount: s.sessionsCount,
            capacity: s.capacity,
            category: s.category,
            clinicService: s.clinicLinks[0]
                ? { isActive: s.clinicLinks[0].isActive, clinicPrice: s.clinicLinks[0].clinicPrice }
                : null,
        }));
    }

    async activateSanatoriumService(userId: string, data: any) {
        const clinicId = await this.getClinicId(userId);

        const service = await prisma.sanatoriumService.findFirst({
            where: { id: data.serviceId, isActive: true },
        });
        if (!service) throw new AppError('Sanatoriya xizmati topilmadi', 404, ErrorCodes.NOT_FOUND);

        const existing = await prisma.clinicSanatoriumService.findUnique({
            where: { clinicId_sanatoriumServiceId: { clinicId, sanatoriumServiceId: data.serviceId } },
        });

        const updateData: any = {
            isActive: true,
            clinicPrice: data.clinicPrice ?? null,
            discountPercent: data.discountPercent ?? 0,
            discountValidUntil: data.discountValidUntil ? new Date(data.discountValidUntil) : null,
            customNameUz: data.customNameUz ?? null,
            customNameRu: data.customNameRu ?? null,
            customDescription: data.customDescription ?? null,
            roomType: data.roomType ?? null,
            roomImages: data.roomImages ?? null,
            roomAmenities: data.roomAmenities ?? null,
            mealPlan: data.mealPlan ?? null,
            mealDescription: data.mealDescription ?? null,
            locationAddress: data.locationAddress ?? null,
            locationCoords: data.locationCoords ?? null,
            contactPhone: data.contactPhone ?? null,
            contactEmail: data.contactEmail ?? null,
            features: data.features ?? null,
            includes: data.includes ?? null,
            excludes: data.excludes ?? null,
            availableFrom: data.availableFrom ? new Date(data.availableFrom) : null,
            availableTo: data.availableTo ? new Date(data.availableTo) : null,
            maxGuests: data.maxGuests ?? null,
        };

        if (existing) {
            return prisma.clinicSanatoriumService.update({
                where: { clinicId_sanatoriumServiceId: { clinicId, sanatoriumServiceId: data.serviceId } },
                data: updateData,
            });
        }

        return prisma.clinicSanatoriumService.create({
            data: {
                clinicId,
                sanatoriumServiceId: data.serviceId,
                ...updateData,
            },
        });
    }

    async deactivateSanatoriumService(userId: string, serviceId: string) {
        const clinicId = await this.getClinicId(userId);

        const existing = await prisma.clinicSanatoriumService.findUnique({
            where: { clinicId_sanatoriumServiceId: { clinicId, sanatoriumServiceId: serviceId } },
        });
        if (!existing) throw new AppError('Sanatoriya xizmati aktivlashtirilmagan', 404, ErrorCodes.NOT_FOUND);

        return prisma.clinicSanatoriumService.update({
            where: { clinicId_sanatoriumServiceId: { clinicId, sanatoriumServiceId: serviceId } },
            data: { isActive: false },
        });
    }
}

export const clinicSanatoriumService = new ClinicSanatoriumServiceClass();
