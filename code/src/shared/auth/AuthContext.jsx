import React, { createContext, useContext, useState, useEffect } from 'react';
import { tokenStorage } from './tokenStorage';
import { setAccessToken, clearAccessToken, setIsPatientSession } from '../api/axios';
import axiosInstance from '../api/axios';

const AuthContext = createContext(null);

// ─── MODULE LEVEL SINGLETON ───────────────────────────────────────────────
// React StrictMode double-mount muammosini hal qiladi
// useRef ishlamaydi chunki StrictMode cleanup da reset bo'ladi
// Module variable esa hech qachon reset bo'lmaydi
let restorePromise = null;
// ─────────────────────────────────────────────────────────────────────────

// Helper: decode JWT and check if expired
const isTokenExpired = (token) => {
  if (!token) return true;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp ? payload.exp * 1000 < Date.now() : false;
  } catch {
    return true;
  }
};

const tokenMsLeft = (token) => {
  if (!token) return -1;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000 - Date.now();
  } catch { return -1; }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // ─── Silent auto-refresh watchdog — matches patient flow ──────────────────
  // The access token expires in 15 min (prod). The HttpOnly refresh cookie is
  // good for 7 days. While the user is active, refresh in the background so
  // they're never kicked out mid-task. SUPER_ADMIN has no refresh cookie, so
  // we skip the silent refresh for that role and let the token simply expire.
  useEffect(() => {
    if (!user) return;
    if (user.role === 'SUPER_ADMIN') return; // no refresh cookie — natural expiry only

    let refreshing = false;
    let failedOnce = false;

    const trySilentRefresh = async () => {
      if (refreshing) return false;
      refreshing = true;
      try {
        const { data } = await axiosInstance.post('/auth/refresh');
        const newToken = data?.data?.accessToken ?? data?.accessToken;
        if (newToken) {
          setAccessToken(newToken);
          tokenStorage.setToken(newToken);
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
      const token = tokenStorage.getToken();
      if (!token) return;
      const msLeft = tokenMsLeft(token);

      // Already expired — one last refresh attempt before logging out.
      if (msLeft <= 0) {
        const ok = await trySilentRefresh();
        if (ok) return;
        clearAccessToken();
        setIsPatientSession(false);
        tokenStorage.clear();
        setUser(null);
        return;
      }

      // Under 2 minutes left → refresh silently in the background.
      if (msLeft < 120_000 && !failedOnce) {
        const ok = await trySilentRefresh();
        if (!ok) failedOnce = true;
      }
    };

    tick();
    const interval = setInterval(tick, 30_000);
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    const restoreSession = async () => {
      // 1. SessionStorage da token bormi? → API call shart emas
      const existingToken = tokenStorage.getToken();
      const existingUser = tokenStorage.getUser();
      if (existingToken && existingUser) {
        if (!isTokenExpired(existingToken)) {
          setAccessToken(existingToken);
          setIsPatientSession(false);
          setUser(existingUser);
          setIsLoading(false);
          // Background hydration — sessionStorage user can be stale (e.g.
          // saved before backend started returning clinicName). Refresh
          // it from /auth/me without blocking initial render so the
          // sidebar/topbar pick up the real clinic name on next paint.
          const needsHydration =
            existingUser.role === 'CLINIC_ADMIN' &&
            existingUser.clinicId &&
            !existingUser.clinicName;
          if (needsHydration) {
            axiosInstance
              .get('/auth/me')
              .then((res) => {
                const fresh = res.data?.data ?? res.data;
                if (fresh && fresh.id) {
                  tokenStorage.setUser(fresh);
                  setUser(fresh);
                }
              })
              .catch(() => { /* non-fatal; current data stays */ });
          }
          return;
        }
        tokenStorage.clear();
        clearAccessToken();
        setIsPatientSession(false);
      }

      // 2. No sessionStorage data - try cookie refresh ONLY if a past session existed
      // This avoids spurious 401 errors in the console for users who never logged in
      const hadSession = localStorage.getItem('clinic_had_session');
      if (!hadSession) {
        setIsLoading(false);
        return;
      }

      if (!restorePromise) {
        restorePromise = axiosInstance
          .post('/auth/refresh')
          .then(res => res.data)
          .catch(() => {
            return null;
          })
          .finally(() => {
            setTimeout(() => { restorePromise = null; }, 5000);
          });
      }

      const data = await restorePromise;

      if (data) {
        const token = data.data?.accessToken ?? data.accessToken;
        const userData = data.data?.user ?? data.user;

        if (token && userData) {
          // SECURITY: SUPER_ADMIN must always log in explicitly each browser session.
          if (userData.role === 'SUPER_ADMIN') {
            clearAccessToken();
            setIsPatientSession(false);
            tokenStorage.clear();
            setUser(null);
            setIsLoading(false);
            return;
          }
          setAccessToken(token);
          setIsPatientSession(false);
          tokenStorage.setToken(token);
          tokenStorage.setUser(userData);
          setUser(userData);
        } else {
          // Clinic restore returned data but no valid token/user.
          // Only clear clinic-specific storage — do NOT touch _accessToken or
          // _isPatientSession because UserAuthContext may have set a patient
          // session concurrently. Wiping it causes the 401→wrong-refresh→redirect loop.
          tokenStorage.clear();
          setUser(null);
        }
      } else {
        // Clinic cookie refresh failed — clear clinic storage only.
        // Do NOT call clearAccessToken() or setIsPatientSession(false):
        // UserAuthContext may have already set a valid patient token concurrently.
        // Wiping it causes: GET /cart → 401 → interceptor calls wrong endpoint → redirect loop → 429.
        tokenStorage.clear();
        setUser(null);
      }

      setIsLoading(false);
    };

    restoreSession();
  }, []);

  // ─── SUPER ADMIN login — EMAIL + password → /api/auth/admin/login ─────────
  const loginAdmin = async (email, password) => {
    const { data } = await axiosInstance.post('/auth/admin/login', { email, password });
    const token = data.data?.accessToken ?? data.accessToken;
    const userData = data.data?.user ?? data.user;
    if (!token || !userData) throw new Error('Login muvaffaqiyatsiz');
    if (userData.role !== 'SUPER_ADMIN') throw new Error('Bu login faqat adminlar uchun');
    setAccessToken(token);
    setIsPatientSession(false);
    tokenStorage.setToken(token);
    tokenStorage.setUser(userData);
    setUser(userData);
    restorePromise = null;
    return userData;
  };

  // ─── CLINIC ADMIN login — phone + password → /api/auth/login ────────────────
  const loginClinic = async (phone, password) => {
    const { data } = await axiosInstance.post('/auth/login', { phone, password });
    const token = data.data?.accessToken ?? data.accessToken;
    const userData = data.data?.user ?? data.user;
    if (!token || !userData) throw new Error('Login muvaffaqiyatsiz');
    if (userData.role === 'SUPER_ADMIN') throw new Error('Admin hisobi uchun admin login sahifasidan foydalaning');
    setAccessToken(token);
    setIsPatientSession(false);
    tokenStorage.setToken(token);
    tokenStorage.setUser(userData);
    localStorage.setItem('clinic_had_session', '1');
    setUser(userData);
    restorePromise = null;
    return userData;
  };

  const loginWithTokens = (accessToken, userData) => {
    setAccessToken(accessToken);
    tokenStorage.setToken(accessToken);
    tokenStorage.setUser(userData);
    setUser(userData);
    restorePromise = null;
  };

  const logout = async () => {
    try { await axiosInstance.post('/auth/logout'); } catch { /* ignore */ }
    clearAccessToken();
    setIsPatientSession(false);
    tokenStorage.clear();
    localStorage.removeItem('clinic_had_session');
    restorePromise = null;
    setUser(null);
  };

  const refetchStatus = async () => {
    try {
      const { data } = await axiosInstance.post('/auth/refresh');
      const token = data.data?.accessToken ?? data.accessToken;
      const userData = data.data?.user ?? data.user;
      if (token && userData) {
        setAccessToken(token);
        setIsPatientSession(false);
        tokenStorage.setToken(token);
        tokenStorage.setUser(userData);
        setUser(userData);
        return userData;
      }
    } catch { /* ignore */ }
    return null;
  };

  return (
    <AuthContext.Provider value={{
      user,
      isLoading,
      loading: isLoading,
      loginAdmin,
      loginClinic,
      loginWithTokens,
      logout,
      refetchStatus,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
};
