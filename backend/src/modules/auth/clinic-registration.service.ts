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

  // 5. Create Clinic directly with source=SELF_REGISTERED; store persons in pendingPersons
  const primary = hashedPersons[0];
  const clinic = await (prisma.clinic as any).create({
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

export const getRegistrationStatus = async (requestId: string) => {
  // 1. Check Clinic table first (new registrations go here directly)
  const clinic = await (prisma.clinic as any).findUnique({
    where: { id: requestId },
    select: {
      id: true,
      status: true,
      nameUz: true,
      type: true,
      adminPhone: true,
      adminEmail: true,
      region: true,
      district: true,
      rejectionReason: true,
      reviewedAt: true,
      createdAt: true,
      submittedAt: true,
      pendingPersons: true,
    },
  });

  if (clinic) {
    const persons = (clinic.pendingPersons as any[]) ?? [];
    return {
      id: clinic.id,
      status: clinic.status,
      nameUz: clinic.nameUz,
      clinicType: clinic.type,
      primaryPhone: clinic.adminPhone,
      email: clinic.adminEmail,
      addressUz: [clinic.region, clinic.district].filter(Boolean).join(', '),
      regionId: clinic.region,
      rejectionReason: clinic.rejectionReason,
      reviewedAt: clinic.reviewedAt,
      createdAt: clinic.submittedAt ?? clinic.createdAt,
      persons: persons.map((p: any) => ({
        phone: p.phone,
        firstName: p.firstName,
        lastName: p.lastName,
        isPrimary: p.isPrimary,
      })),
    };
  }

  // 2. Fallback: old ClinicRegistrationRequest table
  const request = await prisma.clinicRegistrationRequest.findUnique({
    where: { id: requestId },
    select: {
      id: true,
      status: true,
      nameUz: true,
      clinicType: true,
      primaryPhone: true,
      email: true,
      addressUz: true,
      regionId: true,
      rejectionReason: true,
      reviewedAt: true,
      createdAt: true,
      persons: {
        select: { phone: true, firstName: true, lastName: true, isPrimary: true },
      },
    },
  });

  if (!request) throw new AppError('Ariza topilmadi', 404, ErrorCodes.NOT_FOUND);
  return request;
};

// ─── ADMIN FUNCTIONS ─────────────────────────────────────────────────────────

export const getAllRegistrations = async (status?: string) => {
  const where: any = status ? { status: status as any } : {};

  const requests = await prisma.clinicRegistrationRequest.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      persons: {
        where: { isPrimary: true },
        select: {
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
        },
        take: 1,
      },
    },
  });

  return requests.map(req => ({
    ...req,
    adminEmail: req.persons[0]?.email || '',
    adminPhone: req.persons[0]?.phone || '',
    firstName: req.persons[0]?.firstName || '',
    lastName: req.persons[0]?.lastName || '',
  }));
};

export const getRegistrationById = async (id: string) => {
  const request = await prisma.clinicRegistrationRequest.findUnique({
    where: { id },
    include: {
      persons: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          middleName: true,
          position: true,
          phone: true,
          email: true,
          isPrimary: true,
        },
      },
    },
  });

  if (!request) {
    throw new AppError('Ariza topilmadi', 404, ErrorCodes.NOT_FOUND);
  }

  const primary = request.persons.find(p => p.isPrimary);
  return {
    ...request,
    adminEmail: primary?.email || '',
    adminPhone: primary?.phone || '',
    firstName: primary?.firstName || '',
    lastName: primary?.lastName || '',
  };
};

export const reviewRegistration = async (id: string) => {
  const request = await prisma.clinicRegistrationRequest.findUnique({
    where: { id },
  });

  if (!request) {
    throw new AppError('Ariza topilmadi', 404, ErrorCodes.NOT_FOUND);
  }

  if (request.status !== 'PENDING') {
    throw new AppError('Faqat PENDING holatidagi arizalarni ko\'rib chiqish mumkin', 400, ErrorCodes.VALIDATION_ERROR);
  }

  return await prisma.clinicRegistrationRequest.update({
    where: { id },
    data: {
      status: 'IN_REVIEW',
      reviewedAt: new Date(),
    },
  });
};

export const approveRegistration = async (id: string) => {
  const request = await prisma.clinicRegistrationRequest.findUnique({
    where: { id },
    include: { persons: true },
  });

  if (!request) {
    throw new AppError('Ariza topilmadi', 404, ErrorCodes.NOT_FOUND);
  }

  if (!['PENDING', 'IN_REVIEW'].includes(request.status)) {
    throw new AppError('Bu arizani tasdiqlash mumkin emas', 400, ErrorCodes.VALIDATION_ERROR);
  }

  // Create clinic and users in transaction
  const result = await prisma.$transaction(async (tx) => {
    // 1. Create clinic - map registration fields to actual Clinic schema
    const primaryPerson = request.persons.find(p => p.isPrimary) || request.persons[0];
    const clinic = await (tx.clinic as any).create({
      data: {
        nameUz: request.nameUz,
        nameRu: request.nameRu,
        nameEn: request.nameEn,
        description: request.descriptionUz,
        logo: request.logoUrl,
        source: 'SELF_REGISTERED',
        status: 'APPROVED',
        isActive: true,
        submittedAt: request.createdAt,
        reviewedAt: new Date(),
        region: request.regionId,
        district: request.districtId,
        street: request.streetAddress,
        landmark: request.landmark,
        latitude: request.latitude,
        longitude: request.longitude,
        phones: [request.primaryPhone, request.secondaryPhone].filter(Boolean) as any,
        emails: [request.email].filter(Boolean) as any,
        website: request.website,
        workingHours: request.workingHours as any,
        taxId: request.inn,
        licenseNumber: request.licenseNumber,
        adminFirstName: primaryPerson.firstName,
        adminLastName: primaryPerson.lastName,
        adminEmail: primaryPerson.email || request.email,
        adminPhone: primaryPerson.phone,
      },
    });

    // 2. Create users — only primary person gets clinicId (clinicId is @unique)
    const users = await Promise.all(
      request.persons.map(async (person, index) => {
        const isPrimary = person.isPrimary || index === 0;
        const existing = await tx.user.findFirst({ where: { phone: person.phone } });
        if (existing) {
          return tx.user.update({
            where: { id: existing.id },
            data: { role: 'CLINIC_ADMIN', status: 'APPROVED', ...(isPrimary && { clinicId: clinic.id }) },
          });
        }
        return tx.user.create({
          data: {
            phone: person.phone,
            email: person.email,
            passwordHash: person.passwordHash,
            firstName: person.firstName,
            lastName: person.lastName,
            role: 'CLINIC_ADMIN',
            status: 'APPROVED',
            isActive: true,
            ...(isPrimary && { clinicId: clinic.id }),
          },
        });
      })
    );

    // 3. Update registration status
    await tx.clinicRegistrationRequest.update({
      where: { id },
      data: {
        status: 'APPROVED',
        reviewedAt: new Date(),
      },
    });

    return { clinic, users };
  });

  return result;
};

export const rejectRegistration = async (id: string, reason: string) => {
  const request = await prisma.clinicRegistrationRequest.findUnique({
    where: { id },
  });

  if (!request) {
    throw new AppError('Ariza topilmadi', 404, ErrorCodes.NOT_FOUND);
  }

  if (!['PENDING', 'IN_REVIEW'].includes(request.status)) {
    throw new AppError('Bu arizani rad etish mumkin emas', 400, ErrorCodes.VALIDATION_ERROR);
  }

  if (!reason || reason.trim().length < 10) {
    throw new AppError('Rad etish sababi kamida 10 ta belgidan iborat bo\'lishi kerak', 400, ErrorCodes.VALIDATION_ERROR);
  }

  return await prisma.clinicRegistrationRequest.update({
    where: { id },
    data: {
      status: 'REJECTED',
      rejectionReason: reason,
      reviewedAt: new Date(),
    },
  });
};
