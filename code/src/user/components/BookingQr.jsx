import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import api from '../../shared/api/axios';

/**
 * Renders the booking QR the cashier scans to confirm cash.
 * The PNG endpoint is auth-protected, so it's fetched as a blob
 * (a plain <img src> can't carry the bearer token).
 */
export default function BookingQr({ appointmentId, size = 220 }) {
    const [src, setSrc] = useState(null);
    const [state, setState] = useState('loading'); // loading | ready | error

    useEffect(() => {
        if (!appointmentId) return;
        let url;
        let alive = true;
        (async () => {
            try {
                const res = await api.get(`/user/appointments/${appointmentId}/qr.png`, {
                    responseType: 'blob',
                });
                if (!alive) return;
                url = URL.createObjectURL(res.data);
                setSrc(url);
                setState('ready');
            } catch {
                if (alive) setState('error');
            }
        })();
        return () => {
            alive = false;
            if (url) URL.revokeObjectURL(url);
        };
    }, [appointmentId]);

    if (state === 'error') {
        return (
            <div className="bq-fallback" style={{ width: size }}>
                QR kodni yuklab bo‘lmadi. Bron raqamingizni kassirga ayting.
            </div>
        );
    }

    return (
        <div className="bq-wrap" style={{ width: size, height: size }}>
            {state === 'loading'
                ? <Loader2 size={28} className="apd-spin" />
                : <img src={src} alt="Bron QR kodi" width={size} height={size} style={{ borderRadius: 12 }} />}
        </div>
    );
}
