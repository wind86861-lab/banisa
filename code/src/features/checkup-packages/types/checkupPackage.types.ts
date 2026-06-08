export type CheckupCategory = 'BASIC' | 'SPECIALIZED' | 'AGE_BASED';

export interface CheckupPackageItem {
    id: string;
    packageId: string;
    diagnosticServiceId: string;
    serviceName: string;
    servicePrice: number;
    quantity: number;
    isRequired: boolean;
    notes?: string;
    sortOrder: number;
}

export interface CheckupPackage {
    id: string;
    nameUz: string;
    nameRu?: string;
    nameEn?: string;
    slug: string;
    category: CheckupCategory;
    shortDescription?: string;
    fullDescription?: string;
    targetAudience?: string;
    recommendedPrice: number;
    priceMin: number;
    priceMax: number;
    discount: number;
    imageUrl?: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    items?: CheckupPackageItem[];
    _count?: {
        items: number;
        clinicPackages: number;
    };
}

export interface ClinicCheckupPackage {
    id: string;
    clinicId: string;
    packageId: string;
    package: CheckupPackage;
    clinicPrice: number;
    itemPrices?: Record<string, number> | null;
    customNotes?: string;
    isActive: boolean;
    bookingCount: number;
    activatedAt: string;
    updatedAt: string;
    clinic?: {
        id: string;
        nameUz: string;
        logo?: string;
        rating?: number;
        street?: string;
    }
}

export interface CheckupPackageFilters {
    page?: number;
    limit?: number;
    search?: string;
    category?: CheckupCategory;
    status?: boolean | string;
}

export interface PublicCheckupPackageFilters {
    clinicId: string;
    category?: CheckupCategory;
    search?: string;
    minPrice?: number;
    maxPrice?: number;
}

export interface PaginatedResponse<T> {
    items: T[];
    meta: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }
}
