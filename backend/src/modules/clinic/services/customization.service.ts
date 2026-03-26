import prisma from '../../../config/database';
import { AppError, ErrorCodes } from '../../../utils/errors';

export class CustomizationService {

    private async getClinicId(userId: string): Promise<string> {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { clinicId: true },
        });
        if (!user?.clinicId) throw new AppError('Klinika topilmadi', 404, ErrorCodes.NOT_FOUND);
        return user.clinicId;
    }

    private async verifyOwnership(clinicServiceId: string, clinicId: string) {
        const clinicService = await prisma.clinicDiagnosticService.findUnique({
            where: { id: clinicServiceId },
        });

        if (!clinicService) {
            throw new AppError('Xizmat topilmadi', 404, ErrorCodes.NOT_FOUND);
        }

        if (clinicService.clinicId !== clinicId) {
            throw new AppError('Ruxsat berilmagan', 403, ErrorCodes.FORBIDDEN);
        }

        return clinicService;
    }

    // ─── GET ────────────────────────────────────────────────────────────────
    async getCustomization(userId: string, clinicServiceId: string) {
        const clinicId = await this.getClinicId(userId);
        await this.verifyOwnership(clinicServiceId, clinicId);

        return prisma.serviceCustomization.findUnique({
            where: { clinicServiceId },
            include: {
                images: { orderBy: { order: 'asc' } },
            },
        });
    }

    // ─── UPSERT ─────────────────────────────────────────────────────────────
    async upsertCustomization(userId: string, clinicServiceId: string, data: any) {
        const clinicId = await this.getClinicId(userId);
        await this.verifyOwnership(clinicServiceId, clinicId);

        // Strip fields that shouldn't be in Prisma data
        const { clinicServiceId: _csId, id: _id, createdAt: _ca, updatedAt: _ua, images: _imgs, clinicService: _cs, ...cleanData } = data;

        return prisma.serviceCustomization.upsert({
            where: { clinicServiceId },
            create: { clinicServiceId, ...cleanData },
            update: cleanData,
            include: {
                images: { orderBy: { order: 'asc' } },
            },
        });
    }

    // ─── DELETE ──────────────────────────────────────────────────────────────
    async deleteCustomization(userId: string, clinicServiceId: string) {
        const clinicId = await this.getClinicId(userId);
        await this.verifyOwnership(clinicServiceId, clinicId);

        const existing = await prisma.serviceCustomization.findUnique({
            where: { clinicServiceId },
        });
        if (!existing) {
            throw new AppError('Moslashtirish topilmadi', 404, ErrorCodes.NOT_FOUND);
        }

        await prisma.serviceCustomization.delete({
            where: { clinicServiceId },
        });

        return { message: 'Moslashtirish o\'chirildi' };
    }

    // ─── UPLOAD IMAGE ───────────────────────────────────────────────────────
    async uploadImage(userId: string, clinicServiceId: string, fileUrl: string, alt?: string) {
        const clinicId = await this.getClinicId(userId);
        await this.verifyOwnership(clinicServiceId, clinicId);

        // Get or create customization
        let customization = await prisma.serviceCustomization.findUnique({
            where: { clinicServiceId },
        });
        if (!customization) {
            customization = await prisma.serviceCustomization.create({
                data: { clinicServiceId },
            });
        }

        // Check limit (max 5)
        const imageCount = await prisma.serviceImage.count({
            where: { customizationId: customization.id },
        });
        if (imageCount >= 5) {
            throw new AppError('Maksimum 5 ta rasm ruxsat etiladi', 400, ErrorCodes.VALIDATION_ERROR);
        }

        return prisma.serviceImage.create({
            data: {
                customizationId: customization.id,
                url: fileUrl,
                alt: alt || '',
                order: imageCount + 1,
                isPrimary: imageCount === 0,
            },
        });
    }

    // ─── DELETE IMAGE ───────────────────────────────────────────────────────
    async deleteImage(userId: string, clinicServiceId: string, imageId: string) {
        const clinicId = await this.getClinicId(userId);
        await this.verifyOwnership(clinicServiceId, clinicId);

        const image = await prisma.serviceImage.findUnique({
            where: { id: imageId },
            include: { customization: true },
        });
        if (!image) {
            throw new AppError('Rasm topilmadi', 404, ErrorCodes.NOT_FOUND);
        }

        // If deleting primary, promote next image
        if (image.isPrimary) {
            const next = await prisma.serviceImage.findFirst({
                where: { customizationId: image.customizationId, id: { not: imageId } },
                orderBy: { order: 'asc' },
            });
            if (next) {
                await prisma.serviceImage.update({
                    where: { id: next.id },
                    data: { isPrimary: true },
                });
            }
        }

        await prisma.serviceImage.delete({ where: { id: imageId } });
        return { message: 'Rasm o\'chirildi' };
    }

    // ─── REORDER IMAGES ─────────────────────────────────────────────────────
    async reorderImages(userId: string, clinicServiceId: string, imageIds: string[]) {
        const clinicId = await this.getClinicId(userId);
        await this.verifyOwnership(clinicServiceId, clinicId);

        await Promise.all(
            imageIds.map((imageId, index) =>
                prisma.serviceImage.update({
                    where: { id: imageId },
                    data: { order: index + 1 },
                }),
            ),
        );

        return { message: 'Rasmlar tartibi yangilandi' };
    }

    // ─── SET PRIMARY IMAGE ──────────────────────────────────────────────────
    async setPrimaryImage(userId: string, clinicServiceId: string, imageId: string) {
        const clinicId = await this.getClinicId(userId);
        await this.verifyOwnership(clinicServiceId, clinicId);

        const image = await prisma.serviceImage.findUnique({
            where: { id: imageId },
            include: { customization: true },
        });
        if (!image) {
            throw new AppError('Rasm topilmadi', 404, ErrorCodes.NOT_FOUND);
        }

        // Unset current primary
        await prisma.serviceImage.updateMany({
            where: { customizationId: image.customizationId, isPrimary: true },
            data: { isPrimary: false },
        });

        // Set new primary
        await prisma.serviceImage.update({
            where: { id: imageId },
            data: { isPrimary: true },
        });

        return { message: 'Asosiy rasm yangilandi' };
    }
}

export const customizationService = new CustomizationService();
