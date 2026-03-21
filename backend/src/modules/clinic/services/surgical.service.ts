import prisma from '../../../config/database';
import { AppError, ErrorCodes } from '../../../utils/errors';

export class ClinicSurgicalService {

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

    async getAvailableSurgicalServices(userId: string, filters: {
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

        const services = await prisma.surgicalService.findMany({
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
            priceMin: s.priceMin,
            priceMax: s.priceMax,
            priceRecommended: s.priceRecommended,
            durationMinutes: s.durationMinutes,
            anesthesiaType: s.anesthesiaType,
            complexity: s.complexity,
            riskLevel: s.riskLevel,
            requiresHospitalization: s.requiresHospitalization,
            hospitalizationDays: s.hospitalizationDays,
            category: s.category,
            clinicService: s.clinicLinks[0]
                ? { isActive: s.clinicLinks[0].isActive }
                : null,
        }));
    }

    async activateSurgicalService(userId: string, serviceId: string) {
        const clinicId = await this.getClinicId(userId);

        const service = await prisma.surgicalService.findFirst({
            where: { id: serviceId, isActive: true },
        });
        if (!service) throw new AppError('Operatsiya topilmadi', 404, ErrorCodes.NOT_FOUND);

        const existing = await prisma.clinicSurgicalService.findUnique({
            where: { clinicId_surgicalServiceId: { clinicId, surgicalServiceId: serviceId } },
        });

        if (existing) {
            return prisma.clinicSurgicalService.update({
                where: { clinicId_surgicalServiceId: { clinicId, surgicalServiceId: serviceId } },
                data: { isActive: true },
            });
        }

        return prisma.clinicSurgicalService.create({
            data: { clinicId, surgicalServiceId: serviceId },
        });
    }

    async deactivateSurgicalService(userId: string, serviceId: string) {
        const clinicId = await this.getClinicId(userId);

        const existing = await prisma.clinicSurgicalService.findUnique({
            where: { clinicId_surgicalServiceId: { clinicId, surgicalServiceId: serviceId } },
        });
        if (!existing) throw new AppError('Operatsiya aktivlashtirilmagan', 404, ErrorCodes.NOT_FOUND);

        return prisma.clinicSurgicalService.update({
            where: { clinicId_surgicalServiceId: { clinicId, surgicalServiceId: serviceId } },
            data: { isActive: false },
        });
    }
}

export const clinicSurgicalService = new ClinicSurgicalService();
