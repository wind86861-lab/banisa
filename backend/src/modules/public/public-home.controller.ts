import { Request, Response, NextFunction } from 'express';
import prisma from '../../config/database';
import { sendSuccess } from '../../utils/response';
import { ClinicStatus } from '@prisma/client';

/**
 * GET /api/public/home
 * Aggregate endpoint that returns everything the marketplace home page needs.
 * Pure read, no auth, cacheable.
 */
export const getHome = async (_req: Request, res: Response, next: NextFunction) => {
    try {
        const APPROVED_ACTIVE = { status: ClinicStatus.APPROVED, isActive: true };

        const [
            clinicCount,
            diagnosticCount,
            surgicalCount,
            checkupCount,
            sanatoriumCount,
            completedAppointmentCount,
            avgRatingAgg,
            topClinicsRaw,
            hotDiagnostic,
            topReviews,
            popularDiagnostic,
        ] = await Promise.all([
            prisma.clinic.count({ where: APPROVED_ACTIVE }),
            prisma.clinicDiagnosticService.count({ where: { isActive: true, clinic: APPROVED_ACTIVE } }),
            prisma.clinicSurgicalService.count({ where: { isActive: true, clinic: APPROVED_ACTIVE } }),
            prisma.clinicCheckupPackage.count({ where: { isActive: true, clinic: APPROVED_ACTIVE } }),
            prisma.clinicSanatoriumService.count({ where: { isActive: true, clinic: APPROVED_ACTIVE } }),
            prisma.appointment.count({ where: { status: 'COMPLETED' } }),
            prisma.clinic.aggregate({
                where: { ...APPROVED_ACTIVE, reviewCount: { gt: 0 } },
                _avg: { averageRating: true },
            }),
            // Top clinics by rating + review count
            prisma.clinic.findMany({
                where: APPROVED_ACTIVE,
                orderBy: [{ averageRating: 'desc' }, { reviewCount: 'desc' }],
                take: 6,
                select: {
                    id: true, nameUz: true, nameRu: true, logo: true, coverImage: true,
                    type: true, region: true, district: true, street: true,
                    averageRating: true, reviewCount: true, workingHours: true,
                    _count: {
                        select: {
                            diagnosticServices: { where: { isActive: true } },
                            surgicalServices: { where: { isActive: true } },
                        },
                    },
                },
            }),
            // Hot deals — diagnostic services with active discounts
            prisma.clinicDiagnosticService.findMany({
                where: {
                    isActive: true,
                    clinic: APPROVED_ACTIVE,
                    customization: { discountPercent: { gt: 0 } },
                },
                orderBy: { customization: { discountPercent: 'desc' } },
                take: 12,
                include: {
                    diagnosticService: {
                        select: {
                            id: true, nameUz: true, nameRu: true,
                            priceMin: true, priceRecommended: true, durationMinutes: true,
                            category: { select: { nameUz: true } },
                        },
                    },
                    customization: {
                        select: {
                            customNameUz: true, customPrice: true, discountPercent: true,
                            images: { select: { url: true, isPrimary: true }, take: 1 },
                        },
                    },
                    clinic: {
                        select: { id: true, nameUz: true, logo: true, averageRating: true, reviewCount: true },
                    },
                },
            }),
            // Recent positive reviews (rating >= 4) with comment
            prisma.review.findMany({
                where: { isActive: true, rating: { gte: 4 }, comment: { not: null } },
                orderBy: { createdAt: 'desc' },
                take: 9,
                include: {
                    user: { select: { firstName: true, lastName: true, phone: true } },
                    clinic: { select: { id: true, nameUz: true, logo: true } },
                },
            }),
            // Popular: diagnostic services that have most clinic links
            prisma.diagnosticService.findMany({
                where: { isActive: true, clinicLinks: { some: { isActive: true, clinic: APPROVED_ACTIVE } } },
                orderBy: { clinicLinks: { _count: 'desc' } },
                take: 8,
                select: {
                    id: true, nameUz: true, nameRu: true,
                    priceMin: true, priceRecommended: true,
                    category: { select: { nameUz: true } },
                    _count: { select: { clinicLinks: { where: { isActive: true } } } },
                },
            }),
        ]);

        // Shape hot deals
        const hotDeals = hotDiagnostic.map((link: any) => {
            const s = link.diagnosticService;
            const cust = link.customization;
            const basePrice = cust?.customPrice ?? s.priceRecommended ?? s.priceMin ?? 0;
            const discount = cust?.discountPercent ?? 0;
            const finalPrice = discount > 0 ? Math.round(basePrice * (1 - discount / 100)) : basePrice;
            return {
                id: s.id,
                type: 'DIAGNOSTIC',
                nameUz: cust?.customNameUz ?? s.nameUz,
                nameRu: s.nameRu,
                category: s.category?.nameUz ?? '',
                price: finalPrice,
                originalPrice: basePrice,
                discountPercent: discount,
                duration: s.durationMinutes ?? null,
                image: cust?.images?.[0]?.url ?? null,
                clinic: link.clinic
                    ? {
                          id: link.clinic.id,
                          nameUz: link.clinic.nameUz,
                          logo: link.clinic.logo,
                          rating: link.clinic.averageRating ?? 0,
                          reviewCount: link.clinic.reviewCount ?? 0,
                      }
                    : null,
            };
        });

        // Shape top clinics — compute isOpen using workingHours
        const topClinics = topClinicsRaw.map((c: any) => ({
            id: c.id,
            nameUz: c.nameUz,
            nameRu: c.nameRu,
            logo: c.logo,
            coverImage: c.coverImage,
            type: c.type,
            region: c.region,
            district: c.district,
            street: c.street,
            rating: c.averageRating ?? 0,
            reviewCount: c.reviewCount ?? 0,
            isOpen: computeIsOpen(c.workingHours),
            servicesCount: (c._count?.diagnosticServices ?? 0) + (c._count?.surgicalServices ?? 0),
        }));

        // Shape reviews
        const reviews = topReviews.map((r: any) => ({
            id: r.id,
            rating: r.rating,
            comment: r.comment,
            createdAt: r.createdAt,
            user: {
                name: [r.user?.firstName, r.user?.lastName?.[0]].filter(Boolean).join(' ') || 'Bemor',
            },
            clinic: r.clinic ? { id: r.clinic.id, nameUz: r.clinic.nameUz, logo: r.clinic.logo } : null,
        }));

        // Popular services — add clinic count
        const popularServices = popularDiagnostic.map((s: any) => ({
            id: s.id,
            nameUz: s.nameUz,
            nameRu: s.nameRu,
            category: s.category?.nameUz ?? '',
            startPrice: s.priceMin ?? s.priceRecommended ?? 0,
            clinicCount: s._count?.clinicLinks ?? 0,
        }));

        sendSuccess(res, {
            stats: {
                clinicCount,
                serviceCount: diagnosticCount + surgicalCount + checkupCount + sanatoriumCount,
                completedAppointmentCount,
                averageRating: Number((avgRatingAgg._avg.averageRating ?? 0).toFixed(1)),
                breakdown: {
                    diagnostic: diagnosticCount,
                    surgical: surgicalCount,
                    checkup: checkupCount,
                    sanatorium: sanatoriumCount,
                },
            },
            categories: [
                { id: 'diagnostic', label: 'Diagnostika', icon: 'flask', count: diagnosticCount, color: 'turquoise' },
                { id: 'surgical', label: 'Jarrohlik', icon: 'surgical', count: surgicalCount, color: 'coral' },
                { id: 'checkup', label: 'Checkup', icon: 'clipboard', count: checkupCount, color: 'purple' },
                { id: 'sanatorium', label: 'Sanatoriya', icon: 'leaf', count: sanatoriumCount, color: 'green' },
            ].filter((c) => c.count > 0),
            hotDeals,
            topClinics,
            popularServices,
            reviews,
        });
    } catch (err) {
        next(err);
    }
};

/**
 * GET /api/public/search/autocomplete?q=...
 * Combined search across services and clinics for the hero search bar.
 */
export const autocomplete = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const q = String(req.query.q || '').trim();
        if (q.length < 2) {
            return sendSuccess(res, { services: [], clinics: [] });
        }

        const APPROVED_ACTIVE = { status: ClinicStatus.APPROVED, isActive: true };
        const containsOrInsensitive = { contains: q, mode: 'insensitive' as const };

        const [diagnostic, surgical, clinics] = await Promise.all([
            prisma.diagnosticService.findMany({
                where: {
                    isActive: true,
                    OR: [{ nameUz: containsOrInsensitive }, { nameRu: containsOrInsensitive }],
                },
                take: 6,
                select: {
                    id: true, nameUz: true, nameRu: true,
                    category: { select: { nameUz: true } },
                    _count: { select: { clinicLinks: { where: { isActive: true } } } },
                },
            }),
            prisma.surgicalService.findMany({
                where: {
                    isActive: true,
                    OR: [{ nameUz: containsOrInsensitive }, { nameRu: containsOrInsensitive }],
                },
                take: 4,
                select: {
                    id: true, nameUz: true, nameRu: true,
                    category: { select: { nameUz: true } },
                    _count: { select: { clinicLinks: { where: { isActive: true } } } },
                },
            }),
            prisma.clinic.findMany({
                where: {
                    ...APPROVED_ACTIVE,
                    OR: [{ nameUz: containsOrInsensitive }, { nameRu: containsOrInsensitive }],
                },
                take: 5,
                orderBy: [{ averageRating: 'desc' }, { reviewCount: 'desc' }],
                select: {
                    id: true, nameUz: true, logo: true, district: true, region: true,
                    averageRating: true, reviewCount: true,
                },
            }),
        ]);

        const services = [
            ...diagnostic.map((s: any) => ({
                id: s.id, type: 'DIAGNOSTIC',
                nameUz: s.nameUz, nameRu: s.nameRu,
                category: s.category?.nameUz ?? '',
                clinicCount: s._count?.clinicLinks ?? 0,
            })),
            ...surgical.map((s: any) => ({
                id: s.id, type: 'SURGICAL',
                nameUz: s.nameUz, nameRu: s.nameRu,
                category: s.category?.nameUz ?? '',
                clinicCount: s._count?.clinicLinks ?? 0,
            })),
        ];

        sendSuccess(res, { services, clinics });
    } catch (err) {
        next(err);
    }
};

// ─── helpers ──────────────────────────────────────────────────────

function computeIsOpen(rawWh: any): boolean | null {
    if (!rawWh || typeof rawWh !== 'object') return null;
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const todayKey = days[new Date().getDay()];
    const day = rawWh[todayKey];
    if (!day) return null;
    const isOpen = day.isOpen !== undefined ? day.isOpen : (day.isDayOff !== undefined ? !day.isDayOff : true);
    if (!isOpen) return false;
    const now = new Date();
    const cur = now.getHours() * 60 + now.getMinutes();
    const open = parseTime(day.openTime ?? day.open ?? day.start ?? '08:00');
    const close = parseTime(day.closeTime ?? day.close ?? day.end ?? '18:00');
    return cur >= open && cur < close;
}

function parseTime(s: string): number {
    const [h, m] = String(s).split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
}
