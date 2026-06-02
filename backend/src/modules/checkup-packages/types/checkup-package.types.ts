import { CheckupCategory } from '@prisma/client';

export interface CheckupPackageItemInput {
    diagnosticServiceId: string;
    serviceName?: string;
    servicePrice?: number;
    quantity?: number;
    isRequired?: boolean;
    notes?: string;
}

export interface CreateCheckupPackageDto {
    nameUz: string;
    nameRu?: string;
    nameEn?: string;
    slug?: string;
    category: CheckupCategory;
    shortDescription?: string;
    fullDescription?: string;
    targetAudience?: string;
    items: CheckupPackageItemInput[];
    recommendedPrice?: number;
    priceMin?: number;
    priceMax?: number;
    imageUrl?: string;
}

export interface UpdateCheckupPackageDto extends Partial<CreateCheckupPackageDto> { }

export interface ActivateClinicCheckupPackageDto {
    packageId: string;
    clinicPrice?: number;
    itemPrices?: Record<string, number>;
    customNotes?: string;
    customizationData?: any;
}

export interface UpdateClinicCheckupPackageDto {
    clinicPrice?: number;
    itemPrices?: Record<string, number>;
    customNotes?: string;
    customizationData?: any;
}
