import axios from 'axios';
import { tokenStorage } from '../auth/tokenStorage';

// VULN-03: access token stored in module memory — not localStorage (XSS-safe)
let _accessToken = null;

export const setAccessToken = (token) => { _accessToken = token; };
export const getAccessToken = () => _accessToken;
export const clearAccessToken = () => { _accessToken = null; };

const api = axios.create({
  baseURL: '/api',
  withCredentials: true, // send HttpOnly refresh-token cookie automatically
});

// ─── Request interceptor — attach access token to every request ───────────────
api.interceptors.request.use((config) => {
  if (_accessToken) {
    config.headers.Authorization = `Bearer ${_accessToken}`;
  }
  return config;
});

// ─── Response interceptor — auto-refresh on 401 and retry once ───────────────
let _isRefreshing = false;
let _refreshQueue = []; // callbacks waiting while a refresh is in progress

const processQueue = (error, token = null) => {
  _refreshQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token);
  });
  _refreshQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    // Never intercept the refresh endpoint itself — would cause infinite loop
    const isRefreshCall = original.url?.includes('/auth/refresh') || original.url?.includes('/user/auth/refresh');
    if (error.response?.status !== 401 || original._retry || isRefreshCall) {
      return Promise.reject(error);
    }

    if (_isRefreshing) {
      // Queue subsequent 401s while refresh is pending
      return new Promise((resolve, reject) => {
        _refreshQueue.push({ resolve, reject });
      }).then((token) => {
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      });
    }

    // SECURITY: SUPER_ADMIN never has a refresh cookie.
    // If we attempt refresh, a leftover CLINIC_ADMIN cookie could return the wrong token,
    // causing the admin panel to use a CLINIC_ADMIN token → 403 on all admin endpoints.
    // Skip refresh and redirect to admin login immediately.
    const storedUserBeforeRefresh = tokenStorage.getUser();
    if (storedUserBeforeRefresh?.role === 'SUPER_ADMIN') {
      clearAccessToken();
      tokenStorage.clear();
      if (typeof window !== 'undefined') {
        window.location.href = '/admin/login';
      }
      return Promise.reject(error);
    }

    original._retry = true;
    _isRefreshing = true;

    try {
      const { data } = await axios.post(
        '/api/auth/refresh',
        {},
        { withCredentials: true }
      );
      const newToken = data.data?.accessToken;
      const refreshedUser = data.data?.user ?? data.user;

      // Guard: if refresh returned a token for a different role than what was stored,
      // discard it — prevents cross-session token pollution.
      if (refreshedUser && storedUserBeforeRefresh &&
        refreshedUser.role !== storedUserBeforeRefresh.role) {
        clearAccessToken();
        tokenStorage.clear();
        processQueue(new Error('Role mismatch after refresh'), null);
        if (typeof window !== 'undefined') {
          window.location.href = '/';
        }
        return Promise.reject(new Error('Role mismatch after refresh'));
      }

      setAccessToken(newToken);
      processQueue(null, newToken);
      original.headers.Authorization = `Bearer ${newToken}`;
      return api(original);
    } catch (refreshError) {
      processQueue(refreshError, null);
      clearAccessToken();
      // Only hard-redirect if refresh returned 401 (truly not authenticated)
      // Don't redirect on 429 (rate limit) — that would wrongly kick logged-in users
      const refreshStatus = refreshError?.response?.status;
      if (typeof window !== 'undefined' && refreshStatus === 401) {
        const storedUser = tokenStorage.getUser();
        let loginUrl = '/';
        if (storedUser?.role === 'CLINIC_ADMIN' || storedUser?.role === 'PENDING_CLINIC') {
          loginUrl = '/login';
        } else if (storedUser?.role === 'PATIENT') {
          loginUrl = '/user/login';
        }
        tokenStorage.clear();
        sessionStorage.removeItem('user_access_token');
        sessionStorage.removeItem('user_data');
        window.location.href = loginUrl;
      }
      return Promise.reject(refreshError);
    } finally {
      _isRefreshing = false;
    }
  }
);

export default api;
