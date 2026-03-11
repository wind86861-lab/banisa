import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../shared/api/axios';

// ─── Stats ────────────────────────────────────────────────────────────────────
export const useClinicStats = () =>
    useQuery({
        queryKey: ['clinic', 'stats'],
        queryFn: async () => {
            const { data } = await api.get('/clinic/stats');
            return data.data;
        },
    });

// ─── Profile ──────────────────────────────────────────────────────────────────
export const useClinicProfile = () =>
    useQuery({
        queryKey: ['clinic', 'profile'],
        queryFn: async () => {
            const { data } = await api.get('/clinic/profile');
            return data.data;
        },
    });

export const useUpdateProfile = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (payload) => {
            const { data } = await api.put('/clinic/profile', payload);
            return data.data;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['clinic', 'profile'] });
            qc.invalidateQueries({ queryKey: ['clinic', 'me'] });
        },
    });
};

// ─── Bookings ─────────────────────────────────────────────────────────────────
export const useClinicBookings = (filters = {}) =>
    useQuery({
        queryKey: ['clinic', 'bookings', filters],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (filters.status && filters.status !== 'ALL') params.append('status', filters.status);
            if (filters.search)   params.append('search',   filters.search);
            if (filters.page)     params.append('page',     String(filters.page));
            if (filters.limit)    params.append('limit',    String(filters.limit));
            const { data } = await api.get(`/clinic/bookings?${params}`);
            return { data: data.data ?? [], meta: data.meta ?? {} };
        },
    });

export const useUpdateBookingStatus = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, status, cancellationReason }) => {
            const { data } = await api.patch(`/clinic/bookings/${id}/status`, { status, cancellationReason });
            return data.data;
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: ['clinic', 'bookings'] }),
    });
};

// ─── Staff ────────────────────────────────────────────────────────────────────
export const useClinicStaff = (filters = {}) =>
    useQuery({
        queryKey: ['clinic', 'staff', filters],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (filters.search) params.append('search', filters.search);
            if (filters.page)   params.append('page',   String(filters.page));
            const { data } = await api.get(`/clinic/staff?${params}`);
            return { data: data.data ?? [], meta: data.meta ?? {} };
        },
    });

export const useCreateStaff = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (payload) => {
            const { data } = await api.post('/clinic/staff', payload);
            return data.data;
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: ['clinic', 'staff'] }),
    });
};

export const useUpdateStaff = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, ...payload }) => {
            const { data } = await api.put(`/clinic/staff/${id}`, payload);
            return data.data;
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: ['clinic', 'staff'] }),
    });
};

export const useDeleteStaff = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (id) => {
            await api.delete(`/clinic/staff/${id}`);
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: ['clinic', 'staff'] }),
    });
};

// ─── Discounts ────────────────────────────────────────────────────────────────
export const useClinicDiscounts = (filters = {}) =>
    useQuery({
        queryKey: ['clinic', 'discounts', filters],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (filters.search) params.append('search', filters.search);
            if (filters.status && filters.status !== 'ALL') params.append('status', filters.status);
            const { data } = await api.get(`/clinic/discounts?${params}`);
            return { data: data.data ?? [], meta: data.meta ?? {} };
        },
    });

export const useCreateDiscount = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (payload) => {
            const { data } = await api.post('/clinic/discounts', payload);
            return data.data;
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: ['clinic', 'discounts'] }),
    });
};

export const useUpdateDiscount = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, ...payload }) => {
            const { data } = await api.put(`/clinic/discounts/${id}`, payload);
            return data.data;
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: ['clinic', 'discounts'] }),
    });
};

export const useDeleteDiscount = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (id) => {
            await api.delete(`/clinic/discounts/${id}`);
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: ['clinic', 'discounts'] }),
    });
};
