import { createContext, useContext, useState, useEffect } from 'react';
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

  // ── Silent auto-refresh + expiry watchdog ─────────────────────────────────
  // Strategy: while logged in, refresh the access token in the background as
  // soon as it has <2 min remaining. The HttpOnly refresh-token cookie is
  // valid for 7 days, so this is invisible to the user. Only if a refresh
  // attempt actually FAILS do we fall back to the warning toast and, after
  // that, log the user out.
  useEffect(() => {
    if (!user) return;
    let refreshing = false;
    let failedOnce = false;

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
        return false;
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
        const tg = typeof window !== 'undefined' ? window.Telegram?.WebApp : null;
        const initData = tg?.initData;
        if (tg && initData) {
          try {
            tg.ready();
            tg.expand?.();
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
            // 404 not_bound → push the user to a friendly bind-first screen.
            // We only redirect when actually inside Telegram WebView so the
            // public site is never affected.
            if (e?.response?.status === 404) {
              if (!window.location.pathname.startsWith('/mini-app-bind')) {
                window.location.replace('/mini-app-bind');
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

        // Refresh failed or returned non-patient — clear everything.
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

  return (
    <UserAuthContext.Provider value={{
      user,
      isLoading,
      loading: isLoading,
      isLoggedIn: !!user,
      login,
      loginViaTelegramWidget,
      register,
      logout,
      updateUserState,
      expiringSoon,
      extendSession,
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
