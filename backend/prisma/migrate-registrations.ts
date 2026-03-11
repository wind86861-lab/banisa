/**
 * Data migration: ClinicRegistrationRequest → Clinic
 * Run once:  npx ts-node --transpile-only prisma/migrate-registrations.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const TYPE_MAP: Record<string, string> = {
    diagnostika_markazi: 'DIAGNOSTIC',
    poliklinika: 'GENERAL',
    kasalxona: 'GENERAL',
    ixtisoslashgan_markaz: 'SPECIALIZED',
    tish_klinikasi: 'DENTAL',
    sanatoriya: 'REHABILITATION',
    tugr_uqxona: 'MATERNITY',
};

async function main() {
    const requests = await (prisma as any).clinicRegistrationRequest.findMany({
        where: { status: { in: ['PENDING', 'IN_REVIEW', 'REJECTED'] } },
        include: { persons: true },
        orderBy: { createdAt: 'asc' },
    });

    console.log(`Migrating ${requests.length} registration requests…`);
    let migrated = 0;

    for (const req of requests) {
        const primary = req.persons?.find((p: any) => p.isPrimary) ?? req.persons?.[0];
        if (!primary) continue;

        try {
            await (prisma.clinic as any).create({
                data: {
                    nameUz: req.nameUz,
                    nameRu: req.nameRu ?? null,
                    nameEn: req.nameEn ?? null,
                    type: TYPE_MAP[req.clinicType] ?? 'GENERAL',
                    status: req.status,
                    source: 'SELF_REGISTERED',
                    description: req.descriptionUz ?? '',
                    logo: req.logoUrl ?? null,
                    region: req.regionId,
                    district: req.districtId,
                    street: req.streetAddress,
                    landmark: req.landmark ?? null,
                    latitude: req.latitude ?? null,
                    longitude: req.longitude ?? null,
                    phones: [req.primaryPhone, req.secondaryPhone].filter(Boolean),
                    emails: req.email ? [req.email] : [],
                    website: req.website ?? null,
                    workingHours: req.workingHours ?? [],
                    taxId: req.inn ?? null,
                    licenseNumber: req.licenseNumber ?? null,
                    adminFirstName: primary.firstName,
                    adminLastName: primary.lastName,
                    adminEmail: primary.email ?? req.email,
                    adminPhone: primary.phone,
                    adminPosition: primary.position ?? null,
                    rejectionReason: req.rejectionReason ?? null,
                    reviewedAt: req.reviewedAt ?? null,
                    reviewedBy: req.reviewedById ?? null,
                    submittedAt: req.createdAt,
                    pendingPersons: req.persons,
                    isActive: false,
                    createdAt: req.createdAt,
                },
            });
            migrated++;
        } catch (err: any) {
            console.warn(`  Skipped ${req.id}: ${err.message}`);
        }
    }

    // Mark approved clinics that have no approvedById as SELF_REGISTERED
    const updated = await (prisma.clinic as any).updateMany({
        where: { approvedById: null, source: 'ADMIN_CREATED', status: 'APPROVED' },
        data: { source: 'SELF_REGISTERED' },
    });

    console.log(`✅ Migrated: ${migrated}/${requests.length}`);
    console.log(`✅ Marked ${updated.count} approved-from-registration clinics as SELF_REGISTERED`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
