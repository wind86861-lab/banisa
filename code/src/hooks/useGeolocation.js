import { useEffect, useState, useCallback } from 'react';

const STORAGE_KEY = 'banisa-user-coords';
const MAX_CACHE_AGE_MS = 10 * 60 * 1000;

function readCache() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (Date.now() - parsed.at > MAX_CACHE_AGE_MS) return null;
        return { lat: parsed.lat, lng: parsed.lng };
    } catch {
        return null;
    }
}

function writeCache(lat, lng) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ lat, lng, at: Date.now() }));
    } catch {}
}

/**
 * Hard rule (per product decision): the map flow needs location. If the user
 * denies geolocation, the feature is unusable — we surface a `denied` state
 * the caller renders as a full block.
 *
 * Returns: { status, coords, error, request, reset }
 *   status:  'idle' | 'prompting' | 'granted' | 'denied' | 'unavailable' | 'error'
 *   coords:  { lat, lng } | null
 */
export default function useGeolocation({ autoRequest = false } = {}) {
    const [status, setStatus] = useState('idle');
    const [coords, setCoords] = useState(() => readCache());
    const [error, setError] = useState(null);

    const request = useCallback(() => {
        if (!('geolocation' in navigator)) {
            setStatus('unavailable');
            setError('Brauzer joylashuvni qo\'llab-quvvatlamaydi');
            return;
        }
        setStatus('prompting');
        setError(null);
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const c = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                setCoords(c);
                writeCache(c.lat, c.lng);
                setStatus('granted');
            },
            (err) => {
                if (err.code === err.PERMISSION_DENIED) {
                    setStatus('denied');
                } else {
                    setStatus('error');
                }
                setError(err.message || 'Joylashuvni olib bo\'lmadi');
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 60_000 }
        );
    }, []);

    const reset = useCallback(() => {
        setStatus('idle');
        setError(null);
    }, []);

    useEffect(() => {
        if (autoRequest && status === 'idle' && !coords) request();
    }, [autoRequest, status, coords, request]);

    // If we already have a cached fix, expose it as granted without re-prompting.
    useEffect(() => {
        if (status === 'idle' && coords) setStatus('granted');
    }, [status, coords]);

    return { status, coords, error, request, reset };
}

export function haversineKm(lat1, lng1, lat2, lng2) {
    if (lat1 == null || lng1 == null || lat2 == null || lng2 == null) return null;
    const R = 6371;
    const toRad = (x) => (x * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
