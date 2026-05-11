// Patient-facing display helpers. Used across booking/check-in/ticket pages.

export const fmtSum = (n) => (n ? Number(n).toLocaleString('uz-UZ') : '0');

// "+998901234567" -> "+998 90 123 45 67". Tolerates already-formatted input.
export function fmtPhone(raw) {
    if (!raw) return '';
    const d = String(raw).replace(/\D/g, '');
    if (d.length === 12 && d.startsWith('998')) {
        return `+${d.slice(0, 3)} ${d.slice(3, 5)} ${d.slice(5, 8)} ${d.slice(8, 10)} ${d.slice(10, 12)}`;
    }
    return String(raw);
}

const UZ_WEEKDAYS = ['Yakshanba', 'Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba'];
const UZ_MONTHS = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr'];

// "2026-05-15T14:30:00Z" -> "Juma, 15-may, 14:30"
export function fmtDateTimeUz(input) {
    if (!input) return '';
    const d = new Date(input);
    if (Number.isNaN(d.getTime())) return '';
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${UZ_WEEKDAYS[d.getDay()]}, ${d.getDate()}-${UZ_MONTHS[d.getMonth()]}, ${hh}:${mm}`;
}

export function fmtDateUz(input) {
    if (!input) return '';
    const d = new Date(input);
    if (Number.isNaN(d.getTime())) return '';
    return `${UZ_WEEKDAYS[d.getDay()]}, ${d.getDate()}-${UZ_MONTHS[d.getMonth()]}`;
}

// "BK-2026-000127349" -> "#127349". Cashier-readable short code.
export function shortBookingNo(bookingNumber) {
    if (!bookingNumber) return '';
    const s = String(bookingNumber);
    const digits = s.match(/(\d+)\s*$/);
    if (!digits) return s;
    const last = digits[1].replace(/^0+/, '') || '0';
    return `#${last.slice(-6).padStart(6, '0')}`;
}

// Google Maps directions URL from clinic record (lat/lng preferred, else address).
export function mapsDirectionsUrl(clinic) {
    if (!clinic) return null;
    if (clinic.latitude != null && clinic.longitude != null) {
        return `https://www.google.com/maps/dir/?api=1&destination=${clinic.latitude},${clinic.longitude}`;
    }
    const addr = [clinic.street, clinic.district, clinic.region].filter(Boolean).join(', ');
    if (!addr) return null;
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(addr)}`;
}
