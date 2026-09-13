/**
 * Patient-facing axios error → friendly Uzbek string.
 *
 * Backend's response shape is { success:false, error:{ code, message }} for
 * AppError throws, but legacy paths sometimes set just `message`. Read both.
 *
 * 401/403 from patient-only endpoints (auth was lost, or the caller is signed
 * in as a clinic admin) used to surface the raw English "Permission denied"
 * — patients read that as a mysterious "permission not defined" toast. Map
 * those statuses to a clear "Bemor sifatida kiring" prompt instead.
 */
export function friendlyApiError(err, fallback = 'Xatolik yuz berdi') {
    const status = err?.response?.status;
    const code = err?.response?.data?.error?.code;
    const raw = err?.response?.data?.error?.message
        || err?.response?.data?.message
        || '';

    if (status === 401) return 'Iltimos, tizimga qayta kiring.';
    if (status === 403 || code === 'FORBIDDEN' || /permission denied/i.test(raw)) {
        return "Bron qilish uchun bemor sifatida tizimga kiring.";
    }
    return raw || fallback;
}

/**
 * Admin / clinic-panel axios error → actionable Uzbek string.
 *
 * Differs from friendlyApiError in two ways that matter for staff screens:
 *
 *  1. It digs into `error.details`. The validate() middleware collapses every
 *     schema failure into a flat "Validation failed" and puts the real reason
 *     in the Zod issue list, so reading only `message` tells the user nothing.
 *  2. It does NOT rewrite 401/403 into a patient login prompt — panel users
 *     are already staff, and the axios interceptor toasts 403 on its own.
 */
export function panelApiError(err, fallback = 'Saqlashda xatolik yuz berdi') {
    // No response at all — request never reached the server.
    if (err?.request && !err?.response) {
        return "Server bilan aloqa yo'q. Internetni tekshirib, qaytadan urinib ko'ring.";
    }

    const data = err?.response?.data;
    const details = data?.error?.details;

    // Zod issues: [{ path: ['body','items'], message: '...' }, …]. Show the
    // first few distinct messages so a form with several problems lists them
    // all instead of surfacing one and hiding the rest.
    if (Array.isArray(details) && details.length > 0) {
        const msgs = [...new Set(details.map((d) => d?.message).filter(Boolean))];
        if (msgs.length > 0) return msgs.slice(0, 3).join('; ');
    }

    return data?.error?.message || data?.message || fallback;
}
