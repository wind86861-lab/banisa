import prisma from '../../config/database';
import { AppError, ErrorCodes } from '../../utils/errors';
import bcrypt from 'bcrypt';
import { ensureClinicAdminMemberships } from './clinic-rbac.util';

const normalizePhone = (phone: string) => phone.replace(/[\s\-()]/g, '');

// 1. List clinics with filters, search, sort
export const listClinics = async (query: any) => {
    const {
        page = 1,
        limit = 10,
        search,
        status,
        region,
        type,
        source,
        isActive,
        minRating,
        sort = 'createdAt:desc'
    } = query;

    const skip = (Number(page) - 1) * Number(limit);

    // Build where clause — no default isActive filter so admin sees all clinics
    let where: any = {};

    // Filter by isActive (explicit param: 'true' | 'false' | undefined = all)
    if (isActive === 'true') where.isActive = true;
    else if (isActive === 'false') where.isActive = false;

    // Filter by source
    if (source && source !== 'all') where.source = source;

    // Filter by status
    if (status && status !== 'all') where.status = status;

    // Filter by region
    if (region) where.region = { contains: region, mode: 'insensitive' };

    // Filter by type
    if (type) where.type = type;

    // Filter by minimum rating
    if (minRating) where.averageRating = { gte: parseFloat(minRating) };

    // Search by name or address
    if (search && search.length >= 2) {
        where.OR = [
            { nameUz: { contains: search, mode: 'insensitive' } },
            { nameRu: { contains: search, mode: 'insensitive' } },
            { region: { contains: search, mode: 'insensitive' } },
            { district: { contains: search, mode: 'insensitive' } },
        ];
    }

    // Parse sort
    const [sortField, sortOrder] = sort.split(':');
    const orderBy: any = {};

    // Handle special sort cases
    if (sortField === 'appointments') {
        // Sort by appointment count will be handled after fetching
        orderBy.createdAt = sortOrder === 'desc' ? 'desc' : 'asc';
    } else if (sortField === 'rating') {
        orderBy.averageRating = sortOrder === 'desc' ? 'desc' : 'asc';
    } else {
        orderBy[sortField] = sortOrder === 'desc' ? 'desc' : 'asc';
    }

    const [clinics, total] = await Promise.all([
        prisma.clinic.findMany({
            where,
            skip,
            take: Number(limit),
            orderBy,
            include: {
                _count: {
                    select: {
                        appointments: true,
                        doctors: true,
                        reviews: true,
                    }
                }
            }
        }),
        prisma.clinic.count({ where })
    ]);

    // Sort by appointment count if requested
    let sortedClinics = clinics;
    if (sortField === 'appointments') {
        sortedClinics = clinics.sort((a: any, b: any) => {
            const aCount = a._count.appointments;
            const bCount = b._count.appointments;
            return sortOrder === 'desc' ? bCount - aCount : aCount - bCount;
        });
    }

    return {
        clinics: sortedClinics,
        meta: {
            total,
            page: Number(page),
            limit: Number(limit),
            totalPages: Math.ceil(total / Number(limit)),
        },
    };
};

// 2. Get clinic by ID
export const getClinicById = async (id: string) => {
    const [clinic, adminUser] = await Promise.all([
        prisma.clinic.findUnique({
            where: { id },
            include: {
                _count: {
                    select: {
                        appointments: true,
                        doctors: true,
                        reviews: true,
                    }
                }
            }
        }),
        prisma.user.findFirst({
            where: {
                clinicId: id,
                role: { in: ['CLINIC_ADMIN', 'PENDING_CLINIC'] },
                isActive: true,
            },
            select: {
                id: true,
                phone: true,
                email: true,
                firstName: true,
                lastName: true,
                role: true,
                status: true,
            }
        })
    ]);

    if (!clinic) throw new AppError('Clinic not found', 404, ErrorCodes.NOT_FOUND);

    return {
        ...clinic,
        adminUser: adminUser || null,
    };
};

// 3. Create clinic (admin-created → immediately APPROVED)
export const createClinic = async (data: any, adminId: string) => {
    const parsed: any = { ...data };
    if (parsed.licenseIssuedAt) parsed.licenseIssuedAt = new Date(parsed.licenseIssuedAt);
    if (parsed.licenseExpiresAt) parsed.licenseExpiresAt = new Date(parsed.licenseExpiresAt);

    // Extract admin password before clinic creation
    const adminPassword = parsed.adminPassword;
    delete parsed.adminPassword;

    return prisma.$transaction(async (tx) => {
        // 1. Create clinic
        const clinic = await (tx.clinic as any).create({
            data: {
                ...parsed,
                source: 'ADMIN_CREATED',
                status: 'APPROVED',
                isActive: true,
                approvedById: adminId,
                createdBy: adminId,
                reviewedAt: new Date(),
                reviewedBy: adminId,
            }
        });

        // 2. Create CLINIC_ADMIN user if admin phone and password are provided
        if (adminPassword && parsed.adminPhone) {
            // Check if phone already exists
            const existingUser = await tx.user.findUnique({
                where: { phone: parsed.adminPhone }
            });

            if (!existingUser) {
                const created = await tx.user.create({
                    data: {
                        phone: parsed.adminPhone,
                        email: parsed.adminEmail || null,
                        passwordHash: await bcrypt.hash(adminPassword, 12),
                        firstName: parsed.adminFirstName || null,
                        lastName: parsed.adminLastName || null,
                        role: 'CLINIC_ADMIN',
                        status: 'APPROVED',
                        isActive: true,
                        clinicId: clinic.id,
                    },
                    select: { id: true },
                });
                await ensureClinicAdminMemberships(tx, clinic.id, [created.id]);
            }
        }

        return clinic;
    });
};

// 4. Update clinic
export const updateClinic = async (id: string, data: any) => {
    const clinic = await prisma.clinic.findUnique({ where: { id } });
    if (!clinic) throw new AppError('Clinic not found', 404, ErrorCodes.NOT_FOUND);

    const parsed: any = { ...data };
    if (parsed.licenseIssuedAt) parsed.licenseIssuedAt = new Date(parsed.licenseIssuedAt);
    if (parsed.licenseExpiresAt) parsed.licenseExpiresAt = new Date(parsed.licenseExpiresAt);

    // Extract admin password before clinic update
    const adminPassword = parsed.adminPassword;
    const adminPhone = parsed.adminPhone;
    const adminEmail = parsed.adminEmail;
    const adminFirstName = parsed.adminFirstName;
    const adminLastName = parsed.adminLastName;
    delete parsed.adminPassword;
    delete parsed.adminPhone;
    delete parsed.adminEmail;
    delete parsed.adminFirstName;
    delete parsed.adminLastName;
    delete parsed.adminPosition;

    return prisma.$transaction(async (tx) => {
        // 1. Update clinic
        const updated = await tx.clinic.update({
            where: { id },
            data: parsed
        });

        // 2. If password provided, create or update CLINIC_ADMIN user
        if (adminPassword && adminPassword.trim().length >= 8) {
            // Find existing CLINIC_ADMIN for this clinic
            const existingUser = await tx.user.findFirst({
                where: {
                    clinicId: id,
                    role: { in: ['CLINIC_ADMIN', 'PENDING_CLINIC'] },
                    isActive: true,
                }
            });

            if (existingUser) {
                // Update existing user password
                const normalizedNewPhone = adminPhone ? normalizePhone(adminPhone.trim()) : null;
                await tx.user.update({
                    where: { id: existingUser.id },
                    data: {
                        passwordHash: await bcrypt.hash(adminPassword, 12),
                        firstName: adminFirstName || existingUser.firstName,
                        lastName: adminLastName || existingUser.lastName,
                        email: adminEmail || existingUser.email,
                        // Only update phone when explicitly provided, and always normalize it
                        ...(normalizedNewPhone ? { phone: normalizedNewPhone } : {}),
                        role: 'CLINIC_ADMIN',
                        status: 'APPROVED',
                    }
                });
                await ensureClinicAdminMemberships(tx, id, [existingUser.id]);
            } else if (adminPhone) {
                // Create new CLINIC_ADMIN user (only if phone is provided)
                const created = await tx.user.create({
                    data: {
                        phone: normalizePhone(adminPhone.trim()),
                        email: adminEmail || null,
                        passwordHash: await bcrypt.hash(adminPassword, 12),
                        firstName: adminFirstName || null,
                        lastName: adminLastName || null,
                        role: 'CLINIC_ADMIN',
                        status: 'APPROVED',
                        isActive: true,
                        clinicId: id,
                    },
                    select: { id: true },
                });
                await ensureClinicAdminMemberships(tx, id, [created.id]);
            }
        }

        return updated;
    });
};

// 5. Hard delete — removes clinic and all related data from the database
export const deleteClinic = async (id: string) => {
    const clinic = await prisma.clinic.findUnique({ where: { id } });
    if (!clinic) throw new AppError('Clinic not found', 404, ErrorCodes.NOT_FOUND);

    await prisma.$transaction(async (tx) => {
        // Delete appointment logs (cascade from appointments, but be explicit)
        await tx.appointmentLog.deleteMany({
            where: { appointment: { clinicId: id } },
        });

        // Delete appointments
        await tx.appointment.deleteMany({ where: { clinicId: id } });

        // Delete reviews
        await tx.review.deleteMany({ where: { clinicId: id } });

        // Delete doctors
        await tx.doctor.deleteMany({ where: { clinicId: id } });

        // Delete cart items
        await tx.cartItem.deleteMany({ where: { clinicId: id } });

        // Delete clinic service links (cascades to ServiceCustomization → ServiceImage)
        await tx.clinicDiagnosticService.deleteMany({ where: { clinicId: id } });
        await tx.clinicSurgicalService.deleteMany({ where: { clinicId: id } });
        await tx.clinicSanatoriumService.deleteMany({ where: { clinicId: id } });
        await tx.clinicCheckupPackage.deleteMany({ where: { clinicId: id } });

        // Deactivate admin users linked to this clinic and unlink them.
        // We don't hard-delete users (FK refs from AppointmentLog/etc), but we
        // must disable login — otherwise they remain as orphan logins.
        await tx.user.updateMany({
            where: { clinicId: id },
            data: { clinicId: null, isActive: false },
        });

        // Finally delete the clinic
        await tx.clinic.delete({ where: { id } });
    });

    return { deleted: true, id };
};

// 6 & 7. Set active status
export const setActiveStatus = async (id: string, isActive: boolean) => {
    const clinic = await prisma.clinic.findUnique({ where: { id } });
    if (!clinic) throw new AppError('Clinic not found', 404, ErrorCodes.NOT_FOUND);

    return prisma.clinic.update({
        where: { id },
        data: { isActive }
    });
};

// 8. Approve self-registered clinic → creates CLINIC_ADMIN users from pendingPersons
export const approveClinic = async (id: string, adminId: string) => {
    const clinic = await (prisma.clinic as any).findUnique({ where: { id } });
    if (!clinic) throw new AppError('Klinika topilmadi', 404, ErrorCodes.NOT_FOUND);
    if (!['PENDING', 'IN_REVIEW'].includes(clinic.status)) {
        throw new AppError('Bu klinikani tasdiqlash mumkin emas', 400, ErrorCodes.VALIDATION_ERROR);
    }

    return (prisma.$transaction as any)(async (tx: any) => {
        const updated = await tx.clinic.update({
            where: { id },
            data: {
                status: 'APPROVED',
                isActive: true,
                reviewedAt: new Date(),
                reviewedBy: adminId,
                approvedById: adminId,
                rejectionReason: null,
            },
        });

        // Create CLINIC_ADMIN users from stored person data
        // Only the primary person (first) gets clinicId linked (@unique constraint);
        // secondary admins reach the clinic purely via their ClinicMembership.
        const persons: any[] = clinic.pendingPersons ?? [];
        const adminUserIds: string[] = [];
        for (let i = 0; i < persons.length; i++) {
            const person = persons[i];
            const isPrimary = person.isPrimary === true || i === 0;
            const existing = await tx.user.findFirst({ where: { phone: person.phone } });
            if (!existing) {
                const created = await tx.user.create({
                    data: {
                        phone: person.phone,
                        email: person.email ?? null,
                        passwordHash: person.passwordHash,
                        firstName: person.firstName,
                        lastName: person.lastName,
                        role: 'CLINIC_ADMIN',
                        status: 'APPROVED',
                        isActive: true,
                        ...(isPrimary && { clinicId: id }),
                    },
                    select: { id: true },
                });
                adminUserIds.push(created.id);
            } else {
                await tx.user.update({
                    where: { id: existing.id },
                    data: {
                        role: 'CLINIC_ADMIN',
                        status: 'APPROVED',
                        ...(isPrimary && { clinicId: id }),
                    },
                });
                adminUserIds.push(existing.id);
            }
        }

        // Seed the clinic's system roles + give every admin a membership, so
        // the Team module works and secondary admins (clinicId=null) can
        // resolve their clinic context. Idempotent + additive.
        await ensureClinicAdminMemberships(tx, id, adminUserIds);

        return updated;
    });
};

// 9. Reject clinic
export const rejectClinic = async (id: string, reason: string, adminId: string) => {
    const clinic = await (prisma.clinic as any).findUnique({ where: { id } });
    if (!clinic) throw new AppError('Klinika topilmadi', 404, ErrorCodes.NOT_FOUND);
    if (!['PENDING', 'IN_REVIEW'].includes(clinic.status)) {
        throw new AppError('Bu klinikani rad etish mumkin emas', 400, ErrorCodes.VALIDATION_ERROR);
    }

    return (prisma.clinic as any).update({
        where: { id },
        data: {
            status: 'REJECTED',
            isActive: false,
            rejectionReason: reason,
            reviewedAt: new Date(),
            reviewedBy: adminId,
        },
    });
};

// 10. Reopen rejected clinic → back to PENDING
export const reopenClinic = async (id: string) => {
    const clinic = await (prisma.clinic as any).findUnique({ where: { id } });
    if (!clinic) throw new AppError('Klinika topilmadi', 404, ErrorCodes.NOT_FOUND);
    if (clinic.status !== 'REJECTED') {
        throw new AppError('Faqat rad etilgan klinikalarni qayta ochish mumkin', 400, ErrorCodes.VALIDATION_ERROR);
    }

    return (prisma.clinic as any).update({
        where: { id },
        data: { status: 'PENDING', rejectionReason: null, reviewedAt: null, reviewedBy: null },
    });
};

// 11. Update status (SUSPENDED, DELETED, IN_REVIEW, BLOCKED)
export const updateClinicStatus = async (
    id: string,
    status: string,
    rejectionReason?: string,
    adminId?: string
) => {
    const clinic = await (prisma.clinic as any).findUnique({ where: { id } });
    if (!clinic) throw new AppError('Klinika topilmadi', 404, ErrorCodes.NOT_FOUND);

    return (prisma.clinic as any).update({
        where: { id },
        data: {
            status,
            ...(rejectionReason !== undefined && { rejectionReason }),
            ...(status === 'IN_REVIEW' && { reviewedAt: null }),
            ...(adminId && { reviewedBy: adminId }),
        },
    });
};

// 23 & 24. Bulk activate/deactivate
export const bulkSetActiveStatus = async (ids: string[], isActive: boolean) => {
    const result = await prisma.clinic.updateMany({
        where: { id: { in: ids } },
        data: { isActive }
    });

    return { count: result.count };
};

// 25. Export to CSV
export const exportClinicsToCSV = async (query: any) => {
    const { status, region, type } = query;

    let where: any = {};
    if (status) where.status = status;
    if (region) where.region = { contains: region, mode: 'insensitive' };
    if (type) where.type = type;

    const clinics = await prisma.clinic.findMany({ where });

    // CSV headers
    const headers = ['ID', 'Name (UZ)', 'Name (RU)', 'Type', 'Status', 'Region', 'District', 'Phone', 'Email', 'Rating', 'Reviews', 'Created At'];

    // CSV rows
    const rows = clinics.map(c => [
        c.id,
        c.nameUz,
        c.nameRu || '',
        c.type,
        c.status,
        c.region,
        c.district,
        (c.phones as string[]).join(', '),
        (c.emails as string[]).join(', '),
        c.averageRating,
        c.reviewCount,
        c.createdAt.toISOString()
    ]);

    // Generate CSV
    const csv = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    return csv;
};

// ─── Nested Resources ─────────────────────────────────────────────────────────

// 18. Get clinic services
export const getClinicServices = async (clinicId: string) => {
    const clinic = await prisma.clinic.findUnique({ where: { id: clinicId } });
    if (!clinic) throw new AppError('Clinic not found', 404, ErrorCodes.NOT_FOUND);

    const [diagnosticServices, surgicalServices, checkupPackages] = await Promise.all([
        prisma.clinicDiagnosticService.findMany({
            where: { clinicId, isActive: true },
            include: {
                diagnosticService: {
                    include: { category: { select: { id: true, nameUz: true, nameRu: true } } }
                }
            }
        }),
        prisma.clinicSurgicalService.findMany({
            where: { clinicId, isActive: true },
            include: { surgicalService: true }
        }),
        prisma.clinicCheckupPackage.findMany({
            where: { clinicId, isActive: true },
            include: {
                package: {
                    include: { items: true }
                }
            }
        })
    ]);

    return {
        diagnostic: diagnosticServices.map(s => s.diagnosticService),
        surgical: surgicalServices.map(s => s.surgicalService),
        checkup: checkupPackages.map(cp => ({
            ...cp.package,
            clinicPrice: cp.clinicPrice,
            customNotes: cp.customNotes,
            bookingCount: cp.bookingCount,
            clinicPackageId: cp.id,
            itemCount: cp.package.items?.length || 0,
        })),
    };
};

// 19. Get clinic doctors
export const getClinicDoctors = async (clinicId: string) => {
    const clinic = await prisma.clinic.findUnique({ where: { id: clinicId } });
    if (!clinic) throw new AppError('Clinic not found', 404, ErrorCodes.NOT_FOUND);

    return prisma.doctor.findMany({
        where: { clinicId, isActive: true },
        orderBy: { createdAt: 'desc' }
    });
};

// 20. Get clinic statistics
export const getClinicStats = async (clinicId: string) => {
    const clinic = await prisma.clinic.findUnique({ where: { id: clinicId } });
    if (!clinic) throw new AppError('Clinic not found', 404, ErrorCodes.NOT_FOUND);

    const [
        totalAppointments,
        completedAppointments,
        pendingAppointments,
        totalRevenue,
        avgRating
    ] = await Promise.all([
        prisma.appointment.count({ where: { clinicId } }),
        prisma.appointment.count({ where: { clinicId, status: 'COMPLETED' } }),
        prisma.appointment.count({ where: { clinicId, status: 'PENDING' } }),
        prisma.appointment.aggregate({
            where: { clinicId, status: 'COMPLETED' },
            _sum: { price: true }
        }),
        prisma.review.aggregate({
            where: { clinicId, isActive: true },
            _avg: { rating: true }
        })
    ]);

    return {
        appointments: {
            total: totalAppointments,
            completed: completedAppointments,
            pending: pendingAppointments,
        },
        revenue: totalRevenue._sum.price || 0,
        rating: {
            average: avgRating._avg.rating || 0,
            count: clinic.reviewCount
        },
        doctors: await prisma.doctor.count({ where: { clinicId } })
    };
};

// 21. Get clinic reviews
export const getClinicReviews = async (clinicId: string) => {
    const clinic = await prisma.clinic.findUnique({ where: { id: clinicId } });
    if (!clinic) throw new AppError('Clinic not found', 404, ErrorCodes.NOT_FOUND);

    return prisma.review.findMany({
        where: { clinicId, isActive: true },
        include: { user: { select: { id: true, firstName: true, lastName: true } } },
        orderBy: { createdAt: 'desc' }
    });
};

// 22. Delete review (moderation)
export const deleteReview = async (reviewId: string) => {
    const review = await prisma.review.findUnique({ where: { id: reviewId } });
    if (!review) throw new AppError('Review not found', 404, ErrorCodes.NOT_FOUND);

    // Soft delete - just mark as inactive
    await prisma.review.update({
        where: { id: reviewId },
        data: { isActive: false }
    });

    // Recalculate clinic rating
    const clinicReviews = await prisma.review.findMany({
        where: { clinicId: review.clinicId, isActive: true }
    });

    const avgRating = clinicReviews.length > 0
        ? clinicReviews.reduce((sum, r) => sum + r.rating, 0) / clinicReviews.length
        : 0;

    await prisma.clinic.update({
        where: { id: review.clinicId },
        data: {
            averageRating: avgRating,
            reviewCount: clinicReviews.length
        }
    });

    return { success: true };
};
