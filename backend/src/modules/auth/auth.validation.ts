import { z } from 'zod';

// Reusable strong password schema (VULN-06)
export const passwordSchema = z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(72, 'Password must not exceed 72 characters') // bcrypt hard limit
    .regex(/[A-Z]/, 'Password must contain at least 1 uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least 1 lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least 1 number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least 1 special character (!@#$%^&*)');

// Accept both formatted (+998 12 345-67-89) and unformatted (+998123456789)
const uzPhoneRegex = /^\+998[\s\-()]*\d{2}[\s\-()]*\d{3}[\s\-()]*\d{2}[\s\-()]*\d{2}$/;

export const registerSchema = z.object({
    body: z.object({
        phone: z.string().regex(uzPhoneRegex, 'Invalid phone format: +998XXXXXXXXX'),
        email: z.string().email().optional(),
        password: passwordSchema,
        firstName: z.string().min(2).optional(),
        lastName: z.string().min(2).optional(),
        role: z.enum(['SUPER_ADMIN', 'CLINIC_ADMIN', 'PATIENT', 'PENDING_CLINIC']).optional(),
    }),
});

// ─── SUPER ADMIN login: phone + password ────────────────────────────────────
export const adminLoginSchema = z.object({
    body: z.object({
        phone: z.string().regex(uzPhoneRegex, 'Telefon noto\'g\'ri formatda (+998XXXXXXXXX)'),
        password: z.string().min(1, 'Parol kiritilmagan'),
    }),
});

// ─── CLINIC ADMIN login: phone + password ───────────────────────────────────
export const clinicLoginSchema = z.object({
    body: z.object({
        phone: z.string().regex(uzPhoneRegex, 'Telefon noto\'g\'ri formatda (+998XXXXXXXXX)'),
        password: z.string().min(1, 'Parol kiritilmagan'),
    }),
});
