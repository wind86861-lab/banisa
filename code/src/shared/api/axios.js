import axios from 'axios';
import { tokenStorage } from '../auth/tokenStorage';
import { callEnsurePatientAuth } from '../auth/patientAuthBridge';

// VULN-03: access token stored in module memory — not localStorage (XSS-safe)
let _accessToken = null;
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

export const setAccessToken = (token) => { _accessToken = token; };
export const getAccessToken = () => _accessToken;
export const clearAccessToken = () => { _accessToken = null; };
export const setIsPatientSession = (val) => { _isPatientSession = !!val; };

const api = axios.create({
  baseURL: '/api',
  withCredentials: true, // send HttpOnly refresh-token cookie automatically
});

// ─── Request interceptor — attach access token to every request ───────────
api.interceptors.request.use((config) => {
  if (_accessToken) {
    config.headers.Authorization = `Bearer ${_accessToken}`;
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
        const newToken = _accessToken; // resolver wrote it into module mem
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

      setAccessToken(newToken);
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
