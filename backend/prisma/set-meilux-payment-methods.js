const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Set payment methods for MEILUX MEDICAL clinic to support online payment (Payme).
 * This enables Payme checkout for this specific clinic only.
 */
async function main() {
    console.log('🔍 Searching for Medilux Medical Center clinic...\n');

    // Find Medilux Medical Center clinic
    const clinic = await prisma.clinic.findFirst({
        where: {
            OR: [
                { nameUz: { contains: 'Medilux', mode: 'insensitive' } },
                { nameRu: { contains: 'Medilux', mode: 'insensitive' } },
                { nameEn: { contains: 'Medilux', mode: 'insensitive' } },
            ],
        },
    });

    if (!clinic) {
        console.error('❌ MEILUX MEDICAL clinic not found in database.');
        console.log('\n📋 Searching for similar clinics with "MEIL" in name:\n');

        const similar = await prisma.clinic.findMany({
            where: {
                OR: [
                    { nameUz: { contains: 'MEIL', mode: 'insensitive' } },
                    { nameRu: { contains: 'MEIL', mode: 'insensitive' } },
                ],
            },
            select: { id: true, nameUz: true, nameRu: true, status: true, paymentMethods: true },
        });

        if (similar.length > 0) {
            console.table(similar);
        } else {
            console.log('No similar clinics found.');
        }

        process.exit(1);
    }

    console.log(`✅ Found clinic: "${clinic.nameUz}"`);
    console.log(`   ID: ${clinic.id}`);
    console.log(`   Status: ${clinic.status}`);
    console.log(`   Current payment methods: ${JSON.stringify(clinic.paymentMethods)}\n`);

    // Set payment methods to support Payme + Cash
    const newPaymentMethods = ['PAYME', 'CASH', 'BANK'];

    await prisma.clinic.update({
        where: { id: clinic.id },
        data: {
            paymentMethods: newPaymentMethods,
        },
    });

    console.log('✅ Payment methods updated successfully!');
    console.log(`   New payment methods: ${JSON.stringify(newPaymentMethods)}\n`);
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('  MEILUX MEDICAL — PAYMENT METHODS CONFIGURED');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`  Clinic: ${clinic.nameUz}`);
    console.log(`  ID: ${clinic.id}`);
    console.log(`  Payment Methods: ${newPaymentMethods.join(', ')}`);
    console.log('═══════════════════════════════════════════════════════════════\n');
    console.log('🎉 Payme online payment is now enabled for MEILUX MEDICAL!');
}

main()
    .catch((e) => { console.error(e); process.exit(1); })
    .finally(async () => { await prisma.$disconnect(); });
