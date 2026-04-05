import { PrismaClient, ClinicStatus, ClinicType } from '@prisma/client';

const prisma = new PrismaClient();

async function seedTestClinic() {
    console.log('Creating test clinic with services...');

    const clinic = await prisma.clinic.create({
        data: {
            nameUz: 'Test Tibbiyot Markazi',
            nameRu: 'Тестовый Медицинский Центр',
            nameEn: 'Test Medical Center',
            region: 'Toshkent',
            district: 'Chilonzor',
            street: 'Bunyodkor ko\'chasi, 1-uy',
            phones: ['+998901234567', '+998712345678'],
            emails: ['test@clinic.uz'],
            status: ClinicStatus.APPROVED,
            type: ClinicType.DIAGNOSTIC,
            hasOnlineBooking: true,
            hasEmergency: false,
            hasAmbulance: false,
            parkingAvailable: true,
            workingHours: 'Dush-Juma: 08:00-20:00, Shanba: 09:00-18:00',
            logo: '/images/1751463932_img2.png',
            averageRating: 4.5,
            reviewCount: 120,
        }
    });

    console.log(`✓ Created clinic: ${clinic.nameUz}`);

    // Get some diagnostic services
    const diagnosticServices = await prisma.diagnosticService.findMany({
        take: 10,
        where: { isActive: true }
    });

    // Link clinic to diagnostic services
    for (const service of diagnosticServices) {
        await prisma.clinicDiagnosticService.create({
            data: {
                clinicId: clinic.id,
                diagnosticServiceId: service.id,
                isActive: true,
                customization: {
                    create: {
                        customPrice: service.priceRecommended || service.priceMin || 50000,
                        discountPercent: Math.random() > 0.5 ? 10 : 0,
                        estimatedDurationMinutes: service.durationMinutes || 30,
                        isHighlighted: Math.random() > 0.7,
                        requiresAppointment: true,
                        tags: ['Tez', 'Sifatli'],
                    }
                }
            }
        });
    }

    console.log(`✓ Linked ${diagnosticServices.length} diagnostic services to clinic`);

    // Get checkup packages
    const packages = await prisma.checkupPackage.findMany({ take: 3 });

    for (const pkg of packages) {
        await prisma.clinicCheckupPackage.create({
            data: {
                clinicId: clinic.id,
                packageId: pkg.id,
                clinicPrice: pkg.recommendedPrice,
                isActive: true,
            }
        });
    }

    console.log(`✓ Linked ${packages.length} checkup packages to clinic`);
    console.log('\n✅ Test clinic created successfully!');
}

seedTestClinic()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
