import { z } from 'zod';

// Shared JSON sub-schemas
const preparationJsonSchema = z.object({
    fastingHours: z.number().min(0).max(24).optional(),
    waterAllowed: z.boolean().optional(),
    stopMedications: z.string().optional(),
    alcoholHours: z.number().min(0).optional(),
    smokingHours: z.number().min(0).optional(),
    exerciseRestriction: z.string().optional(),
    specialDiet: z.string().optional(),
    bestTime: z.string().optional(),
    documents: z.array(z.string()).optional(),
    womenWarnings: z.string().optional(),
}).optional().nullable();

const indicationsJsonSchema = z.object({
    symptoms: z.array(z.string()).optional(),
    diseases: z.array(z.string()).optional(),
    preventive: z.string().optional(),
    mandatoryFor: z.array(z.string()).optional(),
}).optional().nullable();

const contraindicationsJsonSchema = z.object({
    absolute: z.array(z.string()).optional(),
    relative: z.array(z.string()).optional(),
    temporary: z.array(z.string()).optional(),
    warnings: z.array(z.string()).optional(),
}).optional().nullable();

const resultParameterSchema = z.object({
    name: z.string(),
    description: z.string().optional(),
    normalRange: z.string().optional(),
});

const additionalInfoSchema = z.object({
    equipment: z.string().optional(),
    certifications: z.array(z.string()).optional(),
    accuracy: z.string().optional(),
    experience: z.string().optional(),
    dailyCapacity: z.number().min(0).optional(),
    labImages: z.array(z.string()).optional(),
}).optional().nullable();

const bookingPolicySchema = z.object({
    prepaymentRequired: z.boolean().optional(),
    cancellationPolicy: z.string().optional(),
    modificationPolicy: z.string().optional(),
}).optional().nullable();

// Extended fields shared between create and update
const extendedFields = {
    sampleVolume: z.string().max(50).optional(),
    resultFormat: z.string().max(200).optional(),
    processDescription: z.string().optional(),
    resultParameters: z.array(resultParameterSchema).optional().nullable(),
    preparationJson: preparationJsonSchema,
    indicationsJson: indicationsJsonSchema,
    contraindicationsJson: contraindicationsJsonSchema,
    additionalInfo: additionalInfoSchema,
    bookingPolicy: bookingPolicySchema,
};

export const serviceSchema = z.object({
    body: z.object({
        nameUz: z.string().min(3).max(255),
        nameRu: z.string().max(255).optional(),
        nameEn: z.string().max(255).optional(),
        categoryId: z.string().uuid(),
        shortDescription: z.string().max(200).optional(),
        fullDescription: z.string().optional(),
        priceRecommended: z.number().min(0),
        priceMin: z.number().min(0),
        priceMax: z.number().min(0),
        durationMinutes: z.number().min(1).max(1440),
        resultTimeHours: z.number().min(0.5).max(720),
        preparation: z.string().max(1000).optional(),
        contraindications: z.string().max(500).optional(),
        sampleType: z.string().max(100).optional(),
        imageUrl: z.string().url().optional(),
        isActive: z.boolean().optional(),
        ...extendedFields,
    }).refine(
        (data) => data.priceMin <= data.priceRecommended && data.priceRecommended <= data.priceMax,
        {
            message: 'Price validation: min <= recommended <= max',
            path: ['priceRecommended'],
        }
    ),
});

export const updateSchema = z.object({
    body: z.object({
        nameUz: z.string().min(3).max(255).optional(),
        nameRu: z.string().max(255).optional(),
        nameEn: z.string().max(255).optional(),
        categoryId: z.string().uuid().optional(),
        shortDescription: z.string().max(200).optional(),
        fullDescription: z.string().optional(),
        priceRecommended: z.number().min(0).optional(),
        priceMin: z.number().min(0).optional(),
        priceMax: z.number().min(0).optional(),
        durationMinutes: z.number().min(1).max(1440).optional(),
        resultTimeHours: z.number().min(0.5).max(720).optional(),
        preparation: z.string().max(1000).optional(),
        contraindications: z.string().max(500).optional(),
        sampleType: z.string().max(100).optional(),
        imageUrl: z.string().url().optional(),
        isActive: z.boolean().optional(),
        ...extendedFields,
    }),
});
