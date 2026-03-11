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
    const isRefreshCall = original.url?.includes('/auth/refresh');
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

    original._retry = true;
    _isRefreshing = true;

    try {
      const { data } = await axios.post(
        '/api/auth/refresh',
        {},
        { withCredentials: true }
      );
      const newToken = data.data?.accessToken;
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
        const loginUrl = storedUser?.role === 'SUPER_ADMIN' ? '/admin/login' : '/login';
        tokenStorage.clear();
        window.location.href = loginUrl;
      }
      return Promise.reject(refreshError);
    } finally {
      _isRefreshing = false;
    }
  }
);

export default api;
