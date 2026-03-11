import prisma from '../../../config/database';
import { AppError, ErrorCodes } from '../../../utils/errors';

export class ClinicCheckupService {

    private async getClinicId(userId: string): Promise<string> {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { clinicId: true },
        });
        if (!user?.clinicId) throw new AppError('Klinika topilmadi', 404, ErrorCodes.NOT_FOUND);
        return user.clinicId;
    }

    async getAvailablePackages(userId: string) {
        const clinicId = await this.getClinicId(userId);

        const packages = await prisma.checkupPackage.findMany({
            where: { isActive: true },
            include: {
                items: { orderBy: { sortOrder: 'asc' } },
                clinicPackages: { where: { clinicId } },
            },
            orderBy: { createdAt: 'asc' },
        });

        return packages.map(pkg => ({
            id: pkg.id,
            nameUz: pkg.nameUz,
            nameRu: pkg.nameRu,
            category: pkg.category,
            shortDescription: pkg.shortDescription,
            priceMin: pkg.priceMin,
            priceMax: pkg.priceMax,
            recommendedPrice: pkg.recommendedPrice,
            items: pkg.items.map(item => ({
                id: item.id,
                diagnosticServiceId: item.diagnosticServiceId,
                serviceName: item.serviceName,
                servicePrice: item.servicePrice,
                quantity: item.quantity,
                isRequired: item.isRequired,
            })),
            clinicPackage: pkg.clinicPackages[0]
                ? {
                    id: pkg.clinicPackages[0].id,
                    clinicPrice: pkg.clinicPackages[0].clinicPrice,
                    isActive: pkg.clinicPackages[0].isActive,
                    customNotes: pkg.clinicPackages[0].customNotes,
                }
                : null,
        }));
    }

    async activatePackage(userId: string, data: {
        packageId: string;
        clinicPrice: number;
        customNotes?: string;
    }) {
        const clinicId = await this.getClinicId(userId);

        const pkg = await prisma.checkupPackage.findUnique({
            where: { id: data.packageId },
            include: { items: true },
        });
        if (!pkg) throw new AppError('Paket topilmadi', 404, ErrorCodes.NOT_FOUND);
        if (!pkg.isActive) throw new AppError('Bu paket nofaol', 400, ErrorCodes.VALIDATION_ERROR);

        if (data.clinicPrice < pkg.priceMin || data.clinicPrice > pkg.priceMax) {
            throw new AppError(
                `Narx ${pkg.priceMin.toLocaleString()} – ${pkg.priceMax.toLocaleString()} UZS oralig'ida bo'lishi kerak`,
                400,
                ErrorCodes.VALIDATION_ERROR,
            );
        }

        // Verify all required package items have been activated by this clinic
        const requiredIds = pkg.items.filter(i => i.isRequired).map(i => i.diagnosticServiceId);
        if (requiredIds.length > 0) {
            const activated = await prisma.clinicDiagnosticService.findMany({
                where: { clinicId, diagnosticServiceId: { in: requiredIds }, isActive: true },
            });

            if (activated.length !== requiredIds.length) {
                const activatedSet = new Set(activated.map(s => s.diagnosticServiceId));
                const missingIds = requiredIds.filter(id => !activatedSet.has(id));

                const missingServices = await prisma.diagnosticService.findMany({
                    where: { id: { in: missingIds } },
                    select: { nameUz: true },
                });

                throw new AppError(
                    `Avval quyidagi xizmatlarni aktivlashtiring: ${missingServices.map(s => s.nameUz).join(', ')}`,
                    400,
                    ErrorCodes.VALIDATION_ERROR,
                );
            }
        }

        const existing = await prisma.clinicCheckupPackage.findUnique({
            where: { clinicId_packageId: { clinicId, packageId: data.packageId } },
        });

        if (existing) {
            return prisma.clinicCheckupPackage.update({
                where: { id: existing.id },
                data: { isActive: true, clinicPrice: data.clinicPrice, customNotes: data.customNotes },
            });
        }

        return prisma.clinicCheckupPackage.create({
            data: { clinicId, packageId: data.packageId, clinicPrice: data.clinicPrice, customNotes: data.customNotes },
        });
    }

    async updatePackage(userId: string, id: string, data: {
        clinicPrice?: number;
        isActive?: boolean;
        customNotes?: string;
    }) {
        const clinicId = await this.getClinicId(userId);

        const cp = await prisma.clinicCheckupPackage.findUnique({
            where: { id },
            include: { package: true },
        });
        if (!cp || cp.clinicId !== clinicId) throw new AppError('Topilmadi', 404, ErrorCodes.NOT_FOUND);

        if (data.clinicPrice !== undefined) {
            if (data.clinicPrice < cp.package.priceMin || data.clinicPrice > cp.package.priceMax) {
                throw new AppError(
                    `Narx ${cp.package.priceMin} – ${cp.package.priceMax} UZS oralig'ida bo'lishi kerak`,
                    400,
                    ErrorCodes.VALIDATION_ERROR,
                );
            }
        }

        return prisma.clinicCheckupPackage.update({
            where: { id },
            data: {
                ...(data.clinicPrice !== undefined && { clinicPrice: data.clinicPrice }),
                ...(data.isActive !== undefined && { isActive: data.isActive }),
                ...(data.customNotes !== undefined && { customNotes: data.customNotes }),
            },
        });
    }

    async deactivatePackage(userId: string, id: string) {
        const clinicId = await this.getClinicId(userId);
        const cp = await prisma.clinicCheckupPackage.findUnique({ where: { id } });
        if (!cp || cp.clinicId !== clinicId) throw new AppError('Topilmadi', 404, ErrorCodes.NOT_FOUND);

        return prisma.clinicCheckupPackage.update({ where: { id }, data: { isActive: false } });
    }
}

export const clinicCheckupService = new ClinicCheckupService();
