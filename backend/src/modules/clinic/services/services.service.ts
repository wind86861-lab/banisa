import prisma from '../../../config/database';
import { AppError, ErrorCodes } from '../../../utils/errors';

export class ClinicServicesService {

    private async getClinicId(userId: string): Promise<string> {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { clinicId: true },
        });
        if (!user?.clinicId) throw new AppError('Klinika topilmadi', 404, ErrorCodes.NOT_FOUND);
        return user.clinicId;
    }

    private async getDescendantCategoryIds(categoryId: string): Promise<string[]> {
        const result: string[] = [categoryId]; // Include the parent itself

        // Get all direct children
        const children = await prisma.serviceCategory.findMany({
            where: { parentId: categoryId },
            select: { id: true },
        });

        // Recursively get descendants of each child
        for (const child of children) {
            const descendants = await this.getDescendantCategoryIds(child.id);
            result.push(...descendants);
        }

        return result;
    }

    async getAvailableServices(userId: string, filters: {
        search?: string;
        categoryId?: string;
        onlyActive?: boolean;
    }) {
        const clinicId = await this.getClinicId(userId);

        // If categoryId is provided, get all descendant category IDs
        let categoryIds: string[] | undefined;
        if (filters.categoryId) {
            categoryIds = await this.getDescendantCategoryIds(filters.categoryId);
        }

        const where: any = {
            isActive: true,
            ...(categoryIds && categoryIds.length > 0 && {
                categoryId: { in: categoryIds }
            }),
            ...(filters.search && {
                OR: [
                    { nameUz: { contains: filters.search, mode: 'insensitive' } },
                    { nameRu: { contains: filters.search, mode: 'insensitive' } },
                ],
            }),
        };

        const services = await prisma.diagnosticService.findMany({
            where,
            include: {
                category: { select: { id: true, nameUz: true, nameRu: true, level: true } },
                clinicLinks: {
                    where: { clinicId },
                    include: {
                        customization: {
                            include: {
                                images: { orderBy: { order: 'asc' } },
                            },
                        },
                    },
                },
            },
            orderBy: [
                { category: { level: 'asc' } },
                { nameUz: 'asc' },
            ],
        });

        const result = services.map(s => {
            const link = s.clinicLinks[0];
            if (!link) {
                return {
                    id: s.id,
                    nameUz: s.nameUz,
                    nameRu: s.nameRu,
                    descriptionUz: s.shortDescription,
                    priceMin: s.priceMin,
                    priceMax: s.priceMax,
                    priceRecommended: s.priceRecommended,
                    durationMinutes: s.durationMinutes,
                    shortDescription: s.shortDescription,
                    category: s.category,
                    clinicService: null,
                };
            }

            const cust = link.customization;
            return {
                id: s.id,
                nameUz: s.nameUz,
                nameRu: s.nameRu,
                descriptionUz: s.shortDescription,
                priceMin: s.priceMin,
                priceMax: s.priceMax,
                priceRecommended: s.priceRecommended,
                durationMinutes: s.durationMinutes,
                shortDescription: s.shortDescription,
                category: s.category,
                clinicService: {
                    id: link.id,
                    clinicId: link.clinicId,
                    serviceId: link.diagnosticServiceId,
                    isActive: link.isActive,
                    // Merged display fields
                    displayNameUz: cust?.customNameUz || s.nameUz,
                    displayNameRu: cust?.customNameRu || s.nameRu,
                    displayDescriptionUz: cust?.customDescriptionUz || s.shortDescription,
                    displayDescriptionRu: cust?.customDescriptionRu || null,
                    preparationUz: cust?.preparationUz || null,
                    benefits: cust?.benefits || null,
                    tags: cust?.tags || [],
                    customCategory: cust?.customCategory || null,
                    estimatedDuration: cust?.estimatedDurationMinutes || null,
                    isHighlighted: cust?.isHighlighted || false,
                    customPrice: cust?.customPrice ?? null,
                    discountPercent: cust?.discountPercent ?? null,
                    images: cust?.images || [],
                    hasCustomization: !!cust,
                },
            };
        });

        if (filters.onlyActive) {
            return result.filter(s => s.clinicService?.isActive === true);
        }
        return result;
    }

    async activateService(userId: string, serviceId: string) {
        const clinicId = await this.getClinicId(userId);

        const service = await prisma.diagnosticService.findFirst({
            where: { id: serviceId, isActive: true },
        });
        if (!service) throw new AppError('Xizmat topilmadi', 404, ErrorCodes.NOT_FOUND);

        const existing = await prisma.clinicDiagnosticService.findFirst({
            where: { clinicId, diagnosticServiceId: serviceId },
        });

        if (existing) {
            return prisma.clinicDiagnosticService.update({
                where: { id: existing.id },
                data: { isActive: true },
            });
        }

        return prisma.clinicDiagnosticService.create({
            data: { clinicId, diagnosticServiceId: serviceId, isActive: true },
        });
    }

    async deactivateService(userId: string, serviceId: string) {
        const clinicId = await this.getClinicId(userId);

        const link = await prisma.clinicDiagnosticService.findFirst({
            where: { clinicId, diagnosticServiceId: serviceId },
        });
        if (!link) throw new AppError('Xizmat aktivlashtirilmagan', 404, ErrorCodes.NOT_FOUND);

        return prisma.clinicDiagnosticService.update({
            where: { id: link.id },
            data: { isActive: false },
        });
    }
}

export const clinicServicesService = new ClinicServicesService();
