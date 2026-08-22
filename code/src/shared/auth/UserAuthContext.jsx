import { createContext, useContext, useState, useEffect, useRef } from 'react';
import {
    setPatientAccessToken as setAccessToken,
    getPatientAccessToken as getAccessToken,
    clearPatientAccessToken as clearAccessToken,
    setIsPatientSession,
} from '../api/axios';
import axiosInstance from '../api/axios';
import { setPatientAuthResolver, clearPatientAuthResolver } from './patientAuthBridge';

// ─── Patient session storage policy (XSS-hardened) ──────────────────────────
// Access token lives in MODULE MEMORY only (see api/axios.js). The HttpOnly
// `refresh_token` cookie is the only persistent credential — an XSS payload
// cannot read it. localStorage is reserved for non-secret hints:
//
//   user_had_session   "1" if this browser has ever held a patient session.
//                       On reload we use this to decide whether to attempt
//                       a cookie-based refresh, avoiding spurious 401s for
//                       visitors who never logged in.
//   user_data          The cached user profile (name/phone/role). Not secret;
//                       lets us paint the navbar before the refresh completes.
//                       Treated as a hint only — every render still trusts
//                       the in-memory `user` state.
const USER_DATA_KEY = 'user_data';
const HAD_SESSION_KEY = 'user_had_session';

export const userTokenStorage = {
  setUser: (user) => localStorage.setItem(USER_DATA_KEY, JSON.stringify(user)),
  getUser: () => {
    try {
      const raw = localStorage.getItem(USER_DATA_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  },
  clear: () => {
    localStorage.removeItem(USER_DATA_KEY);
    localStorage.removeItem(HAD_SESSION_KEY);
  },
  isLoggedIn: () => !!getAccessToken(),
};

// ─── JWT helpers ────────────────────────────────────────────────────────────
const tokenMsLeft = (token) => {
  if (!token) return -1;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000 - Date.now();
  } catch { return -1; }
};

// Treat anything within REFRESH_BUFFER_MS of expiry as "needs refresh now".
// Stops the cached-user check in ensurePatientAuth() from returning a token
// that's about to die during the very next backend call.
const REFRESH_BUFFER_MS = 60_000;

// ─── Module-level promise dedup ─────────────────────────────────────────────
// `authResolverPromise` is the SINGLE in-flight auth attempt. Anyone who
// wants to know "is this visitor authenticated right now?" awaits this same
// promise — no parallel POSTs, no race conditions, no persistent guard
// flags (the previous `sessionStorage["banisa_miniapp_tried"]` would jam at
// '1' after a single failure and never retry).
//
// Cleared when the promise settles (either way) so a subsequent failure
// can be retried by a later caller (e.g. user clicks "Book" after a
// transient network blip during mount).
let authResolverPromise = null;

// ─── CONTEXT ────────────────────────────────────────────────────────────────
const UserAuthContext = createContext(null);

export const UserAuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [expiringSoon, setExpiringSoon] = useState(false);

  // Refs for latest state — needed because the module-level ensurePatientAuth
  // is closed over old values when first defined.
  const userRef = useRef(user);
  useEffect(() => { userRef.current = user; }, [user]);

  // ── Apply auth result to state + storage (success path) ────────────────
  // Single place that touches all the moving parts so successful Mini App,
  // cookie refresh, and login paths can't drift out of sync.
  const applyAuthSuccess = (token, userData) => {
    setAccessToken(token);
    setIsPatientSession(true);
    userTokenStorage.setUser(userData);
    localStorage.setItem(HAD_SESSION_KEY, '1');
    setUser(userData);
    setExpiringSoon(false);
  };

  // ── Clear ALL session state (failure path) ─────────────────────────────
  const clearSession = () => {
    clearAccessToken();
    setIsPatientSession(false);
    userTokenStorage.clear();
    setUser(null);
    setExpiringSoon(false);
  };

  // ── One try at Mini App login. Returns { user } | { notBound } | null ──
  const tryMiniAppLogin = async () => {
    const tg = typeof window !== 'undefined' ? window.Telegram?.WebApp : null;
    const initData = tg?.initData;
    if (!initData) return null;
    try { tg.ready?.(); } catch { /* ignore */ }
    try { tg.expand?.(); } catch { /* ignore */ }
    try {
      const { data } = await axiosInstance.post(
        '/user/auth/telegram/miniapp-login',
        { initData },
      );
      const token = data?.data?.accessToken ?? data?.accessToken;
      const u = data?.data?.user ?? data?.user;
      if (token && (u?.role === 'PATIENT' || u?.role === 'DOCTOR')) {
        applyAuthSuccess(token, u);
        return { user: u };
      }
      return null;
    } catch (e) {
      if (e?.response?.status === 404) return { notBound: true };
      return null;
    }
  };

  // ── One try at cookie refresh. Returns user or null ────────────────────
  const tryCookieRefresh = async () => {
    try {
      const { data } = await axiosInstance.post('/user/auth/refresh');
      const token = data?.data?.accessToken ?? data?.accessToken;
      const u = data?.data?.user ?? data?.user;
      if (token && (u?.role === 'PATIENT' || u?.role === 'DOCTOR')) {
        applyAuthSuccess(token, u);
        return u;
      }
      return null;
    } catch {
      return null;
    }
  };

  // ── ensurePatientAuth: the SINGLE source of truth ──────────────────────
  // Tier order:
  //   1. Mini App initData (24h-valid Telegram-signed credential).
  //      Tried first because the refresh cookie is unreliable inside
  //      Telegram's iframe context.
  //   2. HttpOnly refresh cookie via /user/auth/refresh.
  //   3. null — visitor is not authenticated.
  //
  // Dedup: simultaneous callers await the same in-flight promise.
  // Side effect: on success, fills user state via applyAuthSuccess so
  // re-renders pick it up immediately. On not_bound inside a Mini App,
  // soft-redirects to /mini-app-bind.
  const ensurePatientAuth = async () => {
    // Cached path — only if access token has real life left in it.
    if (userRef.current) {
      const ms = tokenMsLeft(getAccessToken());
      if (ms > REFRESH_BUFFER_MS) return userRef.current;
    }

    if (authResolverPromise) return authResolverPromise;

    authResolverPromise = (async () => {
      // 1. Mini App initData first
      const miniResult = await tryMiniAppLogin();
      if (miniResult?.user) return miniResult.user;

      if (miniResult?.notBound) {
        // Not bound yet — kick the user to bind UX. Soft history replace
        // avoids a hard reload that triggers Telegram's "restart Mini App"
        // logic.
        if (typeof window !== 'undefined' && window.location.pathname !== '/mini-app-bind') {
          try {
            window.history.replaceState({}, '', '/mini-app-bind');
            window.dispatchEvent(new PopStateEvent('popstate'));
          } catch {
            window.location.replace('/mini-app-bind');
          }
        }
        return null;
      }

      // 2. Cookie refresh — only attempted when the browser previously
      //    held a session. Avoids 401-noise for first-time visitors.
      const hadSession = localStorage.getItem(HAD_SESSION_KEY);
      if (hadSession) {
        const u = await tryCookieRefresh();
        if (u) return u;
      }

      return null;
    })();

    try {
      return await authResolverPromise;
    } finally {
      // Clear so a future caller (click handler after a transient blip,
      // watchdog 30s later, etc.) gets a fresh attempt.
      authResolverPromise = null;
    }
  };

  const ensurePatientAuthRef = useRef(ensurePatientAuth);
  useEffect(() => { ensurePatientAuthRef.current = ensurePatientAuth; });

  // Watchdog-side hook: skip the cache and actually hit the refresh
  // endpoint. ensurePatientAuth() returns the cached user when the token
  // has > 60 s left, which makes proactive renewal a no-op and ends up
  // surprising the operator with a logout at the very moment the token
  // crosses the buffer. tryCookieRefresh writes the new token through
  // applyAuthSuccess on success.
  const forceRefreshRef = useRef(async () => null);
  useEffect(() => {
    forceRefreshRef.current = async () => {
      // Inside a Mini App, fall back to initData first — patient may not
      // have a refresh cookie at all.
      const tg = typeof window !== 'undefined' ? window.Telegram?.WebApp : null;
      if (tg?.initData) {
        const r = await tryMiniAppLogin();
        if (r?.user) return r.user;
      }
      return tryCookieRefresh();
    };
  });

  // Register with the module bridge so the axios interceptor can call the
  // same resolver. The dedup is automatic — both end up awaiting the same
  // `authResolverPromise`.
  useEffect(() => {
    setPatientAuthResolver(() => ensurePatientAuthRef.current());
    return () => clearPatientAuthResolver();
  }, []);

  // ── Session restore on mount ───────────────────────────────────────────
  useEffect(() => {
    // One-time cleanup of the legacy localStorage access token.
    try { localStorage.removeItem('user_access_token'); } catch { /* ignore */ }

    (async () => {
      try {
        if (typeof window !== 'undefined' && window.location.pathname.startsWith('/admin')) {
          setIsLoading(false);
          return;
        }

        // Optimistic paint from cached profile so the navbar doesn't flash
        // empty during the auth roundtrip. State is overwritten below with
        // the server-verified user.
        const cached = userTokenStorage.getUser();
        if (cached?.role === 'PATIENT' || cached?.role === 'DOCTOR') setUser(cached);

        await ensurePatientAuth();
        // start_param routing is handled in main.jsx before React mounts.
      } catch (e) {
        console.error('[auth] restore failed:', e);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Silent expiry watchdog ─────────────────────────────────────────────
  // Proactively rotates the access token long before it expires so the
  // operator never sees a 401 → logout. Triggers when the token is past
  // its halfway point AND at least 30 s have passed since the last
  // successful rotation — that combination handles both the typical case
  // (1 h token, rotate every ~30 m) and the corner where the watchdog
  // first runs immediately after login.
  useEffect(() => {
    if (!user) return;
    let failedOnce = false;
    let lastRotateAt = Date.now();

    const tick = async () => {
      const token = getAccessToken();
      if (!token) return;
      const ms = tokenMsLeft(token);

      // Hard-expired — only chance left is the refresh cookie itself.
      if (ms <= 0) {
        const u = await forceRefreshRef.current();
        if (u) { lastRotateAt = Date.now(); failedOnce = false; setExpiringSoon(false); }
        else clearSession();
        return;
      }

      // Past halfway → renew. payload.iat is in seconds; we approximate by
      // halving the prod TTL (1 h) when we can't read iat for some reason.
      let halfMs;
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const lifeMs = (payload.exp - payload.iat) * 1000;
        halfMs = lifeMs / 2;
      } catch { halfMs = 30 * 60 * 1000; }

      const elapsed = (Date.now() - lastRotateAt);
      if (ms < halfMs && elapsed > 30_000 && !failedOnce) {
        const u = await forceRefreshRef.current();
        if (u) { lastRotateAt = Date.now(); failedOnce = false; setExpiringSoon(false); }
        else {
          failedOnce = true;
          setExpiringSoon(ms < 60_000);
        }
        return;
      }
      setExpiringSoon(failedOnce && ms < 60_000);
    };

    tick();
    const interval = setInterval(tick, 30_000);
    return () => clearInterval(interval);
  }, [user]);

  const extendSession = async () => {
    await ensurePatientAuth();
  };

  // ── Login (phone + password) ──────────────────────────────────────────
  const login = async (phone, password) => {
    const { data } = await axiosInstance.post('/user/auth/login', { phone, password });
    const token = data.data?.accessToken ?? data.accessToken;
    const userData = data.data?.user ?? data.user;
    if (!token || !userData) throw new Error('Login muvaffaqiyatsiz');
    if (userData.role !== 'PATIENT') throw new Error('Bu login faqat foydalanuvchilar uchun');
    applyAuthSuccess(token, userData);
    return userData;
  };

  // ── Mini App finalize (called from /mini-app-bind after contact share) ─
  const loginViaTelegramMiniApp = async (initData) => {
    const { data } = await axiosInstance.post('/user/auth/telegram/miniapp-login', { initData });
    const token = data.data?.accessToken ?? data.accessToken;
    const userData = data.data?.user ?? data.user;
    if (!token || !userData) throw new Error('miniapp_login_failed');
    if (userData.role !== 'PATIENT') throw new Error('not_patient');
    applyAuthSuccess(token, userData);
    return userData;
  };

  const loginViaTelegramWidget = async (widgetPayload) => {
    const { data } = await axiosInstance.post('/user/auth/telegram/widget-login', widgetPayload);
    const token = data.data?.accessToken ?? data.accessToken;
    const userData = data.data?.user ?? data.user;
    if (!token || !userData) throw new Error('Telegram login muvaffaqiyatsiz');
    if (userData.role !== 'PATIENT') throw new Error('Bu login faqat foydalanuvchilar uchun');
    applyAuthSuccess(token, userData);
    return userData;
  };

  const register = async (userData) => {
    const { data } = await axiosInstance.post('/user/auth/register', userData);
    if (!data.success) throw new Error(data.error?.message || data.message || 'Ro\'yxatdan o\'tishda xatolik');
    return data.data;
  };

  const logout = async () => {
    try { await axiosInstance.post('/user/auth/logout'); } catch { /* ignore */ }
    clearSession();
  };

  const updateUserState = (partialUser) => {
    const updated = { ...user, ...partialUser };
    userTokenStorage.setUser(updated);
    setUser(updated);
  };

  // Backward-compat alias — existing click handlers still call waitForUser.
  // The new implementation just delegates to the single resolver.
  const waitForUser = ensurePatientAuth;

  return (
    <UserAuthContext.Provider value={{
      user,
      isLoading,
      loading: isLoading,
      isLoggedIn: !!user,
      login,
      loginViaTelegramWidget,
      loginViaTelegramMiniApp,
      register,
      logout,
      updateUserState,
      expiringSoon,
      extendSession,
      ensurePatientAuth,
      waitForUser,
    }}>
      {children}
      {expiringSoon && user && (
        <div role="status" style={{
          position: 'fixed', bottom: 20, right: 20, zIndex: 10000,
          background: '#fff7ed', border: '1px solid #fb923c',
          color: '#9a3412', padding: '12px 16px', borderRadius: 12,
          boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
          maxWidth: 320, fontSize: 13, lineHeight: 1.5,
          display: 'flex', flexDirection: 'column', gap: 8,
        }}>
          <strong>Sessiya tugashi yaqin</strong>
          <span>Sizning kirishingiz bir daqiqadan keyin tugaydi. Sahifani saqlash uchun davom etishni bosing.</span>
          <button onClick={extendSession} style={{
            alignSelf: 'flex-end', background: '#ea580c', color: '#fff',
            border: 'none', borderRadius: 8, padding: '6px 14px',
            fontWeight: 600, cursor: 'pointer',
          }}>Davom etish</button>
        </div>
      )}
    </UserAuthContext.Provider>
  );
};

export const useUserAuth = () => {
  const context = useContext(UserAuthContext);
  if (!context) throw new Error('useUserAuth must be used within UserAuthProvider');
  return context;
};
