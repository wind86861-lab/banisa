
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
try {
    const tg = typeof window !== 'undefined' ? window.Telegram?.WebApp : null;
    const param = tg?.initDataUnsafe?.start_param;
    if (param && window.location.pathname === '/') {
        let target = null;
        if (param === 'scan-checkin') target = '/user/scan-checkin';
        else if (param === 'appointments') target = '/user/appointments';
        else if (param === 'checkout') target = '/user/cart/checkout';
        else if (param === 'profile') target = '/user/profile';
        else if (param.startsWith('appt-')) target = `/user/appointments/${param.slice(5)}`;
        if (target) window.history.replaceState({}, '', target);
    }
} catch { /* never block boot */ }

createRoot(document.getElementById('root')).render(
    <StrictMode>
        <App />
    </StrictMode>,
);
