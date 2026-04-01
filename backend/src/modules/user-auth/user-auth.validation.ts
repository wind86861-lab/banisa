import { z } from 'zod';

// ─── USER REGISTRATION SCHEMA ───────────────────────────────────────────────
export const userRegisterSchema = z.object({
    body: z.object({
        phone: z.string().min(9, 'Telefon raqam kamida 9 ta belgidan iborat bo\'lishi kerak'),
        password: z.string().min(6, 'Parol kamida 6 ta belgidan iborat bo\'lishi kerak'),
        firstName: z.string().min(2, 'Ism kamida 2 ta belgidan iborat bo\'lishi kerak'),
        lastName: z.string().min(2, 'Familiya kamida 2 ta belgidan iborat bo\'lishi kerak'),
        email: z.string().email('Email noto\'g\'ri formatda').optional().or(z.literal('')),
    }),
});

// ─── USER LOGIN SCHEMA ──────────────────────────────────────────────────────
export const userLoginSchema = z.object({
    body: z.object({
        phone: z.string().min(9, 'Telefon raqam kamida 9 ta belgidan iborat bo\'lishi kerak'),
        password: z.string().min(1, 'Parol kiritilishi shart'),
    }),
});
