/**
 * Shared working-hours gate. Both the single-booking path
 * (appointment.service.createBooking) and the cart-checkout path
 * (cart.service.checkout) call this so manual API hits can't ship a
 * time outside the clinic's published hours.
 *
 * Permissive when workingHours is missing/empty so existing clinics
 * that never configured a schedule keep accepting bookings.
 *
 * Day-of-week + HH:mm are computed in Asia/Tashkent — clinic hours
 * are entered in local time, not UTC.
 */
import { AppError, ErrorCodes } from '../../utils/errors';

const DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;

const DAY_LABEL_UZ: Record<string, string> = {
    sunday: 'Yakshanba', monday: 'Dushanba', tuesday: 'Seshanba',
    wednesday: 'Chorshanba', thursday: 'Payshanba', friday: 'Juma', saturday: 'Shanba',
};

export function assertWithinWorkingHours(
    clinic: { workingHours?: any; nameUz?: string },
    when: Date,
): void {
    const wh: any = clinic.workingHours;
    if (!wh) return;
    if (Array.isArray(wh) && wh.length === 0) return;
    if (!Array.isArray(wh) && Object.keys(wh).length === 0) return;

    const tash = new Date(when.getTime() + 5 * 60 * 60 * 1000);
    const dayKey = DAY_KEYS[tash.getUTCDay()];
    const hhmm = `${String(tash.getUTCHours()).padStart(2, '0')}:${String(tash.getUTCMinutes()).padStart(2, '0')}`;

    // Accept both shapes: keyed-by-day-name object (DB default) and
    // legacy [{day, isOpen, openTime, closeTime}] array.
    let day: any = null;
    if (Array.isArray(wh)) day = wh.find((d: any) => String(d?.day || '').toLowerCase() === dayKey);
    else day = wh[dayKey];

    if (!day) return;
    if (day.isAroundClock) return;
    if (!day.isOpen) {
        throw new AppError(
            `Klinika ${DAY_LABEL_UZ[dayKey]} kuni dam oladi. Iltimos, boshqa sanani tanlang.`,
            400, ErrorCodes.VALIDATION_ERROR,
        );
    }
    const open = day.openTime;
    const close = day.closeTime;
    if (open && hhmm < open) {
        throw new AppError(
            `Tanlangan vaqt klinika ish vaqti oraligʻidan tashqarida. Iltimos, ${open} dan keyingi vaqtni tanlang.`,
            400, ErrorCodes.VALIDATION_ERROR,
        );
    }
    if (close && hhmm > close) {
        throw new AppError(
            `Tanlangan vaqt klinika ish vaqti oraligʻidan tashqarida. Iltimos, ${close} dan oldingi vaqtni tanlang.`,
            400, ErrorCodes.VALIDATION_ERROR,
        );
    }
}
