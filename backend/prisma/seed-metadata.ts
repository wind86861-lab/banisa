import prisma from '../src/config/database';

async function seedMetadataTemplates() {
  console.log('Seeding metadata templates...');

  // 1. Patient Weight (for MRT, MSKT, Rentgen)
  const weightTemplate = await prisma.metadataTemplate.upsert({
    where: { key: 'patient_weight' },
    create: {
      key: 'patient_weight',
      labelUz: 'Bemor vazni',
      labelRu: 'Вес пациента',
      labelEn: 'Patient Weight',
      inputType: 'NUMBER',
      unit: 'kg',
      category: 'MEDICAL_INFO',
      validation: {
        min: 1,
        max: 300,
        required: true,
      },
      visibleToPatient: true,
      editableBy: 'CLINIC',
      isActive: true,
    },
    update: {},
  });

  // 2. Patient Height
  const heightTemplate = await prisma.metadataTemplate.upsert({
    where: { key: 'patient_height' },
    create: {
      key: 'patient_height',
      labelUz: 'Bemor bo\'yi',
      labelRu: 'Рост пациента',
      labelEn: 'Patient Height',
      inputType: 'NUMBER',
      unit: 'cm',
      category: 'MEDICAL_INFO',
      validation: {
        min: 50,
        max: 250,
        required: false,
      },
      visibleToPatient: true,
      editableBy: 'CLINIC',
      isActive: true,
    },
    update: {},
  });

  // 3. Fasting Hours (for blood tests)
  const fastingTemplate = await prisma.metadataTemplate.upsert({
    where: { key: 'fasting_hours' },
    create: {
      key: 'fasting_hours',
      labelUz: 'Och qoringa (soat)',
      labelRu: 'Натощак (часов)',
      labelEn: 'Fasting Hours',
      inputType: 'NUMBER',
      unit: 'soat',
      category: 'PREPARATION',
      validation: {
        min: 0,
        max: 24,
        required: false,
      },
      visibleToPatient: true,
      editableBy: 'CLINIC',
      isActive: true,
    },
    update: {},
  });

  console.log('✓ Created 3 metadata templates');

  // Link to services
  console.log('Linking templates to services...');

  // Get MRT and MSKT services
  const mrtServices = await prisma.diagnosticService.findMany({
    where: {
      OR: [
        { nameUz: { contains: 'MRT', mode: 'insensitive' } },
        { nameUz: { contains: 'МРТ', mode: 'insensitive' } },
        { nameUz: { contains: 'MSKT', mode: 'insensitive' } },
        { nameUz: { contains: 'МСКТ', mode: 'insensitive' } },
        { nameUz: { contains: 'KT', mode: 'insensitive' } },
        { nameUz: { contains: 'Rentgen', mode: 'insensitive' } },
      ],
    },
  });

  console.log(`Found ${mrtServices.length} MRT/MSKT/Rentgen services`);

  for (const service of mrtServices) {
    // Link weight template
    await prisma.serviceMetadataLink.upsert({
      where: {
        serviceType_serviceId_templateId: {
          serviceType: 'DIAGNOSTIC',
          serviceId: service.id,
          templateId: weightTemplate.id,
        },
      },
      create: {
        serviceType: 'DIAGNOSTIC',
        serviceId: service.id,
        templateId: weightTemplate.id,
        isRequired: true,
        displayOrder: 1,
      },
      update: {},
    });

    // Link height template
    await prisma.serviceMetadataLink.upsert({
      where: {
        serviceType_serviceId_templateId: {
          serviceType: 'DIAGNOSTIC',
          serviceId: service.id,
          templateId: heightTemplate.id,
        },
      },
      create: {
        serviceType: 'DIAGNOSTIC',
        serviceId: service.id,
        templateId: heightTemplate.id,
        isRequired: false,
        displayOrder: 2,
      },
      update: {},
    });

    console.log(`  ✓ Linked to: ${service.nameUz}`);
  }

  // Link fasting to blood test services
  const bloodServices = await prisma.diagnosticService.findMany({
    where: {
      OR: [
        { nameUz: { contains: 'qon', mode: 'insensitive' } },
        { nameUz: { contains: 'кровь', mode: 'insensitive' } },
        { nameUz: { contains: 'blood', mode: 'insensitive' } },
      ],
    },
    take: 10,
  });

  for (const service of bloodServices) {
    await prisma.serviceMetadataLink.upsert({
      where: {
        serviceType_serviceId_templateId: {
          serviceType: 'DIAGNOSTIC',
          serviceId: service.id,
          templateId: fastingTemplate.id,
        },
      },
      create: {
        serviceType: 'DIAGNOSTIC',
        serviceId: service.id,
        templateId: fastingTemplate.id,
        isRequired: false,
        displayOrder: 1,
      },
      update: {},
    });

    console.log(`  ✓ Linked fasting to: ${service.nameUz}`);
  }

  console.log('✓ Metadata seeding complete!');
}

seedMetadataTemplates()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
