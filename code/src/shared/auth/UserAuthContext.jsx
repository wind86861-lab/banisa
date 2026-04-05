import { createContext, useContext, useState, useEffect } from 'react';
import { setAccessToken, clearAccessToken } from '../api/axios';
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

  // ── Auto-logout on token expiry ─────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      if (isTokenExpired(userTokenStorage.getToken())) {
        clearAccessToken();
        userTokenStorage.clear();
        setUser(null);
      }
    }, 30_000);
    return () => clearInterval(interval);
  }, [user]);

  // ── Session restore ─────────────────────────────────────────────────────
  useEffect(() => {
    const restoreSession = async () => {
      try {
        // 1. Check sessionStorage first
        const existingToken = userTokenStorage.getToken();
        const existingUser = userTokenStorage.getUser();

        if (existingToken && existingUser && existingUser.role === 'PATIENT') {
          setAccessToken(existingToken);
          setUser(existingUser);
          setIsLoading(false);
          return;
        } else {
          clearAccessToken();
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
            userTokenStorage.setToken(token);
            userTokenStorage.setUser(userData);
            setUser(userData);
            setIsLoading(false);
            return;
          }
        }

        // Nothing to restore — normal unauthenticated state
        userTokenStorage.clear();
        clearAccessToken();
        setUser(null);
        setIsLoading(false);
      } catch (err) {
        console.error('User auth restore error:', err);
        // Ensure we always end in a valid state
        userTokenStorage.clear();
        clearAccessToken();
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
    }}>
      {children}
    </UserAuthContext.Provider>
  );
};

export const useUserAuth = () => {
  const context = useContext(UserAuthContext);
  if (!context) throw new Error('useUserAuth must be used within UserAuthProvider');
  return context;
};
