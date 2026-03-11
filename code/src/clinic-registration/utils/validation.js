import { z } from 'zod';

export const step1Schema = z.object({
  nameUz: z.string().min(2, "Klinika nomi kamida 2 ta belgi bo'lishi kerak"),
  nameRu: z.string().optional().or(z.literal('')),
  nameEn: z.string().optional().or(z.literal('')),
  clinicType: z.enum(['diagnostika_markazi', 'poliklinika', 'kasalxona', 'ixtisoslashgan_markaz', 'tish_klinikasi', 'sanatoriya'], {
    errorMap: () => ({ message: "Klinika turini tanlang" })
  }),
  foundedYear: z.string().optional().or(z.literal('')),
  descriptionUz: z.string().min(50, "Tavsif kamida 50 ta belgidan iborat bo'lishi kerak"),
  descriptionRu: z.string().optional().or(z.literal('')),
});

export const step2Schema = z.object({
  regionId: z.string().min(1, "Viloyatni tanlang"),
  districtId: z.string().min(1, "Tumanni tanlang"),
  streetAddress: z.string().min(3, "Ko'cha manzilini kiriting"),
  addressUz: z.string().min(5, "To'liq manzilni kiriting"),
  addressRu: z.string().optional().or(z.literal('')),
  zipCode: z.string().optional().or(z.literal('')),
  googleMapsUrl: z.string().url("Noto'g'ri URL format").optional().or(z.literal('')),
  landmark: z.string().optional().or(z.literal('')),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

const uzPhoneRegex = /^\+998\s?\d{2}\s?\d{3}[-\s]?\d{2}[-\s]?\d{2}$/;

export const step3Schema = z.object({
  primaryPhone: z.string().regex(uzPhoneRegex, "Noto'g'ri telefon format: +998 XX XXX-XX-XX"),
  secondaryPhone: z.string().regex(uzPhoneRegex, "Noto'g'ri telefon format").optional().or(z.literal('')),
  emergencyPhone: z.string().regex(uzPhoneRegex, "Noto'g'ri telefon format").optional().or(z.literal('')),
  email: z.string().email("Noto'g'ri email format"),
  website: z.string().url("Noto'g'ri URL format").optional().or(z.literal('')),
  telegram: z.string().optional().or(z.literal('')),
  instagram: z.string().optional().or(z.literal('')),
  facebook: z.string().optional().or(z.literal('')),
  youtube: z.string().optional().or(z.literal('')),
});

const daySchedule = z.object({
  isOpen: z.boolean(),
  openTime: z.string(),
  closeTime: z.string(),
  isAroundClock: z.boolean(),
});

export const step4Schema = z.object({
  workingHours: z.object({
    monday: daySchedule,
    tuesday: daySchedule,
    wednesday: daySchedule,
    thursday: daySchedule,
    friday: daySchedule,
    saturday: daySchedule,
    sunday: daySchedule,
  }),
  isAlwaysOpen: z.boolean(),
  lunchBreakStart: z.string().optional().or(z.literal('')),
  lunchBreakEnd: z.string().optional().or(z.literal('')),
  holidayNotes: z.string().optional().or(z.literal('')),
});

export const step5Schema = z.object({
  selectedServices: z.array(z.string()).min(1, "Kamida bitta xizmatni tanlang"),
});

const passwordSchema = z.string()
  .min(8, "Parol kamida 8 ta belgi")
  .regex(/[A-Z]/, "Kamida bitta katta harf")
  .regex(/[0-9]/, "Kamida bitta raqam")
  .regex(/[^A-Za-z0-9]/, "Kamida bitta maxsus belgi");

const personSchema = z.object({
  firstName: z.string().min(2, "Kamida 2 belgi"),
  lastName: z.string().min(2, "Kamida 2 belgi"),
  middleName: z.string().optional().or(z.literal('')),
  position: z.string().min(1, "Lavozimni tanlang"),
  phone: z.string().regex(uzPhoneRegex, "Telefon noto'g'ri formatda"),
  email: z.string().email("Email noto'g'ri").optional().or(z.literal('')),
  password: passwordSchema,
  passwordConfirm: z.string().min(1, "Parolni tasdiqlang"),
}).refine(d => d.password === d.passwordConfirm, {
  message: "Parollar mos emas",
  path: ["passwordConfirm"],
});

export { personSchema };

export const step6Schema = z.object({
  persons: z.array(personSchema).min(1, "Kamida 1 ta mas'ul shaxs").max(3),
  agreeTerms: z.boolean().refine(v => v === true, "Majburiy"),
  agreePrivacy: z.boolean().refine(v => v === true, "Majburiy"),
}).refine(
  data => new Set(data.persons.map(p => p.phone)).size === data.persons.length,
  { message: "Telefon raqamlar bir-biridan farqli bo'lishi kerak", path: ["persons"] }
);

export const step7Schema = z.object({
  licenseNumber: z.string().min(3, "Litsenziya raqamini kiriting"),
  licenseExpiry: z.string().min(1, "Litsenziya muddatini tanlang"),
  inn: z.string().length(9, "INN 9 ta raqamdan iborat bo'lishi kerak").regex(/^\d{9}$/, "INN faqat raqamlardan iborat"),
  legalName: z.string().min(3, "Yuridik nomni kiriting"),
  legalAddress: z.string().min(5, "Yuridik manzilni kiriting"),
  legalForm: z.string().optional().or(z.literal('')),
});

export const step8Schema = z.object({
  bankName: z.string().min(1, "Bankni tanlang"),
  bankAccountNumber: z.string().length(20, "Hisob raqami 20 ta raqamdan iborat bo'lishi kerak").regex(/^\d{20}$/, "Faqat raqamlar"),
  mfo: z.string().length(5, "MFO 5 ta raqamdan iborat").regex(/^\d{5}$/, "Faqat raqamlar"),
  oked: z.string().optional().or(z.literal('')),
  vatNumber: z.string().optional().or(z.literal('')),
  paymentMethods: z.array(z.string()).min(1, "Kamida bitta to'lov usulini tanlang"),
  invoiceEmail: z.string().email("Noto'g'ri email").optional().or(z.literal('')),
});

export const STEP_SCHEMAS = {
  1: step1Schema,
  2: step2Schema,
  3: step3Schema,
  4: step4Schema,
  5: step5Schema,
  6: step6Schema,
  7: step7Schema,
  8: step8Schema,
};
