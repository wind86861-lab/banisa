const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Activate all MSKT and MRT diagnostic services for IMPULS CLINIC
 * with prices set to the minimum price from the diagnostic service.
 */
async function main() {
    console.log('🔍 Searching for IMPULS CLINIC and MSKT/MRT services...\n');

    // Find IMPULS CLINIC
    const clinic = await prisma.clinic.findFirst({
        where: {
            OR: [
                { nameUz: { contains: 'IMPULS', mode: 'insensitive' } },
                { nameRu: { contains: 'IMPULS', mode: 'insensitive' } },
            ],
        },
    });

    if (!clinic) {
        console.error('❌ IMPULS CLINIC not found in database.');
        process.exit(1);
    }

    console.log(`✅ Found clinic: "${clinic.nameUz}"`);
    console.log(`   ID: ${clinic.id}`);
    console.log(`   Status: ${clinic.status}\n`);

    // Find all MSKT and MRT diagnostic services
    const services = await prisma.diagnosticService.findMany({
        where: {
            OR: [
                { nameUz: { contains: 'MSKT', mode: 'insensitive' } },
                { nameUz: { contains: 'MRT', mode: 'insensitive' } },
                { nameUz: { contains: 'MSCT', mode: 'insensitive' } },
            ],
        },
        select: {
            id: true,
            nameUz: true,
            nameRu: true,
            priceMin: true,
            priceRecommended: true,
        },
    });

    if (services.length === 0) {
        console.error('❌ No MSKT/MRT services found in database.');
        process.exit(1);
    }

    console.log(`✅ Found ${services.length} MSKT/MRT diagnostic services\n`);

    // Count existing links
    const existingLinks = await prisma.clinicDiagnosticService.count({
        where: {
            clinicId: clinic.id,
            diagnosticServiceId: { in: services.map(s => s.id) },
        },
    });

    console.log(`📊 Existing clinic-service links: ${existingLinks}`);

    // Process each service
    let activatedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    for (const service of services) {
        try {
            // Check if link already exists
            const existingLink = await prisma.clinicDiagnosticService.findUnique({
                where: {
                    clinicId_diagnosticServiceId: {
                        clinicId: clinic.id,
                        diagnosticServiceId: service.id,
                    },
                },
            });

            if (existingLink) {
                // Update existing link to ensure it's active
                if (!existingLink.isActive) {
                    await prisma.clinicDiagnosticService.update({
                        where: {
                            clinicId_diagnosticServiceId: {
                                clinicId: clinic.id,
                                diagnosticServiceId: service.id,
                            },
                        },
                        data: { isActive: true },
                    });
                    updatedCount++;
                    console.log(`🔄 Reactivated: ${service.nameUz}`);
                } else {
                    skippedCount++;
                    console.log(`⏭️  Already active: ${service.nameUz}`);
                }
            } else {
                // Create new clinic-service link
                await prisma.clinicDiagnosticService.create({
                    data: {
                        clinicId: clinic.id,
                        diagnosticServiceId: service.id,
                        isActive: true,
                    },
                });
                activatedCount++;
                console.log(`✅ Activated: ${service.nameUz}`);
            }

            // Create or update service customization with minimum price
            const priceToSet = service.priceMin || service.priceRecommended || 300000;

            // Find the ClinicDiagnosticService record
            const clinicService = await prisma.clinicDiagnosticService.findUnique({
                where: {
                    clinicId_diagnosticServiceId: {
                        clinicId: clinic.id,
                        diagnosticServiceId: service.id,
                    },
                },
            });

            if (clinicService) {
                // Check if customization already exists
                const existingCustomization = await prisma.serviceCustomization.findUnique({
                    where: { clinicServiceId: clinicService.id },
                });

                if (existingCustomization) {
                    // Update existing
                    await prisma.serviceCustomization.update({
                        where: { clinicServiceId: clinicService.id },
                        data: {
                            customPrice: priceToSet,
                        },
                    });
                } else {
                    // Create new
                    await prisma.serviceCustomization.create({
                        data: {
                            clinicServiceId: clinicService.id,
                            customPrice: priceToSet,
                        },
                    });
                }
            }

            console.log(`   💰 Price set: ${priceToSet.toLocaleString('uz-UZ')} so'm`);

        } catch (error) {
            console.error(`❌ Error processing service ${service.nameUz}:`, error);
        }
    }

    // Final verification
    const finalCount = await prisma.clinicDiagnosticService.count({
        where: {
            clinicId: clinic.id,
            diagnosticServiceId: { in: services.map(s => s.id) },
            isActive: true,
        },
    });

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('  IMPULS CLINIC — MSKT & MRT SERVICES ACTIVATED');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`  Clinic: ${clinic.nameUz}`);
    console.log(`  ID: ${clinic.id}`);
    console.log(`  Services processed: ${services.length}`);
    console.log(`  Newly activated: ${activatedCount}`);
    console.log(`  Reactivated: ${updatedCount}`);
    console.log(`  Already active: ${skippedCount}`);
    console.log(`  Total active services: ${finalCount}`);
    console.log('═══════════════════════════════════════════════════════════════\n');

    // Show summary of services with prices
    console.log('📋 Activated Services Summary:');
    console.log('┌─────────────────────────────────────────────────────────┬──────────┐');
    console.log('│ Service Name                                            │ Price    │');
    console.log('├─────────────────────────────────────────────────────────┼──────────┤');

    for (const service of services) {
        const price = service.priceMin || service.priceRecommended || 300000;
        const name = service.nameUz.length > 55 ? service.nameUz.substring(0, 52) + '...' : service.nameUz;
        console.log(`│ ${name.padEnd(55)} │ ${price.toLocaleString('uz-UZ').padStart(8)} │`);
    }

    console.log('└─────────────────────────────────────────────────────────┴──────────┘\n');
    console.log('🎉 All MSKT and MRT services are now active for IMPULS CLINIC!');
    console.log('💰 Prices set to minimum values from diagnostic services.');
}

main()
    .catch((e) => { console.error(e); process.exit(1); })
    .finally(async () => { await prisma.$disconnect(); });
