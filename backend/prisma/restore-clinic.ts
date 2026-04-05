import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const CLINIC_ID = 'f6f6e74e-e430-436f-9c53-81b2bbef53c7';
    const ADMIN_ID = 'f2a77162-e038-419d-b9a6-cbb635416c82';
    const ADMIN_HASH = '$2b$10$ROe3egvbkHExVKQS/nUi4.68gCKlA6uHg98WCZPINyiz4aIKqg2D2';

    // 1. Restore clinic
    const existing = await prisma.clinic.findUnique({ where: { id: CLINIC_ID } });
    if (!existing) {
        await prisma.clinic.create({
            data: {
                id: CLINIC_ID,
                nameUz: 'Banisa Tibbiyot Markazi',
                nameRu: 'Банisa Медицинский Центр',
                type: 'GENERAL',
                status: 'APPROVED',
                description: 'Toshkent shahridagi zamonaviy tibbiyot markazi',
                region: 'Toshkent',
                district: 'Yunusobod',
                street: 'Amir Temur shoh kochasi 123',
                phones: ['+998712345678', '+998901234567'],
                emails: ['info@banisa.uz'],
                workingHours: [
                    { day: 'Dushanba', from: '08:00', to: '18:00' },
                    { day: 'Seshanba', from: '08:00', to: '18:00' },
                    { day: 'Chorshanba', from: '08:00', to: '18:00' },
                    { day: 'Payshanba', from: '08:00', to: '18:00' },
                    { day: 'Juma', from: '08:00', to: '18:00' },
                    { day: 'Shanba', from: '09:00', to: '15:00' },
                ],
                hasOnlineBooking: true,
                averageRating: 4.8,
                reviewCount: 156,
                isActive: true,
                source: 'ADMIN_CREATED',
            },
        });
        console.log('✓ Clinic restored: Banisa Tibbiyot Markazi');
    } else {
        console.log('~ Clinic already exists, skipped');
    }

    // 2. Restore clinic admin user
    const existingUser = await prisma.user.findUnique({ where: { id: ADMIN_ID } });
    if (!existingUser) {
        await prisma.user.create({
            data: {
                id: ADMIN_ID,
                phone: '+998991234567',
                passwordHash: ADMIN_HASH,
                firstName: 'Clinic',
                lastName: 'Admin',
                role: 'CLINIC_ADMIN',
                status: 'APPROVED' as any,
                isActive: true,
                clinicId: CLINIC_ID,
            },
        });
        console.log('✓ Clinic admin user restored: +998991234567');
    } else {
        console.log('~ Clinic admin user already exists, skipped');
    }

    console.log('\n✅ Clinic data restored successfully!');
}

main()
    .catch((e) => { console.error(e); process.exit(1); })
    .finally(async () => { await prisma.$disconnect(); });
