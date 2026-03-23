import React, { createContext, useContext, useState, useEffect } from 'react';
import { tokenStorage } from './tokenStorage';
import { setAccessToken, clearAccessToken } from '../api/axios';
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

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // ─── Periodic token expiry check — auto-logout when token expires ──────
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      const token = tokenStorage.getToken();
      if (isTokenExpired(token)) {
        clearAccessToken();
        tokenStorage.clear();
        setUser(null);
      }
    }, 30_000); // check every 30 seconds
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
          setUser(existingUser);
          setIsLoading(false);
          return;
        }
        // Token expired or malformed — clear and attempt cookie refresh below
        tokenStorage.clear();
        clearAccessToken();
      }

      // 2. Cookie orqali refresh — singleton promise (StrictMode fix)
      if (!restorePromise) {
        restorePromise = axiosInstance
          .post('/auth/refresh')
          .then(res => res.data)
          .catch(() => null)
          .finally(() => {
            // 5 sekund keyin reset — keyingi sahifa yuklanishi uchun
            setTimeout(() => { restorePromise = null; }, 5000);
          });
      }

      // Ikkinchi mount ham shu promise ni kutadi → yangi API call YO'Q
      const data = await restorePromise;

      if (data) {
        const token = data.data?.accessToken ?? data.accessToken;
        const userData = data.data?.user ?? data.user;

        if (token && userData) {
          // SECURITY: SUPER_ADMIN must always log in explicitly each browser session.
          // Cookie-based silent restore is blocked for admins.
          // Mid-session page reloads still work because sessionStorage is checked above.
          if (userData.role === 'SUPER_ADMIN') {
            clearAccessToken();
            tokenStorage.clear();
            setUser(null);
            setIsLoading(false);
            return;
          }
          setAccessToken(token);
          tokenStorage.setToken(token);
          tokenStorage.setUser(userData);
          setUser(userData);
        } else {
          tokenStorage.clear();
          clearAccessToken();
          setUser(null);
        }
      } else {
        // 401 — cookie yo'q yoki muddati o'tgan → bu NORMAL holat
        // Login sahifasida bo'lsa — xato emas, shunchaki loginsiz
        tokenStorage.clear();
        clearAccessToken();
        setUser(null);
      }

      setIsLoading(false);
    };

    restoreSession();
  }, []);

  // ─── SUPER ADMIN login — email + password → /api/auth/admin/login ──────────
  const loginAdmin = async (email, password) => {
    const { data } = await axiosInstance.post('/auth/admin/login', { email, password });
    const token = data.data?.accessToken ?? data.accessToken;
    const userData = data.data?.user ?? data.user;
    if (!token || !userData) throw new Error('Login muvaffaqiyatsiz');
    if (userData.role !== 'SUPER_ADMIN') throw new Error('Bu login faqat adminlar uchun');
    setAccessToken(token);
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
    tokenStorage.setToken(token);
    tokenStorage.setUser(userData);
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
    tokenStorage.clear();
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
