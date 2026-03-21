import prisma from '../../config/database';
import { AppError, ErrorCodes } from '../../utils/errors';
import {
    CreateCheckupPackageDto,
    UpdateCheckupPackageDto,
    CheckupPackageItemInput,
    ActivateClinicCheckupPackageDto,
    UpdateClinicCheckupPackageDto
} from './types/checkup-package.types';

export class CheckupPackagesService {

    private generateSlug(text: string): string {
        return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now().toString().slice(-4);
    }

    private async resolveServiceItems(items: CheckupPackageItemInput[]) {
        const ids = items.map(i => i.diagnosticServiceId);
        const found = await prisma.diagnosticService.findMany({
            where: { id: { in: ids } },
            select: { id: true, nameUz: true, priceRecommended: true }
        });
        const dbMap = new Map(found.map(s => [s.id, s]));
        return dbMap;
    }

    // --- SUPER ADMIN ---

    private buildItemRows(items: CheckupPackageItemInput[], dbMap: Map<string, { id: string; nameUz: string; priceRecommended: number }>) {
        let totalPrice = 0;
        const rows = items.map((item, index) => {
            const db = dbMap.get(item.diagnosticServiceId);
            const name = db?.nameUz ?? item.serviceName ?? item.diagnosticServiceId;
            const price = db?.priceRecommended ?? item.servicePrice ?? 0;
            totalPrice += price * (item.quantity || 1);
            return {
                diagnosticServiceId: item.diagnosticServiceId,
                serviceName: name,
                servicePrice: price,
                quantity: item.quantity ?? 1,
                isRequired: item.isRequired ?? true,
                notes: item.notes,
                sortOrder: index
            };
        });
        return { rows, totalPrice };
    }

    async createPackage(data: CreateCheckupPackageDto, userId: string) {
        if (!data.items?.length) throw new AppError('Xizmatlar tanlanmagan', 400, ErrorCodes.VALIDATION_ERROR);

        const dbMap = await this.resolveServiceItems(data.items);
        const { rows, totalPrice } = this.buildItemRows(data.items, dbMap);

        const recommendedPrice = data.recommendedPrice ?? totalPrice;
        const discount = totalPrice > recommendedPrice ? totalPrice - recommendedPrice : 0;
        const slug = data.slug || this.generateSlug(data.nameUz);

        const existing = await prisma.checkupPackage.findUnique({ where: { slug } });
        if (existing) throw new AppError('Bunday slug mavjud', 400, ErrorCodes.DUPLICATE_ERROR);

        return await prisma.$transaction(async (tx) => {
            return await tx.checkupPackage.create({
                data: {
                    nameUz: data.nameUz,
                    nameRu: data.nameRu,
                    nameEn: data.nameEn,
                    slug,
                    category: data.category,
                    shortDescription: data.shortDescription,
                    fullDescription: data.fullDescription,
                    targetAudience: data.targetAudience,
                    recommendedPrice,
                    priceMin: data.priceMin ?? recommendedPrice,
                    priceMax: data.priceMax ?? recommendedPrice,
                    discount,
                    imageUrl: data.imageUrl,
                    createdById: userId,
                    items: { create: rows }
                },
                include: { items: true }
            });
        });
    }

    async updatePackage(id: string, data: UpdateCheckupPackageDto) {
        const pkg = await prisma.checkupPackage.findUnique({ where: { id }, include: { items: true } });
        if (!pkg) throw new AppError('Paket topilmadi', 404, ErrorCodes.NOT_FOUND);

        return await prisma.$transaction(async (tx) => {
            let itemsData: any = undefined;
            let discount = pkg.discount ?? 0;

            if (data.items?.length) {
                const dbMap = await this.resolveServiceItems(data.items);
                const { rows, totalPrice } = this.buildItemRows(data.items, dbMap);

                const recPrice = data.recommendedPrice ?? pkg.recommendedPrice;
                discount = totalPrice > recPrice ? totalPrice - recPrice : 0;

                await tx.checkupPackageItem.deleteMany({ where: { packageId: id } });
                itemsData = { create: rows };
            }

            return await tx.checkupPackage.update({
                where: { id },
                data: {
                    ...(data.nameUz !== undefined && { nameUz: data.nameUz }),
                    ...(data.nameRu !== undefined && { nameRu: data.nameRu }),
                    ...(data.nameEn !== undefined && { nameEn: data.nameEn }),
                    ...(data.slug !== undefined && { slug: data.slug }),
                    ...(data.category !== undefined && { category: data.category }),
                    ...(data.shortDescription !== undefined && { shortDescription: data.shortDescription }),
                    ...(data.fullDescription !== undefined && { fullDescription: data.fullDescription }),
                    ...(data.targetAudience !== undefined && { targetAudience: data.targetAudience }),
                    ...(data.recommendedPrice !== undefined && { recommendedPrice: data.recommendedPrice }),
                    ...(data.priceMin !== undefined && { priceMin: data.priceMin }),
                    ...(data.priceMax !== undefined && { priceMax: data.priceMax }),
                    ...(data.imageUrl !== undefined && { imageUrl: data.imageUrl }),
                    discount,
                    ...(itemsData && { items: itemsData })
                },
                include: { items: true }
            });
        });
    }

    async getPackageWithServices(id: string) {
        const pkg = await prisma.checkupPackage.findUnique({
            where: { id },
            include: {
                items: {
                    orderBy: { sortOrder: 'asc' }
                }
            }
        });

        if (!pkg) throw new AppError('Paket topilmadi', 404, ErrorCodes.NOT_FOUND);
        return pkg;
    }

    async getAllPackages(query: any) {
        const { page = 1, limit = 10, search, category, status } = query;
        const skip = (Number(page) - 1) * Number(limit);

        const where: any = {};
        if (search) {
            where.OR = [
                { nameUz: { contains: search, mode: 'insensitive' } },
                { nameRu: { contains: search, mode: 'insensitive' } }
            ];
        }
        if (category) where.category = category;
        if (status !== undefined) where.isActive = status === 'true';

        const [items, total] = await Promise.all([
            prisma.checkupPackage.findMany({
                where,
                skip,
                take: Number(limit),
                orderBy: { createdAt: 'desc' },
                include: {
                    _count: { select: { items: true, clinicPackages: true } }
                }
            }),
            prisma.checkupPackage.count({ where })
        ]);

        return {
            items,
            meta: {
                total,
                page: Number(page),
                limit: Number(limit),
                totalPages: Math.ceil(total / Number(limit))
            }
        };
    }

    async deletePackage(id: string) {
        const activeClinics = await prisma.clinicCheckupPackage.count({
            where: { packageId: id, isActive: true }
        });
        if (activeClinics > 0) {
            throw new AppError('Ushbu paket klinikalarda faol qilingan, uni o\'chirish mumkin emas', 400, ErrorCodes.VALIDATION_ERROR);
        }
        return await prisma.checkupPackage.update({
            where: { id },
            data: { isActive: false }
        });
    }

    async togglePackageStatus(id: string, isActive: boolean) {
        return await prisma.checkupPackage.update({
            where: { id },
            data: { isActive }
        });
    }

    // --- CLINIC ADMIN ---

    async getClinicAvailablePackages(clinicId: string) {
        // Find all packages NOT activated by this clinic
        const activeIds = await prisma.clinicCheckupPackage.findMany({
            where: { clinicId },
            select: { packageId: true }
        }).then(res => res.map(r => r.packageId));

        return await prisma.checkupPackage.findMany({
            where: {
                isActive: true,
                id: { notIn: activeIds }
            },
            include: {
                _count: { select: { items: true } }
            }
        });
    }

    async activateClinicPackage(clinicId: string, data: ActivateClinicCheckupPackageDto) {
        const pkg = await prisma.checkupPackage.findUnique({ where: { id: data.packageId } });
        if (!pkg) throw new AppError('Paket topilmadi', 404, ErrorCodes.NOT_FOUND);
        if (!pkg.isActive) throw new AppError('Kechirasiz, bud paket hozircha nofaol', 400, ErrorCodes.VALIDATION_ERROR);

        if (data.clinicPrice < pkg.priceMin || data.clinicPrice > pkg.priceMax) {
            throw new AppError(`Narx oralig'i: ${pkg.priceMin} - ${pkg.priceMax} UZS`, 400, ErrorCodes.VALIDATION_ERROR);
        }

        const existing = await prisma.clinicCheckupPackage.findUnique({
            where: { clinicId_packageId: { clinicId, packageId: data.packageId } }
        });

        if (existing) {
            if (existing.isActive) throw new AppError('Ushbu paket allaqachon faollashtirilgan', 400, ErrorCodes.DUPLICATE_ERROR);
            // Re-activate
            return await prisma.clinicCheckupPackage.update({
                where: { id: existing.id },
                data: { isActive: true, clinicPrice: data.clinicPrice, customNotes: data.customNotes }
            });
        }

        return await prisma.clinicCheckupPackage.create({
            data: {
                clinicId,
                packageId: data.packageId,
                clinicPrice: data.clinicPrice,
                customNotes: data.customNotes
            }
        });
    }

    async getClinicActivatedPackages(clinicId: string) {
        return await prisma.clinicCheckupPackage.findMany({
            where: { clinicId },
            include: {
                package: {
                    include: {
                        _count: { select: { items: true } }
                    }
                }
            },
            orderBy: { bookingCount: 'desc' }
        });
    }

    async updateClinicPackage(id: string, clinicId: string, data: UpdateClinicCheckupPackageDto) {
        const cp = await prisma.clinicCheckupPackage.findUnique({
            where: { id },
            include: { package: true }
        });
        if (!cp || cp.clinicId !== clinicId) throw new AppError('Topilmadi', 404, ErrorCodes.NOT_FOUND);

        if (data.clinicPrice) {
            if (data.clinicPrice < cp.package.priceMin || data.clinicPrice > cp.package.priceMax) {
                throw new AppError(`Narx oralig'i: ${cp.package.priceMin} - ${cp.package.priceMax} UZS`, 400, ErrorCodes.VALIDATION_ERROR);
            }
        }

        return await prisma.clinicCheckupPackage.update({
            where: { id },
            data: {
                clinicPrice: data.clinicPrice,
                customNotes: data.customNotes
            }
        });
    }

    async deactivateClinicPackage(id: string, clinicId: string) {
        const cp = await prisma.clinicCheckupPackage.findUnique({ where: { id } });
        if (!cp || cp.clinicId !== clinicId) throw new AppError('Topilmadi', 404, ErrorCodes.NOT_FOUND);

        return await prisma.clinicCheckupPackage.update({
            where: { id },
            data: { isActive: false }
        });
    }

    // --- PUBLIC ---

    async getPublicPackages(query: any) {
        const { clinicId, category, search, minPrice, maxPrice } = query;
        if (!clinicId) throw new AppError('Clinic ID talab qilinadi', 400, ErrorCodes.VALIDATION_ERROR);

        const where: any = { clinicId, isActive: true };
        if (minPrice || maxPrice) {
            where.clinicPrice = {};
            if (minPrice) where.clinicPrice.gte = Number(minPrice);
            if (maxPrice) where.clinicPrice.lte = Number(maxPrice);
        }
        if (category) {
            where.package = { category };
        }
        if (search) {
            where.package = {
                ...where.package,
                OR: [
                    { nameUz: { contains: search, mode: 'insensitive' } },
                    { nameRu: { contains: search, mode: 'insensitive' } }
                ]
            };
        }

        return await prisma.clinicCheckupPackage.findMany({
            where,
            include: {
                package: {
                    include: { _count: { select: { items: true } } }
                }
            }
        });
    }

    async getPublicPackageById(id: string) {
        const cp = await prisma.clinicCheckupPackage.findUnique({
            where: { id },
            include: {
                package: {
                    include: {
                        items: {
                            orderBy: { sortOrder: 'asc' }
                        }
                    }
                },
                clinic: {
                    select: { id: true, nameUz: true, logo: true, averageRating: true, street: true }
                }
            }
        });
        if (!cp || !cp.isActive || !cp.package.isActive) {
            throw new AppError('Paket topilmadi', 404, ErrorCodes.NOT_FOUND);
        }

        const { averageRating, ...clinicData } = cp.clinic;
        return {
            ...cp,
            clinic: {
                ...clinicData,
                rating: averageRating
            }
        };
    }
}

export const checkupPackagesService = new CheckupPackagesService();
