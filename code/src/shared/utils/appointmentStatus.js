// Single source of truth for patient-facing appointment status labels & flags.
// Keep clinic/admin pages free to define their own — they speak a different
// dialect (e.g. "Naqd — kelishi kutilmoqda"). This file is patient-side only.

export const STATUS_LABELS = {
    PENDING: { text: 'Operator kutmoqda', color: '#D97706', bg: '#FEF3C7' },
    PENDING_ARRIVAL: { text: 'Klinikaga keling', color: '#EA580C', bg: '#FFEDD5' },
    OPERATOR_CONFIRMED: { text: 'Tasdiqlandi', color: '#2563EB', bg: '#DBEAFE' },
    SENT_TO_CLINIC: { text: 'Klinikada ko\'rilmoqda', color: '#2563EB', bg: '#DBEAFE' },
    CLINIC_ACCEPTED: { text: 'Klinika qabul qildi', color: '#059669', bg: '#D1FAE5' },
    PAID: { text: 'To\'langan', color: '#059669', bg: '#D1FAE5' },
    CHECKED_IN: { text: 'Check-in qilindi', color: '#7C3AED', bg: '#EDE9FE' },
    IN_PROGRESS: { text: 'Xizmat jarayonda', color: '#7C3AED', bg: '#EDE9FE' },
    COMPLETED: { text: 'Yakunlandi', color: '#065F46', bg: '#D1FAE5' },
    CANCELLED: { text: 'Bekor qilindi', color: '#991B1B', bg: '#FEE2E2' },
    NO_SHOW: { text: 'Kelmadi', color: '#991B1B', bg: '#FEE2E2' },
    RESCHEDULED: { text: 'Vaqt o\'zgartirildi', color: '#D97706', bg: '#FEF3C7' },
};

export const statusLabel = (status) => STATUS_LABELS[status] || STATUS_LABELS.PENDING;

// Statuses that allow patient-initiated cancellation.
export const CANCELLABLE = new Set([
    'PENDING', 'PENDING_ARRIVAL', 'OPERATOR_CONFIRMED', 'SENT_TO_CLINIC', 'CLINIC_ACCEPTED'
]);

export const canCancel = (a) => !!a && CANCELLABLE.has(a.status);

// Patient should be told to scan the clinic wall QR.
export const needsCheckIn = (a) =>
    !!a && a.paymentMethod === 'CASH' && a.status === 'PENDING_ARRIVAL';

// Patient is at the clinic, waiting for cashier confirmation.
export const awaitingCashier = (a) =>
    !!a && a.paymentMethod === 'CASH' && a.status === 'CHECKED_IN' && a.paymentStatus !== 'PAID';

// Patient has paid and should proceed to service.
export const isReadyForService = (a) =>
    !!a && (a.paymentStatus === 'PAID' || a.status === 'COMPLETED' || a.status === 'IN_PROGRESS');

// Status-driven CTA shown on the ticket card. Returns { title, body, tone }.
export function nextActionFor(a) {
    if (!a) return null;
    if (a.status === 'CANCELLED') return { title: 'Bron bekor qilingan', body: 'Yangi bron yaratish uchun xizmatlarga qayting.', tone: 'error' };
    if (a.status === 'NO_SHOW') return { title: 'Tashrif qayd etilmadi', body: 'Bu bronni vaqtida foydalanmagansiz.', tone: 'error' };
    if (a.status === 'COMPLETED') return { title: 'Xizmat yakunlandi', body: 'Tashrifingizdan minnatdormiz!', tone: 'ok' };
    if (a.status === 'IN_PROGRESS') return { title: 'Xizmat jarayonda', body: 'Xizmat xonasida bo\'lganingiz uchun rahmat.', tone: 'ok' };

    if (needsCheckIn(a)) return {
        title: 'Klinikaga keling va check-in qiling',
        body: 'Klinikaga yetib borgach, "Check-in" tugmasini bosing.',
        tone: 'warning',
        cta: 'checkin',
    };
    if (awaitingCashier(a)) return {
        title: 'Naqd to\'lov tasdiqlanmoqda',
        body: 'Klinika to\'lovingizni tasdiqlashi kutilmoqda. Sahifa avtomatik yangilanadi.',
        tone: 'info',
        cta: 'await-cashier',
    };
    if (isReadyForService(a)) return {
        title: 'To\'lov qabul qilindi — xizmat xonasiga o\'ting',
        body: 'Sizni shifokor kutmoqda. Bron raqamingizni administratorga ayting.',
        tone: 'ok',
    };
    // PENDING / OPERATOR_CONFIRMED / SENT_TO_CLINIC / CLINIC_ACCEPTED (non-cash) — waiting for clinic
    if (a.paymentMethod !== 'CASH' && a.paymentStatus !== 'PAID' &&
        ['CLINIC_ACCEPTED', 'OPERATOR_CONFIRMED', 'SENT_TO_CLINIC'].includes(a.status)) {
        return { title: 'To\'lov kutilmoqda', body: 'Onlayn to\'lovni amalga oshiring va QR kodingizni oling.', tone: 'info', cta: 'pay' };
    }
    return { title: 'Operator tasdiqlashini kuting', body: 'Operator siz bilan tez orada bog\'lanadi.', tone: 'info' };
}

// "Bekor qilish qoidasi" — shown beside cancel button.
export function cancelPolicy(a) {
    if (!a) return '';
    if (a.paymentStatus === 'PAID') return 'To\'langan bronni bekor qilsangiz, klinika qoidalariga ko\'ra qisman qaytarish bo\'lishi mumkin. Bekor qilish uchun klinika bilan bog\'laning.';
    if (a.paymentMethod === 'CASH') return 'Naqd to\'lov tanlangan — bron bekor qilinsa hech qanday to\'lov yo\'q. Tashrif vaqtidan kamida 1 soat oldin bekor qiling.';
    return 'Tashrif vaqtidan kamida 1 soat oldin bekor qiling — keyinroq bekor qilish jazo qo\'shilishiga olib kelishi mumkin.';
}
