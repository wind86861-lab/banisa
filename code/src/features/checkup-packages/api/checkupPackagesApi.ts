import api from '../../../shared/api/axios';
import {
    CheckupPackage,
    ClinicCheckupPackage,
    CheckupPackageFilters,
    PublicCheckupPackageFilters,
    PaginatedResponse
} from '../types/checkupPackage.types';

export const checkupPackagesApi = {
    // ── SUPER ADMIN ───────────────────────────────────────────────────────────
    getAll: async (params: CheckupPackageFilters = {}): Promise<PaginatedResponse<CheckupPackage>> => {
        const query = new URLSearchParams();
        if (params.page) query.set('page', String(params.page));
        if (params.limit) query.set('limit', String(params.limit));
        if (params.search) query.set('search', params.search);
        if (params.category) query.set('category', params.category);
        if (params.status !== undefined) query.set('status', String(params.status));

        const { data } = await api.get(`/admin/checkup-packages?${query}`);
        return { items: data.data, meta: data.meta };
    },

    getById: async (id: string): Promise<CheckupPackage> => {
        const { data } = await api.get(`/admin/checkup-packages/${id}`);
        return data.data;
    },

    create: async (payload: Partial<CheckupPackage>): Promise<CheckupPackage> => {
        const { data } = await api.post('/admin/checkup-packages', payload);
        return data.data;
    },

    update: async (id: string, payload: Partial<CheckupPackage>): Promise<CheckupPackage> => {
        const { data } = await api.put(`/admin/checkup-packages/${id}`, payload);
        return data.data;
    },

    delete: async (id: string): Promise<void> => {
        await api.delete(`/admin/checkup-packages/${id}`);
    },

    toggleStatus: async (id: string, activate: boolean): Promise<CheckupPackage> => {
        const action = activate ? 'activate' : 'deactivate';
        const { data } = await api.patch(`/admin/checkup-packages/${id}/${action}`);
        return data.data;
    },

    // ── CLINIC ADMIN ──────────────────────────────────────────────────────────
    getClinicAvailable: async (): Promise<CheckupPackage[]> => {
        const { data } = await api.get('/clinic/checkup-packages/available');
        return data.data;
    },

    getClinicActivated: async (): Promise<ClinicCheckupPackage[]> => {
        const { data } = await api.get('/clinic/checkup-packages');
        return data.data;
    },

    activateForClinic: async (payload: { packageId: string; clinicPrice: number; customNotes?: string }): Promise<ClinicCheckupPackage> => {
        const { data } = await api.post('/clinic/checkup-packages/activate', payload);
        return data.data;
    },

    updateClinicPackage: async (id: string, payload: { clinicPrice?: number; customNotes?: string }): Promise<ClinicCheckupPackage> => {
        const { data } = await api.patch(`/clinic/checkup-packages/${id}`, payload);
        return data.data;
    },

    deactivateForClinic: async (id: string): Promise<void> => {
        await api.patch(`/clinic/checkup-packages/${id}/deactivate`);
    },

    // ── PUBLIC ────────────────────────────────────────────────────────────────
    getPublicList: async (params: PublicCheckupPackageFilters): Promise<ClinicCheckupPackage[]> => {
        const query = new URLSearchParams();
        query.set('clinicId', params.clinicId);
        if (params.search) query.set('search', params.search);
        if (params.category) query.set('category', params.category);
        if (params.minPrice) query.set('minPrice', String(params.minPrice));
        if (params.maxPrice) query.set('maxPrice', String(params.maxPrice));

        const { data } = await api.get(`/checkup-packages?${query}`);
        return data.data;
    },

    getPublicById: async (id: string): Promise<ClinicCheckupPackage> => {
        const { data } = await api.get(`/checkup-packages/${id}`);
        return data.data;
    },
};
