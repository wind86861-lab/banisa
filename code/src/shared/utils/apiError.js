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
