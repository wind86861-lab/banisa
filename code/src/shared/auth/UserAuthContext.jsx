import { createContext, useContext, useState, useEffect } from 'react';
import { setAccessToken, clearAccessToken, setIsPatientSession } from '../api/axios';
import axiosInstance from '../api/axios';

// ─── SEPARATE PATIENT TOKEN STORAGE ────────────────────────────────────────
// Uses different keys from clinic/admin storage ('access_token', 'auth_user')
const USER_TOKEN_KEY = 'user_access_token';
const USER_DATA_KEY = 'user_data';

export const userTokenStorage = {
  setToken: (token) => localStorage.setItem(USER_TOKEN_KEY, token),
  getToken: () => localStorage.getItem(USER_TOKEN_KEY),
  setUser: (user) => localStorage.setItem(USER_DATA_KEY, JSON.stringify(user)),
  getUser: () => {
    try {
      const raw = localStorage.getItem(USER_DATA_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  },
  clear: () => {
    localStorage.removeItem(USER_TOKEN_KEY);
    localStorage.removeItem(USER_DATA_KEY);
  },
  isLoggedIn: () => !!localStorage.getItem(USER_TOKEN_KEY),
};

// ─── HELPERS ────────────────────────────────────────────────────────────────
const isTokenExpired = (token) => {
  if (!token) return true;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000 < Date.now();
  } catch { return true; }
};

// Singleton promise — StrictMode fix (same pattern as AuthContext)
let userRestorePromise = null;

// ─── CONTEXT ────────────────────────────────────────────────────────────────
const UserAuthContext = createContext(null);

export const UserAuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // ── Session-expiring warning shown ~60s before auto-logout ─────────────
  const [expiringSoon, setExpiringSoon] = useState(false);

  // ── Auto-logout on token expiry ─────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    const tick = () => {
      const token = userTokenStorage.getToken();
      if (!token) return;
      let exp = 0;
      try { exp = JSON.parse(atob(token.split('.')[1])).exp * 1000; } catch { return; }
      const msLeft = exp - Date.now();
      if (msLeft <= 0) {
        clearAccessToken();
        setIsPatientSession(false);
        userTokenStorage.clear();
        setUser(null);
        setExpiringSoon(false);
        return;
      }
      setExpiringSoon(msLeft < 60_000);
    };
    tick();
    const interval = setInterval(tick, 15_000);
    return () => clearInterval(interval);
  }, [user]);

  const extendSession = async () => {
    // Trigger silent refresh via cookie; axios interceptor or this endpoint will
    // set a fresh access token. Refresh is best-effort; on failure we let
    // the normal expiry path log the user out.
    try {
      const { data } = await axiosInstance.post('/user/auth/refresh');
      const newToken = data?.data?.accessToken;
      if (newToken) {
        userTokenStorage.setToken(newToken);
        setAccessToken(newToken);
      }
      setExpiringSoon(false);
    } catch { /* ignore — user will be logged out by tick */ }
  };

  // ── Session restore ─────────────────────────────────────────────────────
  useEffect(() => {
    const restoreSession = async () => {
      try {
        // Skip patient session restore on admin pages — prevents spurious 401
        if (typeof window !== 'undefined' && window.location.pathname.startsWith('/admin')) {
          setIsLoading(false);
          return;
        }

        // 1. Check sessionStorage first
        const existingToken = userTokenStorage.getToken();
        const existingUser = userTokenStorage.getUser();

        if (existingToken && existingUser && existingUser.role === 'PATIENT') {
          if (!isTokenExpired(existingToken)) {
            setAccessToken(existingToken);
            setIsPatientSession(true);
            setUser(existingUser);
            setIsLoading(false);
            return;
          }
          userTokenStorage.clear();
          clearAccessToken();
          setIsPatientSession(false);
        }

        // 2. Try cookie-based silent refresh ONLY if a past session existed
        // Avoids spurious 401 errors for users who never logged in
        const hadSession = localStorage.getItem('user_had_session');
        if (!hadSession) {
          setIsLoading(false);
          return;
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

          if (token && userData && userData.role === 'PATIENT') {
            setAccessToken(token);
            setIsPatientSession(true);
            userTokenStorage.setToken(token);
            userTokenStorage.setUser(userData);
            setUser(userData);
            setIsLoading(false);
            return;
          }
        }

        // Nothing to restore — normal unauthenticated state.
        // Clear patient-specific storage only. Do NOT call clearAccessToken() here:
        // AuthContext may have set a clinic token concurrently and we must not wipe it.
        userTokenStorage.clear();
        setIsPatientSession(false);
        setUser(null);
        setIsLoading(false);
      } catch (err) {
        console.error('User auth restore error:', err);
        // Clear patient-specific storage only — same reason as above.
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
    userTokenStorage.setToken(token);
    userTokenStorage.setUser(userData);
    localStorage.setItem('user_had_session', '1');
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
    localStorage.removeItem('user_had_session');
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
