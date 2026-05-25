import { z } from 'zod';

const AnesthesiaType = z.enum(['LOCAL', 'GENERAL', 'SPINAL', 'SEDATION']);
const RoomType = z.enum(['STANDARD', 'COMFORT', 'LUX', 'VIP']);
const Complexity = z.enum(['SIMPLE', 'MEDIUM', 'COMPLEX', 'ADVANCED']);
const RiskLevel = z.enum(['LOW', 'MEDIUM', 'HIGH']);

const surgicalServiceBody = z.object({
    nameUz: z.string().min(3).max(255),
    nameRu: z.string().max(255).optional().nullable(),
    nameEn: z.string().max(255).optional().nullable(),
    categoryId: z.string().uuid(),
    shortDescription: z.string().max(200).optional().nullable(),
    fullDescription: z.string().optional().nullable(),
    imageUrl: z.string().max(500).optional().nullable(),

    priceRecommended: z.number().min(0),
    priceMin: z.number().min(0),
    priceMax: z.number().min(0),
    durationMinutes: z.number().min(0),
    minDuration: z.number().min(0).optional().nullable(),
    maxDuration: z.number().min(0).optional().nullable(),
    recoveryDays: z.number().min(0),

    anesthesiaType: AnesthesiaType,
    anesthesiaNotes: z.string().optional().nullable(),

    requiresHospitalization: z.boolean().default(true),
    hospitalizationDays: z.number().min(0).optional().nullable(),
    roomType: RoomType.optional().nullable(),
    requiresICU: z.boolean().default(false).optional(),
    icuDays: z.number().min(0).optional().nullable(),
    hospitalizationNotes: z.string().optional().nullable(),

    requiredTests: z.any().optional().nullable(),
    preparationFasting: z.boolean().default(false).optional(),
    fastingHours: z.number().min(0).optional().nullable(),
    preparationMedication: z.string().optional().nullable(),
    preparationRestrictions: z.any().optional().nullable(),
    preparationTimeline: z.string().optional().nullable(),
    contraindicationsAbsolute: z.any().optional().nullable(),
    contraindicationsRelative: z.any().optional().nullable(),

    complexity: Complexity,
    riskLevel: RiskLevel,
    minSurgeonExperience: z.number().min(0),
    surgeonQualifications: z.any().optional().nullable(),
    surgeonSpecialization: z.string().optional().nullable(),
    requiredEquipment: z.any().optional().nullable(),
    operationStages: z.any().optional().nullable(),

    postOpImmediate: z.any().optional().nullable(),
    postOpHome: z.any().optional().nullable(),
    followUpSchedule: z.any().optional().nullable(),
    recoveryMilestones: z.any().optional().nullable(),

    packageIncluded: z.any().optional().nullable(),
    packageExcluded: z.any().optional().nullable(),

    alternatives: z.any().optional().nullable(),
    faqs: z.any().optional().nullable(),
    successRate: z.number().min(0).max(100).optional().nullable(),
    videoUrl: z.string().url().optional().nullable(),
    isActive: z.boolean().optional(),
});

export const surgicalServiceSchema = z.object({
    body: surgicalServiceBody.refine(
        (data) => data.priceMin <= data.priceRecommended && data.priceRecommended <= data.priceMax,
        {
            message: 'Price validation: min <= recommended <= max',
            path: ['priceRecommended'],
        }
    ),
});

export const updateSurgicalSchema = z.object({
    body: surgicalServiceBody.partial(),
});
