// Central API service — all backend calls go through here
// VULN-03: access token lives in module memory, NOT localStorage
import axiosInstance, { setAccessToken, getAccessToken, clearAccessToken } from '../shared/api/axios';

const BASE_URL = '/api';

const getHeaders = () => {
    const token = getAccessToken();
    return {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
};

const handleResponse = async (res) => {
    const data = await res.json();
    if (!data.success) {
        throw new Error(data.error?.message || 'Request failed');
    }
    return data;
};

// ─── AUTH ────────────────────────────────────────────────────────────────────

export const authApi = {
    login: async (email, password) => {
        const res = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ email, password }),
        });
        const data = await handleResponse(res);
        if (data.data?.accessToken) {
            setAccessToken(data.data.accessToken);
        }
        return data.data;
    },

    loginWithPhone: async (phone, password) => {
        const res = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ phone, password }),
        });
        const data = await handleResponse(res);
        if (data.accessToken) {
            setAccessToken(data.accessToken);
        }
        return data;
    },

    logout: async () => {
        clearAccessToken();
        // Tell server to clear the HttpOnly refresh-token cookie
        await fetch(`${BASE_URL}/auth/logout`, {
            method: 'POST',
            credentials: 'include',
        }).catch(() => { });
    },

    me: async () => {
        // Use axios instance — auto-refresh interceptor handles 401 on page reload
        const res = await axiosInstance.get('/auth/me');
        return res.data;
    },

    clinicStatus: async () => {
        const res = await axiosInstance.get('/clinic/status');
        return res.data;
    },
};

// ─── Helper: unwrap axios response ───────────────────────────────────────────
const axiosData = (res) => res.data?.data;
const axiosFull = (res) => res.data;

// ─── CATEGORIES ──────────────────────────────────────────────────────────────

export const categoriesApi = {
    list: async () => axiosData(await axiosInstance.get('/categories')),
    create: async (payload) => axiosData(await axiosInstance.post('/categories', payload)),
    update: async (id, payload) => axiosData(await axiosInstance.put(`/categories/${id}`, payload)),
    delete: async (id) => axiosFull(await axiosInstance.delete(`/categories/${id}`)),
};

// ─── DIAGNOSTICS ─────────────────────────────────────────────────────────────

export const diagnosticsApi = {
    list: async (params = {}) => {
        const query = new URLSearchParams();
        if (params.page) query.set('page', params.page);
        if (params.limit) query.set('limit', params.limit);
        if (params.search) query.set('search', params.search);
        if (params.categoryId) query.set('categoryId', params.categoryId);
        if (params.minPrice) query.set('minPrice', params.minPrice);
        if (params.maxPrice) query.set('maxPrice', params.maxPrice);
        return axiosFull(await axiosInstance.get(`/diagnostics?${query}`));
    },
    getById: async (id) => axiosData(await axiosInstance.get(`/diagnostics/${id}`)),
    create: async (payload) => axiosData(await axiosInstance.post('/diagnostics', payload)),
    update: async (id, payload) => axiosData(await axiosInstance.put(`/diagnostics/${id}`, payload)),
    delete: async (id) => axiosFull(await axiosInstance.delete(`/diagnostics/${id}`)),
};

// ─── SURGICAL ────────────────────────────────────────────────────────────────

export const surgicalApi = {
    list: async (params = {}) => {
        const query = new URLSearchParams();
        if (params.page) query.set('page', params.page);
        if (params.limit) query.set('limit', params.limit);
        if (params.search) query.set('search', params.search);
        if (params.categoryId) query.set('categoryId', params.categoryId);
        if (params.minPrice) query.set('minPrice', params.minPrice);
        if (params.maxPrice) query.set('maxPrice', params.maxPrice);
        if (params.complexity) query.set('complexity', params.complexity);
        if (params.riskLevel) query.set('riskLevel', params.riskLevel);
        return axiosFull(await axiosInstance.get(`/surgical?${query}`));
    },
    getById: async (id) => axiosData(await axiosInstance.get(`/surgical/${id}`)),
    create: async (payload) => axiosData(await axiosInstance.post('/surgical', payload)),
    update: async (id, payload) => axiosData(await axiosInstance.put(`/surgical/${id}`, payload)),
    delete: async (id) => axiosFull(await axiosInstance.delete(`/surgical/${id}`)),
};

// ─── SANATORIUM ──────────────────────────────────────────────────────────────

export const sanatoriumApi = {
    list: async (params = {}) => {
        const query = new URLSearchParams();
        if (params.page) query.set('page', params.page);
        if (params.limit) query.set('limit', params.limit);
        if (params.search) query.set('search', params.search);
        if (params.categoryId) query.set('categoryId', params.categoryId);
        if (params.minPrice) query.set('minPrice', params.minPrice);
        if (params.maxPrice) query.set('maxPrice', params.maxPrice);
        if (params.serviceType) query.set('serviceType', params.serviceType);
        return axiosFull(await axiosInstance.get(`/sanatorium?${query}`));
    },
    getById: async (id) => axiosData(await axiosInstance.get(`/sanatorium/${id}`)),
    create: async (payload) => axiosData(await axiosInstance.post('/sanatorium', payload)),
    update: async (id, payload) => axiosData(await axiosInstance.put(`/sanatorium/${id}`, payload)),
    delete: async (id) => axiosFull(await axiosInstance.delete(`/sanatorium/${id}`)),
};

// ─── CLINICS ─────────────────────────────────────────────────────────────────

export const clinicsApi = {
    list: async (params = {}) => {
        const query = new URLSearchParams();
        if (params.page) query.set('page', params.page);
        if (params.limit) query.set('limit', params.limit);
        if (params.search) query.set('search', params.search);
        if (params.status) query.set('status', params.status);
        if (params.region) query.set('region', params.region);
        if (params.type) query.set('type', params.type);
        if (params.source) query.set('source', params.source);
        if (params.sort) query.set('sort', params.sort);
        const res = await axiosInstance.get(`/admin/clinics?${query}`);
        // admin endpoint returns { clinics, meta } — normalize to { data, meta }
        return { data: res.data?.data || [], meta: res.data?.meta || {} };
    },
    getById: async (id) => axiosData(await axiosInstance.get(`/clinics/${id}`)),
    create: async (payload) => axiosData(await axiosInstance.post('/clinics', payload)),
    update: async (id, payload) => axiosData(await axiosInstance.put(`/clinics/${id}`, payload)),
    updateStatus: async (id, status, rejectionReason) => axiosData(await axiosInstance.patch(`/clinics/${id}/status`, { status, rejectionReason })),
    delete: async (id) => axiosFull(await axiosInstance.delete(`/clinics/${id}`)),
};

// ─── ADMIN ───────────────────────────────────────────────────────────────────

export const adminApi = {
    getProfile: async () => axiosData(await axiosInstance.get('/admin/profile')),
    updateProfile: async (payload) => axiosData(await axiosInstance.put('/admin/profile', payload)),
    updatePassword: async (payload) => axiosData(await axiosInstance.put('/admin/password', payload)),
    getNotifications: async () => axiosData(await axiosInstance.get('/admin/notifications')),
    markNotificationAsRead: async (id) => axiosData(await axiosInstance.patch(`/admin/notifications/${id}/read`)),
    markAllNotificationsAsRead: async () => axiosData(await axiosInstance.patch('/admin/notifications/read-all')),
};
