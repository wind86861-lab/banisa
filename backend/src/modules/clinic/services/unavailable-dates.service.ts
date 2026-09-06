import prisma from '../../../config/database';
import { AppError, ErrorCodes } from '../../../utils/errors';

/** serviceType values accepted for blocked dates. */
export const UNAVAIL_TYPES = new Set(['DIAGNOSTIC', 'SURGICAL', 'SANATORIUM', 'CHECKUP', 'DOCTOR']);

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Parse a 'YYYY-MM-DD' into a UTC-midnight Date for the @db.Date column
 *  (calendar-date stable, no timezone drift). Returns null if malformed. */
function toDateOnly(s: string): Date | null {
    if (!DATE_RE.test(s)) return null;
    const d = new Date(`${s}T00:00:00.000Z`);
    return Number.isNaN(d.getTime()) ? null : d;
}

/** Format a Date-only column value back to 'YYYY-MM-DD'. */
function fmt(d: Date): string {
    return new Date(d).toISOString().slice(0, 10);
}

/** The Asia/Tashkent calendar date (YYYY-MM-DD) of an instant. */
export function tashkentDateStr(when: Date): string {
    return new Date(when.getTime() + 5 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function assertType(serviceType: string) {
    if (!UNAVAIL_TYPES.has(serviceType)) {
        throw new AppError('serviceType yaroqsiz', 400, ErrorCodes.VALIDATION_ERROR);
    }
}

/** List blocked dates ('YYYY-MM-DD') for one service, ascending. */
export async function listUnavailableDates(clinicId: string, serviceType: string, serviceId: string): Promise<string[]> {
    assertType(serviceType);
    if (!serviceId) throw new AppError('serviceId kerak', 400, ErrorCodes.VALIDATION_ERROR);
    const rows = await (prisma as any).serviceUnavailableDate.findMany({
        where: { clinicId, serviceType, serviceId },
        orderBy: { date: 'asc' },
        select: { date: true },
    });
    return rows.map((r: any) => fmt(r.date));
}

/** Replace the whole blocked-date set for one service (idempotent). */
export async function replaceUnavailableDates(
    clinicId: string, serviceType: string, serviceId: string, dates: unknown,
): Promise<string[]> {
    assertType(serviceType);
    if (!serviceId) throw new AppError('serviceId kerak', 400, ErrorCodes.VALIDATION_ERROR);
    const arr = Array.isArray(dates) ? dates : [];
    // Validate + dedupe; drop past dates silently (blocking yesterday is moot).
    const today = tashkentDateStr(new Date());
    const clean = [...new Set(arr.map(String))].filter((s) => {
        const d = toDateOnly(s);
        return d !== null && s >= today;
    });
    for (const s of clean) if (!toDateOnly(s)) throw new AppError(`Sana yaroqsiz: ${s}`, 400, ErrorCodes.VALIDATION_ERROR);

    await prisma.$transaction(async (tx: any) => {
        await tx.serviceUnavailableDate.deleteMany({ where: { clinicId, serviceType, serviceId } });
        if (clean.length) {
            await tx.serviceUnavailableDate.createMany({
                data: clean.map((s) => ({ clinicId, serviceType, serviceId, date: toDateOnly(s)! })),
                skipDuplicates: true,
            });
        }
    });
    return listUnavailableDates(clinicId, serviceType, serviceId);
}

/** Gate helper: is (clinic, service, calendar-date-of-`when`) blocked? */
export async function isDateBlocked(
    clinicId: string, serviceType: string, serviceId: string, when: Date,
): Promise<boolean> {
    const dateStr = tashkentDateStr(when);
    const hit = await (prisma as any).serviceUnavailableDate.findUnique({
        where: {
            clinicId_serviceType_serviceId_date: {
                clinicId, serviceType, serviceId, date: toDateOnly(dateStr)!,
            },
        },
        select: { id: true },
    });
    return !!hit;
}
