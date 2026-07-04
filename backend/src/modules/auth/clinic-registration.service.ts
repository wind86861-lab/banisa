import bcrypt from 'bcrypt';
import prisma from '../../config/database';
import { AppError, ErrorCodes } from '../../utils/errors';

const BCRYPT_ROUNDS = 12;

interface PersonInput {
  firstName: string;
  lastName: string;
  middleName?: string;
  position: string;
  phone: string;
  email?: string;
  password: string;
  isPrimary?: boolean;
}

interface RegistrationInput {
  // Step 1
  nameUz: string;
  nameRu?: string;
  nameEn?: string;
  clinicType: string;
  foundedYear?: number;
  descriptionUz: string;
  descriptionRu?: string;
  logoUrl?: string;

  // Step 2
  regionId: string;
  districtId: string;
  streetAddress: string;
  addressUz: string;
  addressRu?: string;
  zipCode?: string;
  googleMapsUrl?: string;
  landmark?: string;
  latitude?: number;
  longitude?: number;

  // Step 3
  primaryPhone: string;
  secondaryPhone?: string;
  emergencyPhone?: string;
  email: string;
  website?: string;
  telegram?: string;
  instagram?: string;
  facebook?: string;
  youtube?: string;

  // Step 4
  workingHours: object;
  isAlwaysOpen?: boolean;
  lunchBreakStart?: string;
  lunchBreakEnd?: string;
  holidayNotes?: string;

  // Step 5
  selectedServices?: string[];

  // Step 6 — persons array
  persons: PersonInput[];

  // Step 7
  licenseUrl?: string;
  licenseNumber: string;
  licenseExpiry: string;
  inn: string;
  legalName: string;
  legalAddress: string;
  legalForm?: string;
  certificates?: string[];

  // Step 8
  bankName: string;
  bankAccountNumber: string;
  mfo: string;
  oked?: string;
  vatNumber?: string;
  paymentMethods?: string[];
  invoiceEmail?: string;
}

const CLINIC_TYPE_MAP: Record<string, string> = {
  diagnostika_markazi: 'DIAGNOSTIC',
  poliklinika: 'GENERAL',
  kasalxona: 'GENERAL',
  stacionar: 'GENERAL',
  ixtisoslashgan_markaz: 'SPECIALIZED',
  tish_klinikasi: 'DENTAL',
  sanatoriya: 'REHABILITATION',
  tug_ruqxona: 'MATERNITY',
  dorixona: 'PHARMACY',
};

export const createClinicRegistration = async (input: RegistrationInput) => {
  // 0. Sanitize types — frontend may send wrong types
  // foundedYear: "" → null, "2020" → 2020
  if (input.foundedYear !== undefined && input.foundedYear !== null) {
    const year = parseInt(String(input.foundedYear), 10);
    input.foundedYear = isNaN(year) ? undefined : year;
  } else {
    input.foundedYear = undefined;
  }

  // latitude/longitude: convert to number or undefined
  if (typeof input.latitude === 'string') {
    const lat = parseFloat(input.latitude);
    input.latitude = isNaN(lat) ? undefined : lat;
  }
  if (typeof input.longitude === 'string') {
    const lng = parseFloat(input.longitude);
    input.longitude = isNaN(lng) ? undefined : lng;
  }

  // Ensure arrays are arrays
  input.selectedServices = Array.isArray(input.selectedServices) ? input.selectedServices : [];
  input.certificates = Array.isArray(input.certificates) ? input.certificates : [];
  input.paymentMethods = Array.isArray(input.paymentMethods) ? input.paymentMethods : [];

  // persons must exist
  if (!Array.isArray(input.persons)) input.persons = [];

  // 1. Validate: min 1, max 3 persons
  if (!input.persons || input.persons.length === 0) {
    throw new AppError('Kamida 1 ta mas\'ul shaxs kerak', 400, ErrorCodes.VALIDATION_ERROR);
  }
  if (input.persons.length > 3) {
    throw new AppError('Ko\'pi bilan 3 ta mas\'ul shaxs bo\'lishi mumkin', 400, ErrorCodes.VALIDATION_ERROR);
  }

  // 2. Check all phones unique across persons
  const phones = input.persons.map(p => p.phone);
  const uniquePhones = new Set(phones);
  if (uniquePhones.size !== phones.length) {
    throw new AppError('Telefon raqamlar bir-biridan farqli bo\'lishi kerak', 400, ErrorCodes.VALIDATION_ERROR);
  }

  // 3. Check no phone already registered as User
  for (const phone of phones) {
    const existing = await prisma.user.findUnique({ where: { phone } });
    if (existing) {
      throw new AppError(`${phone} raqami allaqachon ro'yxatdan o'tgan`, 400, ErrorCodes.DUPLICATE_ERROR);
    }
  }

  // 4. Hash all passwords
  const hashedPersons = await Promise.all(
    input.persons.map(async (person, index) => {
      // Validate each person has required fields
      if (!person.phone) throw new AppError(`${index + 1}-shaxs telefon raqami kiritilmagan`, 400, ErrorCodes.VALIDATION_ERROR);
      if (!person.password) throw new AppError(`${index + 1}-shaxs paroli kiritilmagan`, 400, ErrorCodes.VALIDATION_ERROR);
      if (!person.firstName) throw new AppError(`${index + 1}-shaxs ismi kiritilmagan`, 400, ErrorCodes.VALIDATION_ERROR);
      if (!person.lastName) throw new AppError(`${index + 1}-shaxs familiyasi kiritilmagan`, 400, ErrorCodes.VALIDATION_ERROR);

      return {
        firstName: person.firstName,
        lastName: person.lastName,
        middleName: person.middleName,
        position: person.position || 'Mas\'ul shaxs',
        phone: person.phone,
        email: person.email || undefined,
        passwordHash: await bcrypt.hash(person.password, BCRYPT_ROUNDS),
        isPrimary: index === 0, // first person is always primary
      };
    })
  );

  // 5. Create Clinic AND User accounts in transaction
  const primary = hashedPersons[0];
  const result = await prisma.$transaction(async (tx) => {
    // Create clinic
    const clinic = await (tx.clinic as any).create({
      data: {
        nameUz: input.nameUz,
        nameRu: input.nameRu ?? null,
        nameEn: input.nameEn ?? null,
        type: CLINIC_TYPE_MAP[input.clinicType] ?? 'GENERAL',
        description: input.descriptionUz,
        logo: input.logoUrl ?? null,
        source: 'SELF_REGISTERED',
        status: 'PENDING',
        isActive: false,
        submittedAt: new Date(),

        region: input.regionId,
        district: input.districtId,
        street: input.streetAddress,
        landmark: input.landmark ?? null,
        latitude: input.latitude ?? null,
        longitude: input.longitude ?? null,

        phones: [input.primaryPhone, input.secondaryPhone, input.emergencyPhone].filter(Boolean),
        emails: input.email ? [input.email] : [],
        website: input.website ?? null,
        workingHours: input.workingHours ?? {},

        taxId: input.inn ?? null,
        licenseNumber: input.licenseNumber ?? null,

        adminFirstName: primary?.firstName ?? null,
        adminLastName: primary?.lastName ?? null,
        adminEmail: primary?.email ?? input.email ?? null,
        adminPhone: primary?.phone ?? input.primaryPhone ?? null,
        adminPosition: primary?.position ?? null,

        pendingPersons: hashedPersons as any,
      },
      select: {
        id: true,
        status: true,
        nameUz: true,
        adminPhone: true,
        createdAt: true,
        submittedAt: true,
        pendingPersons: true,
      },
    });

    // Create User accounts immediately with PENDING_CLINIC role
    // Only primary person gets clinicId (it's @unique)
    const users = await Promise.all(
      hashedPersons.map(async (person, index) => {
        const isPrimary = index === 0;
        return tx.user.create({
          data: {
            phone: person.phone,
            email: person.email ?? null,
            passwordHash: person.passwordHash,
            firstName: person.firstName,
            lastName: person.lastName,
            role: 'PENDING_CLINIC',
            status: 'PENDING',
            isActive: true,
            ...(isPrimary && { clinicId: clinic.id }),
          },
          select: {
            id: true,
            phone: true,
            firstName: true,
            lastName: true,
            role: true,
            status: true,
          },
        });
      })
    );

    return { clinic, users };
  });

  const clinic = result.clinic;

  return {
    id: clinic.id,
    status: clinic.status,
    nameUz: clinic.nameUz,
    createdAt: clinic.submittedAt ?? clinic.createdAt,
    persons: hashedPersons.map(p => ({
      id: null,
      firstName: p.firstName,
      lastName: p.lastName,
      phone: p.phone,
      isPrimary: p.isPrimary,
    })),
  };
};
