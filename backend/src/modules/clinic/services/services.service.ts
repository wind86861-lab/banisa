import prisma from '../../../config/database';
import { AppError, ErrorCodes } from '../../../utils/errors';
import { validateMetadataValue } from '../../metadata/metadata-validation';

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

        // Batch-fetch metadata link counts for all services
        const serviceIds = services.map(s => s.id);
        const metadataCounts = await prisma.serviceMetadataLink.groupBy({
            by: ['serviceId'],
            where: {
                serviceType: 'DIAGNOSTIC',
                serviceId: { in: serviceIds },
                template: { isActive: true },
            },
            _count: { id: true },
        });
        const metaMap = new Map(metadataCounts.map(m => [m.serviceId, m._count.id]));

        const result = services.map(s => {
            const link = s.clinicLinks[0];
            const metadataCount = metaMap.get(s.id) || 0;
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
                    metadataCount,
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
                metadataCount,
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

    async getServiceMetadata(userId: string, serviceId: string) {
        const clinicId = await this.getClinicId(userId);

        // Templates linked to this base service (active only)
        const links = await prisma.serviceMetadataLink.findMany({
            where: {
                serviceType: 'DIAGNOSTIC',
                serviceId,
                template: { isActive: true },
            },
            include: { template: true },
            orderBy: { displayOrder: 'asc' },
        });

        // This clinic's already-saved values for those templates
        const saved = await prisma.clinicServiceMetadata.findMany({
            where: { clinicId, serviceType: 'DIAGNOSTIC', serviceId },
            select: { templateId: true, value: true, valueMax: true },
        });
        const valueMap = new Map(saved.map(v => [v.templateId, v]));

        return links.map(link => {
            const v = valueMap.get(link.templateId);
            return {
                ...link.template,
                isRequired: link.isRequired,
                displayOrder: link.displayOrder,
                currentValue: v?.value ?? null,
                currentValueMax: v?.valueMax ?? null,
            };
        });
    }

    /**
     * Upsert this clinic's metadata values for a diagnostic service.
     * For NUMBER templates we treat `value` as MIN and `valueMax` as MAX (range).
     * Empty values delete the row.
     */
    async saveServiceMetadata(
        userId: string,
        serviceId: string,
        values: Array<{ templateId: string; value: string | null; valueMax?: string | null }>,
    ) {
        const clinicId = await this.getClinicId(userId);

        if (!Array.isArray(values)) {
            throw new AppError('values massiv bo\'lishi kerak', 400, ErrorCodes.VALIDATION_ERROR);
        }

        // Only templates actually linked to this service may be set
        const links = await prisma.serviceMetadataLink.findMany({
            where: {
                serviceType: 'DIAGNOSTIC',
                serviceId,
                template: { isActive: true },
            },
            include: { template: true },
        });
        const templateById = new Map(links.map(l => [l.templateId, l.template]));

        for (const { templateId, value, valueMax } of values) {
            const template = templateById.get(templateId);
            if (!template) {
                throw new AppError('Bu xizmatga bog\'lanmagan metadata', 400, ErrorCodes.VALIDATION_ERROR);
            }
            const isRange = (template as any).inputType === 'NUMBER';
            if (isRange) {
                // RANGE: clinic stores [min, max] of accepted patient values.
                // Skip the template's per-value validation (which assumed a
                // single patient value); just verify both ends are valid
                // numbers and that lo <= hi. Empty values are allowed and
                // mean "no range set" — the row will be deleted below.
                const minEmpty = value === null || value === undefined || String(value).trim() === '';
                const maxEmpty = valueMax === null || valueMax === undefined || String(valueMax).trim() === '';
                if (minEmpty && maxEmpty) continue;
                if (minEmpty || maxEmpty) {
                    throw new AppError(`${(template as any).labelUz}: min va max ikkalasini ham kiriting`, 400, ErrorCodes.VALIDATION_ERROR);
                }
                const lo = Number(value);
                const hi = Number(valueMax);
                if (!Number.isFinite(lo) || !Number.isFinite(hi)) {
                    throw new AppError(`${(template as any).labelUz}: qiymat son bo'lishi kerak`, 400, ErrorCodes.VALIDATION_ERROR);
                }
                if (lo > hi) {
                    throw new AppError(`${(template as any).labelUz}: min qiymat max'dan kichik bo'lishi kerak`, 400, ErrorCodes.VALIDATION_ERROR);
                }
            } else {
                const err = validateMetadataValue(value, template);
                if (err) throw new AppError(err, 400, ErrorCodes.VALIDATION_ERROR);
            }
        }

        await prisma.$transaction(
            values.map(({ templateId, value, valueMax }) => {
                const template = templateById.get(templateId)!;
                const isRange = (template as any).inputType === 'NUMBER';
                const minEmpty = value === null || value === undefined || String(value).trim() === '';
                const maxEmpty = valueMax === null || valueMax === undefined || String(valueMax).trim() === '';
                // Range mode requires BOTH min and max — delete row if either missing.
                const shouldDelete = isRange ? (minEmpty || maxEmpty) : minEmpty;
                if (shouldDelete) {
                    return prisma.clinicServiceMetadata.deleteMany({
                        where: { clinicId, serviceType: 'DIAGNOSTIC', serviceId, templateId },
                    });
                }
                const data: any = {
                    clinicId, serviceType: 'DIAGNOSTIC', serviceId, templateId,
                    value: String(value),
                    valueMax: isRange ? String(valueMax) : null,
                };
                const updateData: any = { value: String(value), valueMax: isRange ? String(valueMax) : null };
                return prisma.clinicServiceMetadata.upsert({
                    where: {
                        clinicId_serviceType_serviceId_templateId: {
                            clinicId, serviceType: 'DIAGNOSTIC', serviceId, templateId,
                        },
                    },
                    create: data,
                    update: updateData,
                });
            }),
        );

        return this.getServiceMetadata(userId, serviceId);
    }
}

export const clinicServicesService = new ClinicServicesService();
