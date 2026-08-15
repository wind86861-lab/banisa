import axios from 'axios';
import { tokenStorage } from '../auth/tokenStorage';
import { callEnsurePatientAuth } from '../auth/patientAuthBridge';
import { toastBus } from '../components/Toast';

// De-dupe guard so a burst of identical 403s (e.g. a page firing several
// gated requests at once) raises a single toast, not a stack of them.
let _last403 = { msg: null, at: 0 };

// VULN-03: access tokens stored in module memory — not localStorage (XSS-safe).
//
// Two SEPARATE slots so a clinic admin browsing the Mini App as a patient
// (or vice-versa) doesn't accidentally send the wrong JWT and 403 their
// own management endpoints. The request interceptor picks per URL.
let _clinicAccessToken = null;
let _patientAccessToken = null;
// Bootstrap _isPatientSession synchronously from the durable
// user_had_session flag so a 401 fired before UserAuthContext mounts
// (e.g., a page query that ran inside another lazy chunk during the
// reload) still routes through the patient refresh path. Without this
// the interceptor's `_isPatientSession || inMiniApp` gate fell through
// to the clinic refresh, which 401'd, and the user was redirected to
// /user/login before UserAuthContext even had a chance to finish its
// cookie refresh.
let _isPatientSession = (() => {
  try {
    return typeof window !== 'undefined'
      && localStorage.getItem('user_had_session') === '1';
  } catch { return false; }
})();

// URL → slot picker. Keep this list aligned with backend route mounts.
function pickTokenForUrl(url) {
  if (!url) return _clinicAccessToken || _patientAccessToken;
  // Patient-side endpoints — keep the patient JWT even when the clinic
  // context is also signed in.
  if (
    url.startsWith('/cart')
    || url.startsWith('/user/')
    || url.startsWith('/oferta')
    || url.startsWith('/notifications/')      // patient notifications
  ) {
    return _patientAccessToken;
  }
  // Clinic / super-admin endpoints.
  if (url.startsWith('/clinic/') || url.startsWith('/admin/')) {
    return _clinicAccessToken;
  }
  // Anything else (e.g. /auth/me, /payme/*, /public/*) — caller-controlled.
  // Prefer the one matching the session flavour, else any.
  return _isPatientSession
    ? (_patientAccessToken || _clinicAccessToken)
    : (_clinicAccessToken || _patientAccessToken);
}

// ─── Clinic / admin slot ─────────────────────────────────────────────────
export const setClinicAccessToken = (token) => { _clinicAccessToken = token; };
export const clearClinicAccessToken = () => { _clinicAccessToken = null; };
export const getClinicAccessToken = () => _clinicAccessToken;

// ─── Patient slot ────────────────────────────────────────────────────────
export const setPatientAccessToken = (token) => { _patientAccessToken = token; };
export const clearPatientAccessToken = () => { _patientAccessToken = null; };
export const getPatientAccessToken = () => _patientAccessToken;

// ─── Back-compat aliases ─────────────────────────────────────────────────
// Old callers used setAccessToken / clearAccessToken without specifying
// which session. We route by _isPatientSession so existing AuthContext +
// UserAuthContext code keeps working without touching every callsite.
export const setAccessToken = (token) => {
  if (_isPatientSession) _patientAccessToken = token;
  else _clinicAccessToken = token;
};
export const clearAccessToken = () => {
  if (_isPatientSession) _patientAccessToken = null;
  else _clinicAccessToken = null;
};
export const getAccessToken = () =>
  _isPatientSession ? _patientAccessToken : _clinicAccessToken;
export const setIsPatientSession = (val) => { _isPatientSession = !!val; };

const api = axios.create({
  baseURL: '/api',
  withCredentials: true, // send HttpOnly refresh-token cookie automatically
  // Telegram Mini App webviews have flaky networking — without a timeout a
  // single stalled request hangs the whole app on the loading screen forever.
  // Fail after 25s so callers can recover / show an error instead.
  timeout: 25000,
});

// ─── Request interceptor — attach the right access token per URL ─────────
api.interceptors.request.use((config) => {
  const token = pickTokenForUrl(config.url || '');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─── Response interceptor — auto-refresh on 401 and retry once ────────────
//
// Two distinct flows:
//
//   PATIENT — delegates to the single resolver in UserAuthContext
//   (via patientAuthBridge). That function decides between Mini App
//   initData and the HttpOnly refresh cookie, and uses a module-level
//   promise so simultaneous 401s collapse into ONE auth attempt.
//
//   CLINIC/ADMIN — keeps the inline cookie-refresh path. Super admins are
//   redirected straight to /admin/login because they don't carry a
//   refresh cookie at all.
let _isRefreshing = false;
let _refreshQueue = [];

const processQueue = (error, token = null) => {
  _refreshQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token);
  });
  _refreshQueue = [];
};

const readStoredUser = () => tokenStorage.getUser() || (() => {
  try { return JSON.parse(localStorage.getItem('user_data')); } catch { return null; }
})();

const redirectToLogin = (storedUser) => {
  if (typeof window === 'undefined') return;
  let loginUrl = '/';
  if (storedUser?.role === 'CLINIC_ADMIN' || storedUser?.role === 'PENDING_CLINIC') {
    loginUrl = '/login';
  } else if (storedUser?.role === 'PATIENT') {
    loginUrl = '/user/login';
  }
  tokenStorage.clear();
  localStorage.removeItem('user_data');
  localStorage.removeItem('user_had_session');
  window.location.href = loginUrl;
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    // Never intercept the refresh endpoints themselves — would loop.
    const url = original?.url || '';
    const isAuthEndpoint = url.includes('/auth/refresh')
      || url.includes('/auth/telegram/miniapp-login')
      || url.includes('/auth/login');

    // Permission denied (e.g. a read-only DIRECTOR hitting a write route, or a
    // hidden button reached via direct URL). The backend enforces it; surface
    // a clear toast so the action doesn't fail silently. Skipped on /auth/*
    // (login pages render their own messages). De-duped to avoid toast stacks.
    if (error.response?.status === 403 && !url.includes('/auth/')) {
      const msg = error.response?.data?.message
        || error.response?.data?.error?.message
        || "Bu amal uchun ruxsatingiz yo'q";
      const now = Date.now();
      if (msg !== _last403.msg || now - _last403.at > 2500) {
        _last403 = { msg, at: now };
        toastBus.error(msg);
      }
    }

    if (error.response?.status !== 401 || original._retry || isAuthEndpoint) {
      return Promise.reject(error);
    }

    if (_isRefreshing) {
      // Queue while a refresh is already in flight.
      return new Promise((resolve, reject) => {
        _refreshQueue.push({ resolve, reject });
      }).then((token) => {
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      });
    }

    const storedUser = readStoredUser();
    // Mini App context overrides the path selection. Without this, an early
    // 401 from a component that fetches before applyAuthSuccess runs would
    // be routed to the CLINIC/ADMIN refresh path (because _isPatientSession
    // hasn't flipped to true yet), that fails, redirectToLogin then does
    // window.location.href = '/' — a HARD RELOAD that the patient saw as
    // "page loads, reloads from 0, then goes to main page".
    const inMiniApp = typeof window !== 'undefined' && !!window.Telegram?.WebApp?.initData;

    // SUPER_ADMIN has no refresh cookie — straight to login.
    if (storedUser?.role === 'SUPER_ADMIN' && !inMiniApp) {
      clearAccessToken();
      tokenStorage.clear();
      if (typeof window !== 'undefined') window.location.href = '/admin/login';
      return Promise.reject(error);
    }

    original._retry = true;
    _isRefreshing = true;

    try {
      // ── PATIENT path ────────────────────────────────────────────────
      // Use whenever _isPatientSession says so OR we're physically inside
      // a Mini App (initData present) — the latter covers the cold-start
      // race where the patient session flag hasn't flipped yet.
      if (_isPatientSession || inMiniApp) {
        const recoveredUser = await callEnsurePatientAuth();
        // Resolver writes into _patientAccessToken via setAccessToken (the
        // back-compat alias routes by _isPatientSession=true).
        const newToken = _patientAccessToken;
        if (recoveredUser && newToken) {
          processQueue(null, newToken);
          original.headers.Authorization = `Bearer ${newToken}`;
          return api(original);
        }
        // Resolver returned null — session is genuinely dead. In a Mini App
        // we DON'T hard-redirect (would refresh the WebView away from the
        // intended page); we just reject and let UI guards handle it.
        processQueue(error, null);
        clearAccessToken();
        if (!inMiniApp) redirectToLogin(storedUser);
        return Promise.reject(error);
      }

      // ── CLINIC/ADMIN path (cookie refresh) ──────────────────────────
      const { data } = await axios.post(
        '/api/auth/refresh',
        {},
        { withCredentials: true },
      );
      const newToken = data.data?.accessToken ?? data.accessToken;
      const refreshedUser = data.data?.user ?? data.user;

      if (refreshedUser && storedUser
        && refreshedUser.role !== storedUser.role) {
        // Cross-role token pollution — discard.
        clearAccessToken();
        tokenStorage.clear();
        processQueue(new Error('Role mismatch after refresh'), null);
        if (typeof window !== 'undefined') window.location.href = '/';
        return Promise.reject(new Error('Role mismatch after refresh'));
      }

      // Clinic / admin refresh — write explicitly into the clinic slot so a
      // concurrent patient session can't poach the token.
      setClinicAccessToken(newToken);
      tokenStorage.setToken(newToken);
      if (refreshedUser) tokenStorage.setUser(refreshedUser);
      processQueue(null, newToken);
      original.headers.Authorization = `Bearer ${newToken}`;
      return api(original);
    } catch (refreshError) {
      processQueue(refreshError, null);
      clearAccessToken();
      // Only redirect on a real 401 — rate-limit (429) shouldn't kick out
      // active users. Inside a Mini App we never hard-redirect; that's a
      // full WebView reload that boots the patient off the deep-linked
      // page back to the configured Mini App root.
      const refreshStatus = refreshError?.response?.status;
      if (refreshStatus === 401 && !inMiniApp) redirectToLogin(storedUser);
      return Promise.reject(refreshError);
    } finally {
      _isRefreshing = false;
    }
  },
);

export default api;
