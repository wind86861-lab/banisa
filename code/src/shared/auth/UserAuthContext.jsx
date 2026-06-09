import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { setAccessToken, getAccessToken, clearAccessToken, setIsPatientSession } from '../api/axios';
import axiosInstance from '../api/axios';

// ─── Patient session storage policy (XSS-hardened) ──────────────────────────
// Access token lives in MODULE MEMORY only (see api/axios.js). The HttpOnly
// `refresh_token` cookie is the only persistent credential — an XSS payload
// cannot read it. localStorage is reserved for non-secret hints:
//
//   user_had_session   "1" if this browser has ever held a patient session.
//                       On reload we use this to decide whether to attempt
//                       a silent refresh, avoiding spurious 401s for visitors
//                       who never logged in.
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
  // For axios.js refresh logic that needs to know which login flow to redirect to.
  isLoggedIn: () => !!getAccessToken(),
};

// ─── HELPERS ────────────────────────────────────────────────────────────────
const isTokenExpired = (token) => {
  if (!token) return true;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000 < Date.now();
  } catch { return true; }
};

const tokenMsLeft = (token) => {
  if (!token) return -1;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000 - Date.now();
  } catch { return -1; }
};

// Singleton so React StrictMode's double-mount doesn't double-refresh.
let userRestorePromise = null;

// ─── CONTEXT ────────────────────────────────────────────────────────────────
const UserAuthContext = createContext(null);

export const UserAuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [expiringSoon, setExpiringSoon] = useState(false);

  // Refs that always hold the latest values — needed for waitForUser's
  // polling loop, which can't see state updates through its closure.
  const userRef = useRef(user);
  const loadingRef = useRef(isLoading);
  useEffect(() => { userRef.current = user; }, [user]);
  useEffect(() => { loadingRef.current = isLoading; }, [isLoading]);

  // ── Silent auto-refresh + expiry watchdog ─────────────────────────────────
  // Strategy: while logged in, refresh the access token in the background as
  // soon as it has <2 min remaining. The HttpOnly refresh-token cookie is
  // valid for 7 days, so this is invisible to the user. Only if a refresh
  // attempt actually FAILS do we fall back to the warning toast and, after
  // that, log the user out.
  //
  // Mini App fallback: inside Telegram, the refresh cookie can be blocked
  // by the embedded WebView's third-party cookie rules. When that happens
  // we re-authenticate with the user's still-valid initData (good for 24h
  // from auth_date) so the session survives any cookie hiccup.
  useEffect(() => {
    if (!user) return;
    let refreshing = false;
    let failedOnce = false;

    const tryMiniAppFallback = async () => {
      const tg = typeof window !== 'undefined' ? window.Telegram?.WebApp : null;
      const initData = tg?.initData;
      if (!initData) return false;
      try {
        const { data } = await axiosInstance.post(
          '/user/auth/telegram/miniapp-login',
          { initData },
        );
        const newToken = data?.data?.accessToken ?? data?.accessToken;
        const userData = data?.data?.user ?? data?.user;
        if (newToken && userData?.role === 'PATIENT') {
          setAccessToken(newToken);
          setIsPatientSession(true);
          userTokenStorage.setUser(userData);
          localStorage.setItem(HAD_SESSION_KEY, '1');
          setUser(userData);
          setExpiringSoon(false);
          failedOnce = false;
          return true;
        }
        return false;
      } catch {
        return false;
      }
    };

    const trySilentRefresh = async () => {
      if (refreshing) return false;
      refreshing = true;
      try {
        const { data } = await axiosInstance.post('/user/auth/refresh');
        const newToken = data?.data?.accessToken ?? data?.accessToken;
        if (newToken) {
          setAccessToken(newToken);
          setExpiringSoon(false);
          failedOnce = false;
          return true;
        }
        return false;
      } catch {
        // Cookie refresh failed — if we're in Telegram Mini App, try
        // re-authenticating with the still-valid initData before giving up.
        return await tryMiniAppFallback();
      } finally {
        refreshing = false;
      }
    };

    const tick = async () => {
      const token = getAccessToken();
      if (!token) return;
      const msLeft = tokenMsLeft(token);

      // Already expired: try one last silent refresh before logging out.
      if (msLeft <= 0) {
        const ok = await trySilentRefresh();
        if (ok) return;
        clearAccessToken();
        setIsPatientSession(false);
        userTokenStorage.clear();
        setUser(null);
        setExpiringSoon(false);
        return;
      }

      // <2 min left → refresh silently in the background.
      if (msLeft < 120_000 && !failedOnce) {
        const ok = await trySilentRefresh();
        if (!ok) {
          failedOnce = true; // surface the toast as a last-resort manual option
          setExpiringSoon(msLeft < 60_000);
        }
        return;
      }

      // Don't show the toast unless an automatic attempt has already failed.
      setExpiringSoon(failedOnce && msLeft < 60_000);
    };

    tick();
    const interval = setInterval(tick, 15_000);
    return () => clearInterval(interval);
  }, [user]);

  const extendSession = async () => {
    try {
      const { data } = await axiosInstance.post('/user/auth/refresh');
      const newToken = data?.data?.accessToken;
      if (newToken) setAccessToken(newToken);
      setExpiringSoon(false);
    } catch { /* ignore — normal expiry path will log them out */ }
  };

  // ── Session restore on page load ────────────────────────────────────────
  useEffect(() => {
    // One-time cleanup of the legacy localStorage access token (now memory-only).
    // Existing sessions saved it before the XSS hardening pass — wipe on next load.
    try { localStorage.removeItem('user_access_token'); } catch { /* ignore */ }

    const restoreSession = async () => {
      try {
        if (typeof window !== 'undefined' && window.location.pathname.startsWith('/admin')) {
          setIsLoading(false);
          return;
        }

        // ── Telegram Mini App auto-login ─────────────────────────────────────
        // When loaded inside Telegram WebView, window.Telegram.WebApp is
        // present. initData is signed by Telegram with the bot token — the
        // backend verifies it and returns a patient session.
        //
        // Guard: we try the auto-login AT MOST ONCE per Mini App session.
        // Without this, any post-login navigation (e.g. a hard redirect or
        // a soft route change that remounts the provider) would re-run the
        // detection and could create a refresh loop when the backend keeps
        // returning the same not_bound state.
        const tg = typeof window !== 'undefined' ? window.Telegram?.WebApp : null;
        const initData = tg?.initData;
        const MINIAPP_TRIED_KEY = 'banisa_miniapp_tried';
        const alreadyTried = (() => {
          try { return sessionStorage.getItem(MINIAPP_TRIED_KEY) === '1'; }
          catch { return false; }
        })();
        if (tg && initData && !alreadyTried) {
          try { sessionStorage.setItem(MINIAPP_TRIED_KEY, '1'); } catch { /* ignore */ }
          try {
            try { tg.ready(); } catch { /* ignore */ }
            try { tg.expand?.(); } catch { /* ignore */ }
            const { data } = await axiosInstance.post('/user/auth/telegram/miniapp-login', { initData });
            const token = data?.data?.accessToken ?? data?.accessToken;
            const userData = data?.data?.user ?? data?.user;
            if (token && userData && userData.role === 'PATIENT') {
              setAccessToken(token);
              setIsPatientSession(true);
              userTokenStorage.setUser(userData);
              localStorage.setItem(HAD_SESSION_KEY, '1');
              setUser(userData);
              setIsLoading(false);
              return;
            }
          } catch (e) {
            // 404 not_bound → render the bind-first screen IN PLACE rather
            // than triggering a hard window.location.replace. The hard
            // redirect was causing repeated reloads in some Telegram clients
            // that retry the Mini App on navigation events.
            if (e?.response?.status === 404) {
              if (window.location.pathname !== '/mini-app-bind') {
                // Soft-replace via history API — no reload, no second login attempt.
                try {
                  window.history.replaceState({}, '', '/mini-app-bind');
                  window.dispatchEvent(new PopStateEvent('popstate'));
                } catch {
                  window.location.replace('/mini-app-bind');
                }
              }
              setIsLoading(false);
              return;
            }
            console.warn('[miniapp] login failed:', e?.response?.data || e?.message);
          }
        }

        // Only attempt silent refresh if this browser previously had a patient
        // session — avoids 401-spam for first-time visitors.
        const hadSession = localStorage.getItem(HAD_SESSION_KEY);
        if (!hadSession) {
          setIsLoading(false);
          return;
        }

        // Optimistic paint from cached profile (non-secret).
        const cachedUser = userTokenStorage.getUser();
        if (cachedUser && cachedUser.role === 'PATIENT') {
          setUser(cachedUser);
        }

        if (!userRestorePromise) {
          userRestorePromise = axiosInstance
            .post('/user/auth/refresh')
            .then(res => res.data)
            .catch(() => null)
            .finally(() => { setTimeout(() => { userRestorePromise = null; }, 5000); });
        }

        const data = await userRestorePromise;

        if (data) {
          const token = data.data?.accessToken ?? data.accessToken;
          const userData = data.data?.user ?? data.user;

          if (token && userData && userData.role === 'PATIENT' && !isTokenExpired(token)) {
            setAccessToken(token);
            setIsPatientSession(true);
            userTokenStorage.setUser(userData);
            setUser(userData);
            setIsLoading(false);
            return;
          }
        }

        // Cookie refresh failed. Inside Telegram Mini App, the cookie may be
        // blocked by the WebView context — fall back to re-authenticating
        // with the still-valid initData (good for 24h from auth_date).
        const tgFallback = typeof window !== 'undefined' ? window.Telegram?.WebApp : null;
        const fallbackInitData = tgFallback?.initData;
        if (fallbackInitData) {
          try {
            const { data: miniData } = await axiosInstance.post(
              '/user/auth/telegram/miniapp-login',
              { initData: fallbackInitData },
            );
            const miniToken = miniData?.data?.accessToken ?? miniData?.accessToken;
            const miniUser = miniData?.data?.user ?? miniData?.user;
            if (miniToken && miniUser?.role === 'PATIENT') {
              setAccessToken(miniToken);
              setIsPatientSession(true);
              userTokenStorage.setUser(miniUser);
              localStorage.setItem(HAD_SESSION_KEY, '1');
              setUser(miniUser);
              setIsLoading(false);
              return;
            }
          } catch (e) {
            console.warn('[miniapp] fallback after refresh failed:', e?.response?.status || e?.message);
          }
        }

        // No valid session and no fallback succeeded — clear everything.
        userTokenStorage.clear();
        setIsPatientSession(false);
        setUser(null);
        setIsLoading(false);
      } catch (err) {
        console.error('User auth restore error:', err);
        userTokenStorage.clear();
        setIsPatientSession(false);
        setUser(null);
        setIsLoading(false);
      }
    };

    restoreSession();
  }, []);

  // ── Login ───────────────────────────────────────────────────────────────
  const login = async (phone, password) => {
    const { data } = await axiosInstance.post('/user/auth/login', { phone, password });
    const token = data.data?.accessToken ?? data.accessToken;
    const userData = data.data?.user ?? data.user;

    if (!token || !userData) throw new Error('Login muvaffaqiyatsiz');
    if (userData.role !== 'PATIENT') throw new Error('Bu login faqat foydalanuvchilar uchun');

    setAccessToken(token);
    setIsPatientSession(true);
    userTokenStorage.setUser(userData);
    localStorage.setItem(HAD_SESSION_KEY, '1');
    setUser(userData);
    userRestorePromise = null;
    return userData;
  };

  // ── Telegram Mini App finalize (called from /mini-app-bind once the
  //    bot has processed the user's contact-share) ─────────────────────────
  const loginViaTelegramMiniApp = async (initData) => {
    const { data } = await axiosInstance.post('/user/auth/telegram/miniapp-login', { initData });
    const token = data.data?.accessToken ?? data.accessToken;
    const userData = data.data?.user ?? data.user;
    if (!token || !userData) throw new Error('miniapp_login_failed');
    if (userData.role !== 'PATIENT') throw new Error('not_patient');

    setAccessToken(token);
    setIsPatientSession(true);
    userTokenStorage.setUser(userData);
    localStorage.setItem(HAD_SESSION_KEY, '1');
    setUser(userData);
    userRestorePromise = null;
    return userData;
  };

  // ── Telegram Login Widget ───────────────────────────────────────────────
  const loginViaTelegramWidget = async (widgetPayload) => {
    const { data } = await axiosInstance.post('/user/auth/telegram/widget-login', widgetPayload);
    const token = data.data?.accessToken ?? data.accessToken;
    const userData = data.data?.user ?? data.user;
    if (!token || !userData) throw new Error('Telegram login muvaffaqiyatsiz');
    if (userData.role !== 'PATIENT') throw new Error('Bu login faqat foydalanuvchilar uchun');

    setAccessToken(token);
    setIsPatientSession(true);
    userTokenStorage.setUser(userData);
    localStorage.setItem(HAD_SESSION_KEY, '1');
    setUser(userData);
    userRestorePromise = null;
    return userData;
  };

  // ── Register ────────────────────────────────────────────────────────────
  const register = async (userData) => {
    const { data } = await axiosInstance.post('/user/auth/register', userData);
    if (!data.success) throw new Error(data.error?.message || data.message || 'Ro\'yxatdan o\'tishda xatolik');
    return data.data;
  };

  // ── Logout ──────────────────────────────────────────────────────────────
  const logout = async () => {
    try { await axiosInstance.post('/user/auth/logout'); } catch { /* ignore */ }
    clearAccessToken();
    setIsPatientSession(false);
    userTokenStorage.clear();
    setUser(null);
    userRestorePromise = null;
  };

  // ── Update user state (e.g. after profile edit) ─────────────────────────
  const updateUserState = (partialUser) => {
    const updated = { ...user, ...partialUser };
    userTokenStorage.setUser(updated);
    setUser(updated);
  };

  // ── Click-handler helper: wait for auth restore to finish ─────────────
  // Components like "Add to cart" and "Book" used to read `user` immediately
  // and redirect to /user/login on null — but during the first 1-3 seconds of
  // a Mini App launch the auth restore is still mid-flight. Callers do
  // `const u = await waitForUser(); if (!u) { redirect } else { proceed }`.
  // Returns the resolved user (or null) — never throws.
  const tryMiniAppLogin = async () => {
    const tg = typeof window !== 'undefined' ? window.Telegram?.WebApp : null;
    const initData = tg?.initData;
    if (!initData) return null;
    try {
      const { data } = await axiosInstance.post(
        '/user/auth/telegram/miniapp-login',
        { initData },
      );
      const t = data?.data?.accessToken ?? data?.accessToken;
      const u = data?.data?.user ?? data?.user;
      if (t && u?.role === 'PATIENT') {
        setAccessToken(t);
        setIsPatientSession(true);
        userTokenStorage.setUser(u);
        localStorage.setItem(HAD_SESSION_KEY, '1');
        setUser(u);
        return u;
      }
    } catch { /* swallow */ }
    return null;
  };

  const waitForUser = async (timeoutMs = 3000) => {
    if (userRef.current) return userRef.current;
    // Poll until loading flips or timeout.
    const start = Date.now();
    while (loadingRef.current && Date.now() - start < timeoutMs) {
      await new Promise(r => setTimeout(r, 100));
      if (userRef.current) return userRef.current;
    }
    if (userRef.current) return userRef.current;
    // Last-ditch: inside Telegram, re-auth with initData before giving up.
    const recovered = await tryMiniAppLogin();
    return recovered || userRef.current || null;
  };

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
