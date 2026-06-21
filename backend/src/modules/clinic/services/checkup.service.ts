import prisma from '../../../config/database';
import { AppError, ErrorCodes } from '../../../utils/errors';

/**
 * Clinic-side checkup package service.
 *
 * Pricing rule:
 *  - itemPrices is the source of truth (keyed by CheckupPackageItem.id).
 *  - clinicPrice = sum(itemPrices[id] * quantity).
 *  - Activating a checkup auto-links any underlying ClinicDiagnosticService
 *    rows the clinic hadn't activated, using the entered per-item prices.
 *    Selling a service inside a checkup means the clinic offers that service.
 */
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

        const [packages, clinicDiagLinks] = await Promise.all([
            prisma.checkupPackage.findMany({
                where: { isActive: true },
                include: {
                    items: { orderBy: { sortOrder: 'asc' } },
                    clinicPackages: { where: { clinicId } },
                },
                orderBy: { createdAt: 'asc' },
            }),
            prisma.clinicDiagnosticService.findMany({
                where: { clinicId, isActive: true },
                select: {
                    diagnosticServiceId: true,
                    diagnosticService: { select: { priceRecommended: true } },
                    customization: { select: { customPrice: true } },
                },
            }),
        ]);

        const clinicHasDiagId = new Set<string>();
        const clinicPriceByDiagId = new Map<string, number>();
        for (const l of clinicDiagLinks) {
            clinicHasDiagId.add(l.diagnosticServiceId);
            const custom = l.customization?.customPrice;
            const fallback = l.diagnosticService?.priceRecommended;
            const effective = (typeof custom === 'number' && custom > 0)
                ? custom
                : (typeof fallback === 'number' && fallback > 0 ? fallback : null);
            if (effective !== null) clinicPriceByDiagId.set(l.diagnosticServiceId, effective);
        }

        return packages.map(pkg => {
            const cp = pkg.clinicPackages[0];
            return {
                id: pkg.id,
                nameUz: pkg.nameUz,
                nameRu: pkg.nameRu,
                category: pkg.category,
                shortDescription: pkg.shortDescription,
                fullDescription: pkg.fullDescription,
                targetAudience: pkg.targetAudience,
                imageUrl: pkg.imageUrl,
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
                    notes: item.notes,
                    sortOrder: item.sortOrder,
                    clinicServicePrice: clinicPriceByDiagId.get(item.diagnosticServiceId) ?? null,
                    clinicHasService: clinicHasDiagId.has(item.diagnosticServiceId),
                })),
                clinicPackage: cp
                    ? {
                        id: cp.id,
                        clinicPrice: cp.clinicPrice,
                        isActive: cp.isActive,
                        customNotes: cp.customNotes,
                        itemPrices: cp.itemPrices,
                        customizationData: cp.customizationData,
                    }
                    : null,
            };
        });
    }

    /**
     * Derive a clean { itemPrices, clinicPrice } pair from user input.
     * - If itemPrices provided: total = sum(price * quantity)
     * - Else if clinicPrice provided: use as-is
     * - Else throw
     */
    private normalizePrices(
        items: Array<{ id: string; servicePrice: number; quantity: number }>,
        itemPrices: Record<string, number> | undefined,
        clinicPriceInput: number | undefined,
    ): { itemPrices: Record<string, number> | null; clinicPrice: number } {
        if (itemPrices && Object.keys(itemPrices).length > 0) {
            const finalMap: Record<string, number> = {};
            let total = 0;
            for (const it of items) {
                const p = itemPrices[it.id];
                if (typeof p === 'number' && p >= 0) {
                    finalMap[it.id] = p;
                    total += p * (it.quantity || 1);
                }
            }
            if (total > 0) return { itemPrices: finalMap, clinicPrice: total };
        }
        if (typeof clinicPriceInput === 'number' && clinicPriceInput >= 0) {
            return { itemPrices: null, clinicPrice: clinicPriceInput };
        }
        throw new AppError(
            'Paket narxi kiritilmagan — har bir analiz uchun narx kiriting',
            400,
            ErrorCodes.VALIDATION_ERROR,
        );
    }

    /**
     * For each item priced by the clinic, ensure a ClinicDiagnosticService row
     * exists and is active. If the customization has no price, backfill it
     * with the price the clinic entered for this checkup item. Never overrides
     * a price the clinic already set.
     */
    private async ensureClinicDiagnosticsForItems(
        clinicId: string,
        items: Array<{ id: string; diagnosticServiceId: string }>,
        itemPrices: Record<string, number> | null,
    ) {
        if (!itemPrices) return;
        const diagIds = items.map(i => i.diagnosticServiceId);
        if (diagIds.length === 0) return;
        const existingLinks = await prisma.clinicDiagnosticService.findMany({
            where: { clinicId, diagnosticServiceId: { in: diagIds } },
            select: {
                id: true,
                diagnosticServiceId: true,
                isActive: true,
                customization: { select: { id: true, customPrice: true } },
            },
        });
        const linkByDiag = new Map(existingLinks.map(l => [l.diagnosticServiceId, l]));

        for (const it of items) {
            const price = itemPrices[it.id];
            if (typeof price !== 'number' || price <= 0) continue;
            const link = linkByDiag.get(it.diagnosticServiceId);

            if (!link) {
                await prisma.clinicDiagnosticService.create({
                    data: {
                        clinicId,
                        diagnosticServiceId: it.diagnosticServiceId,
                        isActive: true,
                        customization: { create: { customPrice: price } },
                    },
                });
                continue;
            }
            if (!link.isActive) {
                await prisma.clinicDiagnosticService.update({
                    where: { id: link.id },
                    data: { isActive: true },
                });
            }
            if (!link.customization) {
                await prisma.serviceCustomization.create({
                    data: { clinicServiceId: link.id, customPrice: price },
                });
            } else if (link.customization.customPrice == null || link.customization.customPrice <= 0) {
                await prisma.serviceCustomization.update({
                    where: { id: link.customization.id },
                    data: { customPrice: price },
                });
            }
        }
    }

    private clampDiscount(v: unknown): number {
        const n = Number(v ?? 0);
        if (!Number.isFinite(n) || n < 0) return 0;
        return Math.min(100, Math.round(n));
    }

    async activatePackage(userId: string, data: {
        packageId: string;
        itemPrices?: Record<string, number>;
        clinicPrice?: number;
        customNotes?: string;
        customizationData?: any;
        discountPercent?: number;
    }) {
        const clinicId = await this.getClinicId(userId);

        const pkg = await prisma.checkupPackage.findUnique({
            where: { id: data.packageId },
            include: { items: true },
        });
        if (!pkg) throw new AppError('Paket topilmadi', 404, ErrorCodes.NOT_FOUND);
        if (!pkg.isActive) throw new AppError('Bu paket nofaol', 400, ErrorCodes.VALIDATION_ERROR);

        const { itemPrices, clinicPrice } = this.normalizePrices(pkg.items, data.itemPrices, data.clinicPrice);
        const discountPercent = this.clampDiscount(data.discountPercent);

        await this.ensureClinicDiagnosticsForItems(clinicId, pkg.items, itemPrices);

        const existing = await prisma.clinicCheckupPackage.findUnique({
            where: { clinicId_packageId: { clinicId, packageId: data.packageId } },
        });

        if (existing) {
            return prisma.clinicCheckupPackage.update({
                where: { id: existing.id },
                data: {
                    isActive: true,
                    clinicPrice,
                    itemPrices: itemPrices ?? undefined,
                    discountPercent,
                    customNotes: data.customNotes,
                    customizationData: data.customizationData ?? existing.customizationData,
                },
            });
        }

        return prisma.clinicCheckupPackage.create({
            data: {
                clinicId,
                packageId: data.packageId,
                clinicPrice,
                itemPrices: itemPrices ?? undefined,
                discountPercent,
                customNotes: data.customNotes,
                customizationData: data.customizationData,
            },
        });
    }

    async updatePackage(userId: string, id: string, data: {
        itemPrices?: Record<string, number>;
        clinicPrice?: number;
        isActive?: boolean;
        customNotes?: string;
        customizationData?: any;
        discountPercent?: number;
    }) {
        const clinicId = await this.getClinicId(userId);

        const cp = await prisma.clinicCheckupPackage.findUnique({
            where: { id },
            include: { package: { include: { items: true } } },
        });
        if (!cp || cp.clinicId !== clinicId) throw new AppError('Topilmadi', 404, ErrorCodes.NOT_FOUND);

        let priceFields: { clinicPrice?: number; itemPrices?: any } = {};
        if (data.itemPrices !== undefined || data.clinicPrice !== undefined) {
            const normalized = this.normalizePrices(cp.package.items, data.itemPrices, data.clinicPrice);
            priceFields = { clinicPrice: normalized.clinicPrice, itemPrices: normalized.itemPrices ?? undefined };
            await this.ensureClinicDiagnosticsForItems(clinicId, cp.package.items, normalized.itemPrices);
        }

        return prisma.clinicCheckupPackage.update({
            where: { id },
            data: {
                ...priceFields,
                ...(data.isActive !== undefined && { isActive: data.isActive }),
                ...(data.customNotes !== undefined && { customNotes: data.customNotes }),
                ...(data.discountPercent !== undefined && {
                    discountPercent: this.clampDiscount(data.discountPercent),
                }),
                customizationData: data.customizationData
                    ? { ...((cp.customizationData as any) || {}), ...data.customizationData }
                    : cp.customizationData,
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
