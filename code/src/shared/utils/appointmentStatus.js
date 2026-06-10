// Single source of truth for patient-facing appointment status labels & flags.
// The new simplified status set has 7 values — see backend enum
// AppointmentStatus. Payment state is tracked separately in `paymentStatus`
// so this file never reads `status === 'PAID'`.

export const STATUS_LABELS = {
    PENDING:     { text: 'Klinika tasdiqi kutilmoqda', color: '#D97706', bg: '#FEF3C7' },
    CONFIRMED:   { text: 'Tasdiqlandi — kelishingiz mumkin', color: '#059669', bg: '#D1FAE5' },
    CHECKED_IN:  { text: 'Check-in qilindi', color: '#7C3AED', bg: '#EDE9FE' },
    IN_PROGRESS: { text: 'Xizmat jarayonda', color: '#7C3AED', bg: '#EDE9FE' },
    COMPLETED:   { text: 'Yakunlandi', color: '#065F46', bg: '#D1FAE5' },
    CANCELLED:   { text: 'Bekor qilindi', color: '#991B1B', bg: '#FEE2E2' },
    NO_SHOW:     { text: 'Kelmadi', color: '#991B1B', bg: '#FEE2E2' },
};

export const statusLabel = (status) => STATUS_LABELS[status] || STATUS_LABELS.PENDING;

// Statuses that allow patient-initiated cancellation (no money moved yet,
// or paid online but clinic hasn't seen them).
export const CANCELLABLE = new Set(['PENDING', 'CONFIRMED']);

export const canCancel = (a) => !!a && CANCELLABLE.has(a.status);

// Patient is ready to scan the clinic wall QR. Only CONFIRMED bookings
// can check in — payment state is independent (cash flow pays after
// arrival; online flow pays before).
export const canCheckIn = (a) => !!a && a.status === 'CONFIRMED';

export const needsCheckIn = canCheckIn;

// Patient is at the clinic, waiting for cashier to confirm cash payment.
export const awaitingCashier = (a) =>
    !!a && a.paymentMethod === 'CASH' && a.status === 'CHECKED_IN' && a.paymentStatus !== 'PAID';

// Patient has paid (or is in IN_PROGRESS/COMPLETED) — proceed to service.
export const isReadyForService = (a) =>
    !!a && (a.paymentStatus === 'PAID' || a.status === 'COMPLETED' || a.status === 'IN_PROGRESS');

// Status-driven CTA shown on the ticket card. Returns { title, body, tone, cta }.
export function nextActionFor(a) {
    if (!a) return null;
    if (a.status === 'CANCELLED') return { title: 'Bron bekor qilingan', body: 'Yangi bron yaratish uchun xizmatlarga qayting.', tone: 'error' };
    if (a.status === 'NO_SHOW')   return { title: 'Tashrif qayd etilmadi', body: 'Bu bronni vaqtida foydalanmagansiz.', tone: 'error' };
    if (a.status === 'COMPLETED') return { title: 'Xizmat yakunlandi', body: 'Tashrifingizdan minnatdormiz!', tone: 'ok' };
    if (a.status === 'IN_PROGRESS') return { title: 'Xizmat jarayonda', body: 'Xizmat xonasida bo\'lganingiz uchun rahmat.', tone: 'ok' };

    if (canCheckIn(a)) return {
        title: 'Klinikaga yetib bordingizmi?',
        body: 'Devordagi Banisa QR kodini skanerlang — sizni klinika qabul qiladi.',
        tone: 'warning',
        cta: 'scan',
    };
    if (awaitingCashier(a)) return {
        title: 'Kassaga yo\'naling',
        body: 'Kassaga borib naqd to\'lovni amalga oshiring. Kassir tasdiqlagach avtomatik xabar olasiz.',
        tone: 'info',
        cta: 'await-cashier',
    };
    if (isReadyForService(a)) return {
        title: 'To\'lov qabul qilindi — xizmat xonasiga o\'ting',
        body: 'Sizni shifokor kutmoqda. Bron raqamingizni administratorga ayting.',
        tone: 'ok',
    };
    // CONFIRMED but online-pay still UNPAID → nudge to pay.
    if (a.status === 'CONFIRMED' && a.paymentMethod !== 'CASH' && a.paymentStatus !== 'PAID') {
        return { title: 'To\'lov kutilmoqda', body: 'Onlayn to\'lovni amalga oshiring.', tone: 'info', cta: 'pay' };
    }
    return { title: 'Klinika tasdiqlashini kuting', body: 'Klinika qisqa vaqt ichida bronni qabul qiladi.', tone: 'info' };
}

// "Bekor qilish qoidasi" — shown beside cancel button.
export function cancelPolicy(a) {
    if (!a) return '';
    if (a.paymentStatus === 'PAID') return 'To\'langan bronni bekor qilsangiz, klinika qoidalariga ko\'ra qisman qaytarish bo\'lishi mumkin. Bekor qilish uchun klinika bilan bog\'laning.';
    if (a.paymentMethod === 'CASH') return 'Naqd to\'lov tanlangan — bron bekor qilinsa hech qanday to\'lov yo\'q. Tashrif vaqtidan kamida 1 soat oldin bekor qiling.';
    return 'Tashrif vaqtidan kamida 1 soat oldin bekor qiling — keyinroq bekor qilish jazo qo\'shilishiga olib kelishi mumkin.';
}
