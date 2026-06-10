
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';

// Mini App start_param routing — rewrite the URL BEFORE React mounts.
//
// The bot's inline buttons use t.me/<bot>?startapp=<X> deep links so mobile
// Telegram clients open the Mini App reliably (web_app URLs were reloading
// back to the root on some builds). The Mini App always lands at the
// configured root URL with start_param attached to initDataUnsafe.
//
// Doing this in a React effect is too late: the BrowserRouter's `/` route
// already redirects to /xizmatlar before any provider's effect runs, so
// the patient briefly saw the home screen before our soft-navigate kicked
// in — exactly the "transitioning away" the user complained about. Running
// it here happens before createRoot, so the very first render already sees
// the right pathname.
// Single source of truth for start_param → in-app path. Keep in sync with
// the bot's startApp() / destinationButton() in backend/.../telegram.*.
const START_PARAM_TARGETS = {
    // Public browse
    services:               '/xizmatlar',
    clinics:                '/klinikalar',
    doctors:                '/doktorlar',
    skory:                  '/skory',
    // Patient
    appointments:           '/user/appointments',
    cart:                   '/user/cart',
    checkout:               '/user/cart/checkout',
    notifications:          '/user/notifications',
    profile:                '/user/profile',
    'notification-settings': '/user/notification-settings',
    'scan-checkin':         '/user/scan-checkin',
};

function resolveStartTarget(param) {
    if (!param) return null;
    if (START_PARAM_TARGETS[param]) return START_PARAM_TARGETS[param];
    if (param.startsWith('appt-')) return `/user/appointments/${param.slice(5)}`;
    // Generic /user/X-Y → /user/X/Y fallback (matches destinationButton's
    // unknown-path fallback so we don't dead-end legitimate destinations).
    if (param.startsWith('user-')) return '/' + param.replace(/-/g, '/');
    return null;
}

try {
    const tg = typeof window !== 'undefined' ? window.Telegram?.WebApp : null;
    const param = tg?.initDataUnsafe?.start_param;
    if (param && window.location.pathname === '/') {
        const target = resolveStartTarget(param);
        if (target) window.history.replaceState({}, '', target);
    }
} catch { /* never block boot */ }

createRoot(document.getElementById('root')).render(
    <StrictMode>
        <App />
    </StrictMode>,
);
