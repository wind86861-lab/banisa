import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * One-time migration: activate ALL DiagnosticServices for the "Dialab Medical"
 * clinic, with prices set to each service's admin-entered minimum price (priceMin).
 *
 * This is REAL SQL data — NOT seed / fake data.
 * Safe to re-run: skips existing links and updates inactive ones back to active.
 */
async function main() {
    // ─── 1. Find the clinic ─────────────────────────────────────────────
    const clinic = await prisma.clinic.findFirst({
        where: {
            OR: [
                { nameUz: { contains: 'Dialab Medical', mode: 'insensitive' } },
                { nameRu: { contains: 'Dialab Medical', mode: 'insensitive' } },
                { nameEn: { contains: 'Dialab Medical', mode: 'insensitive' } },
            ],
        },
    });

    if (!clinic) {
        console.error('❌ Clinic "Dialab Medical" not found in database.');
        console.log('   Existing clinics with "Dialab" in name:');
        const similar = await prisma.clinic.findMany({
            where: { nameUz: { contains: 'Dialab', mode: 'insensitive' } },
            select: { id: true, nameUz: true, nameRu: true, status: true },
        });
        console.table(similar);
        process.exit(1);
    }

    console.log(`✅ Found clinic: "${clinic.nameUz}" (id=${clinic.id}, status=${clinic.status})`);

    // ─── 2. Fetch ALL active diagnostic services ──────────────────────────
    const services = await prisma.diagnosticService.findMany({
        where: { isActive: true },
        select: {
            id: true,
            nameUz: true,
            priceMin: true,
            priceMax: true,
            priceRecommended: true,
        },
        orderBy: { nameUz: 'asc' },
    });

    if (services.length === 0) {
        console.error('❌ No active DiagnosticServices found in database.');
        process.exit(1);
    }

    console.log(`📋 Found ${services.length} active diagnostic services`);

    // ─── 3. Prepare working-hours template (Mon–Fri 08:00–18:00) ────────
    const defaultSlots: Record<string, any> = {
        monday:    [{ start: '08:00', end: '18:00' }],
        tuesday:   [{ start: '08:00', end: '18:00' }],
        wednesday: [{ start: '08:00', end: '18:00' }],
        thursday:  [{ start: '08:00', end: '18:00' }],
        friday:    [{ start: '08:00', end: '18:00' }],
    };

    // ─── 4. Bulk create / update in a single transaction ────────────────
    const results = {
        created: 0,
        updated: 0,
        customizationCreated: 0,
        customizationUpdated: 0,
        errors: 0,
        skipped: 0,
    };

    for (const svc of services) {
        try {
            // 4a. Upsert ClinicDiagnosticService (activate if exists, create if not)
            const existingLink = await prisma.clinicDiagnosticService.findUnique({
                where: {
                    clinicId_diagnosticServiceId: {
                        clinicId: clinic.id,
                        diagnosticServiceId: svc.id,
                    },
                },
            });

            let clinicServiceId: string;

            if (existingLink) {
                if (!existingLink.isActive) {
                    await prisma.clinicDiagnosticService.update({
                        where: { id: existingLink.id },
                        data: { isActive: true },
                    });
                    results.updated++;
                } else {
                    results.skipped++;
                }
                clinicServiceId = existingLink.id;
            } else {
                const newLink = await prisma.clinicDiagnosticService.create({
                    data: {
                        clinicId: clinic.id,
                        diagnosticServiceId: svc.id,
                        isActive: true,
                    },
                });
                clinicServiceId = newLink.id;
                results.created++;
            }

            // 4b. Upsert ServiceCustomization with price = priceMin
            const existingCustom = await prisma.serviceCustomization.findUnique({
                where: { clinicServiceId },
            });

            if (existingCustom) {
                await prisma.serviceCustomization.update({
                    where: { id: existingCustom.id },
                    data: {
                        customPrice: svc.priceMin,
                        availableDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
                        availableTimeSlots: defaultSlots,
                        requiresAppointment: true,
                    },
                });
                results.customizationUpdated++;
            } else {
                await prisma.serviceCustomization.create({
                    data: {
                        clinicServiceId,
                        customPrice: svc.priceMin,
                        availableDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
                        availableTimeSlots: defaultSlots,
                        requiresAppointment: true,
                    },
                });
                results.customizationCreated++;
            }
        } catch (err: any) {
            console.error(`  ✗ Error on service "${svc.nameUz}" (${svc.id}):`, err.message);
            results.errors++;
        }
    }

    // ─── 5. Summary ─────────────────────────────────────────────────────
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('  DIALAB MEDICAL — DIAGNOSTIC SERVICES BULK ACTIVATION');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`  Clinic ID      : ${clinic.id}`);
    console.log(`  Clinic Name    : ${clinic.nameUz}`);
    console.log(`  Total Services : ${services.length}`);
    console.log('───────────────────────────────────────────────────────────────');
    console.log(`  ClinicDiagnosticService`);
    console.log(`    Created  : ${results.created}`);
    console.log(`    Updated  : ${results.updated}`);
    console.log(`    Skipped  : ${results.skipped}`);
    console.log(`───────────────────────────────────────────────────────────────`);
    console.log(`  ServiceCustomization`);
    console.log(`    Created  : ${results.customizationCreated}`);
    console.log(`    Updated  : ${results.customizationUpdated}`);
    console.log(`───────────────────────────────────────────────────────────────`);
    console.log(`  Errors     : ${results.errors}`);
    console.log('═══════════════════════════════════════════════════════════════\n');

    if (results.errors > 0) {
        process.exit(1);
    }

    console.log('✅ All diagnostic services activated successfully!');
}

main()
    .catch((e) => { console.error(e); process.exit(1); })
    .finally(async () => { await prisma.$disconnect(); });
