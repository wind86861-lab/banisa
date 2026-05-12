import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ── REAL MEDIKAL SERVICES (Russian → Uzbek translations) ──
const SERVICES = [
  { nameRu: 'Доплер сосудов почки', nameUz: 'Buyrak tomirlari Doppleri', price: 200000, duration: 30, result: 0.5 },
  { nameRu: 'Доплер сосудов печени', nameUz: 'Jigar tomirlari Doppleri', price: 200000, duration: 30, result: 0.5 },
  { nameRu: 'Доплер сосудов матки и придатков', nameUz: 'Bachadon va uning ilavalari tomirlari Doppleri', price: 200000, duration: 30, result: 0.5 },
  { nameRu: 'Доплер щитовидной железы', nameUz: 'Qalqonsimon bez Doppleri', price: 170000, duration: 30, result: 0.5 },
  { nameRu: 'Доплер предстательной железы', nameUz: 'Oldki bez Doppleri', price: 200000, duration: 30, result: 0.5 },
  { nameRu: 'Доплер при беременности', nameUz: 'Homiladorlik davrida Doppler', price: 230000, duration: 30, result: 0.5 },
  { nameRu: 'Доплер эхокардиография', nameUz: 'Ehokardiografiya Doppleri', price: 200000, duration: 45, result: 0.5 },
  { nameRu: 'Доплер эхокардиография у детей', nameUz: 'Bolalarda Ehokardiografiya Doppleri', price: 200000, duration: 45, result: 0.5 },
  { nameRu: 'Доплер эхокардиография плода', nameUz: 'Homila Ehokardiografiya Doppleri', price: 220000, duration: 45, result: 0.5 },
  { nameRu: 'Доплер БЦА брахиоцефальных артерий', nameUz: 'Braxiosefal arteriyalar Doppleri', price: 220000, duration: 30, result: 0.5 },
  { nameRu: 'Допплерография артерий и вен верхних конечностей', nameUz: 'Yuqori oyoq-қo\'llar arteriya va venalari Doppleri', price: 240000, duration: 40, result: 0.5 },
  { nameRu: 'Допплерография артерий и вен нижних конечностей', nameUz: 'Pastki oyoq-қo\'llar arteriya va venalari Doppleri', price: 240000, duration: 40, result: 0.5 },
  { nameRu: 'Доплер исследование многоплодный беременности', nameUz: 'Ko\'p homiladorlik Doppler tekshiruvi', price: 240000, duration: 45, result: 0.5 },
  { nameRu: 'Доплер матка с придатками трансвагинальное исследование', nameUz: 'Transvajinal bachadon va ilavalari Doppleri', price: 200000, duration: 30, result: 0.5 },
  // ── UZD (Ultrasound) ──
  { nameRu: 'Печень и желчный пузырь', nameUz: 'Jigar va o\'t pufagi UZI', price: 130000, duration: 20, result: 0.5 },
  { nameRu: 'УЗД брюшной полости', nameUz: 'Qor bo\'shlig\'i UZI', price: 190000, duration: 30, result: 0.5 },
  { nameRu: 'Поджелудочная железа', nameUz: 'Oshqozon osti bezi UZI', price: 120000, duration: 20, result: 0.5 },
  { nameRu: 'Селезёнка', nameUz: 'Taloq UZI', price: 120000, duration: 20, result: 0.5 },
  { nameRu: 'Почки', nameUz: 'Buyraklar UZI', price: 130000, duration: 20, result: 0.5 },
  { nameRu: 'Надпочечники', nameUz: 'Ustki buyrak bezlari UZI', price: 130000, duration: 20, result: 0.5 },
];

async function main() {
  console.log('🔍 Looking up Real Medikal clinic...');
  const clinic = await prisma.clinic.findFirst({
    where: { nameUz: { contains: 'Real Medikal', mode: 'insensitive' } },
  });
  if (!clinic) {
    console.error('❌ Clinic "Real Medikal" not found');
    process.exit(1);
  }
  console.log(`✅ Clinic: ${clinic.nameUz} (${clinic.id})`);

  console.log('🔍 Looking up SUPER_ADMIN user...');
  const admin = await prisma.user.findFirst({ where: { role: 'SUPER_ADMIN' } });
  if (!admin) {
    console.error('❌ No SUPER_ADMIN user found');
    process.exit(1);
  }
  console.log(`✅ Admin: ${admin.firstName || ''} ${admin.lastName || ''} (${admin.id})`);

  console.log('🔍 Looking up Ultrasound category...');
  let category = await prisma.serviceCategory.findFirst({
    where: { slug: 'ultrasound' },
  });
  if (!category) {
    console.log('   Category not found, creating...');
    const root = await prisma.serviceCategory.findFirst({ where: { slug: 'diagnostics' } });
    const instrumental = await prisma.serviceCategory.findFirst({ where: { slug: 'instrumental' } });
    if (!root || !instrumental) {
      console.error('❌ Required parent categories (diagnostics / instrumental) not found');
      process.exit(1);
    }
    category = await prisma.serviceCategory.create({
      data: {
        nameUz: 'Ultratovush',
        nameRu: 'Ультразвуковое исследование',
        nameEn: 'Ultrasound',
        slug: 'ultrasound',
        level: 2,
        parentId: instrumental.id,
        icon: '🔊',
        sortOrder: 3,
      },
    });
    console.log(`✅ Created category: ${category.nameUz} (${category.id})`);
  } else {
    console.log(`✅ Category: ${category.nameUz} (${category.id})`);
  }

  let created = 0;
  let linked = 0;

  for (const s of SERVICES) {
    // Check if service already exists by nameRu to avoid duplicates
    let service = await prisma.diagnosticService.findFirst({
      where: { nameRu: s.nameRu },
    });

    if (!service) {
      service = await prisma.diagnosticService.create({
        data: {
          nameUz: s.nameUz,
          nameRu: s.nameRu,
          nameEn: s.nameRu,
          categoryId: category.id,
          shortDescription: `${s.nameUz} - ultratovush tekshiruvi.`,
          priceRecommended: s.price,
          priceMin: Math.round(s.price * 0.85),
          priceMax: Math.round(s.price * 1.15),
          durationMinutes: s.duration,
          resultTimeHours: s.result,
          isActive: true,
          createdById: admin.id,
        },
      });
      console.log(`  ➕ Created service: ${s.nameUz}`);
      created++;
    } else {
      console.log(`  ⚡ Service already exists: ${s.nameUz}`);
    }

    // Link to clinic
    const existingLink = await prisma.clinicDiagnosticService.findUnique({
      where: {
        clinicId_diagnosticServiceId: {
          clinicId: clinic.id,
          diagnosticServiceId: service.id,
        },
      },
    });

    if (!existingLink) {
      const link = await prisma.clinicDiagnosticService.create({
        data: {
          clinicId: clinic.id,
          diagnosticServiceId: service.id,
          isActive: true,
        },
      });

      // Add customization with the exact price
      await prisma.serviceCustomization.create({
        data: {
          clinicServiceId: link.id,
          customNameUz: s.nameUz,
          customNameRu: s.nameRu,
          customPrice: s.price,
          requiresAppointment: true,
          isHighlighted: false,
        },
      });
      console.log(`    🔗 Linked to clinic with price ${s.price.toLocaleString()}`);
      linked++;
    } else {
      console.log(`    🔗 Already linked to clinic`);
    }
  }

  console.log(`\n🎉 Done! Created ${created} new services, linked ${linked} to Real Medikal.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
