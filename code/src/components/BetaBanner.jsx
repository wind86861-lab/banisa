import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { AlertTriangle, X } from 'lucide-react';
import './BetaBanner.css';

const DISMISS_KEY = 'banisa-beta-dismissed-at';
const REAPPEAR_AFTER_MS = 24 * 60 * 60 * 1000;
const HIDDEN_PREFIXES = ['/admin', '/clinic', '/auth', '/checkin'];
const SUPPORT_PHONE = '+998 50 850 50 21';

export default function BetaBanner() {
    const { pathname } = useLocation();
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (HIDDEN_PREFIXES.some(p => pathname.startsWith(p))) {
            setVisible(false);
            return;
        }
        try {
            const raw = localStorage.getItem(DISMISS_KEY);
            const dismissedAt = raw ? parseInt(raw, 10) : 0;
            const expired = !dismissedAt || (Date.now() - dismissedAt) > REAPPEAR_AFTER_MS;
            setVisible(expired);
        } catch {
            setVisible(true);
        }
    }, [pathname]);

    const handleDismiss = () => {
        try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch {}
        setVisible(false);
    };

    if (!visible) return null;

    return (
        <div className="beta-banner" role="alert">
            <div className="beta-banner__inner">
                <AlertTriangle size={16} className="beta-banner__icon" />
                <span className="beta-banner__text">
                    Sayt <b>sinov rejimida</b> ishlamoqda — ba'zi kamchiliklar bo'lishi mumkin.
                    Muammo bo'lsa: <a href={`tel:${SUPPORT_PHONE.replace(/\s+/g, '')}`}>{SUPPORT_PHONE}</a>
                </span>
                <button
                    type="button"
                    className="beta-banner__close"
                    onClick={handleDismiss}
                    aria-label="Yopish"
                >
                    <X size={14} />
                </button>
            </div>
        </div>
    );
}
