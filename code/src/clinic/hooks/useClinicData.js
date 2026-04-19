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

// ─── Bookings / Appointments (new workflow) ──────────────────────────────────
export const useClinicBookings = (filters = {}) =>
    useQuery({
        queryKey: ['clinic', 'bookings', filters],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (filters.status && filters.status !== 'ALL') params.append('status', filters.status);
            if (filters.search) params.append('search', filters.search);
            if (filters.page) params.append('page', String(filters.page));
            if (filters.limit) params.append('limit', String(filters.limit));
            const { data } = await api.get(`/clinic/appointments?${params}`);
            return { data: data.data ?? [], meta: data.meta ?? {} };
        },
    });

const invalidateBookings = (qc) => {
    qc.invalidateQueries({ queryKey: ['clinic', 'bookings'] });
};

export const useAcceptBooking = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, notes }) => {
            const { data } = await api.post(`/clinic/appointments/${id}/accept`, { notes });
            return data.data;
        },
        onSuccess: () => invalidateBookings(qc),
    });
};

export const useRescheduleBooking = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, scheduledAt, reason }) => {
            const { data } = await api.post(`/clinic/appointments/${id}/reschedule`, { scheduledAt, reason });
            return data.data;
        },
        onSuccess: () => invalidateBookings(qc),
    });
};

export const useStartBooking = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({ id }) => {
            const { data } = await api.post(`/clinic/appointments/${id}/start`);
            return data.data;
        },
        onSuccess: () => invalidateBookings(qc),
    });
};

export const useCompleteBooking = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, note, paymentMethod }) => {
            const { data } = await api.post(`/clinic/appointments/${id}/complete`, { note, paymentMethod });
            return data.data;
        },
        onSuccess: () => invalidateBookings(qc),
    });
};

export const useNoShowBooking = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({ id }) => {
            const { data } = await api.post(`/clinic/appointments/${id}/no-show`);
            return data.data;
        },
        onSuccess: () => invalidateBookings(qc),
    });
};

// Backwards-compatible wrapper for old ClinicBookings page — maps old statuses to new actions
export const useUpdateBookingStatus = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, status }) => {
            let endpoint;
            switch (status) {
                case 'CONFIRMED':
                case 'CLINIC_ACCEPTED':
                    endpoint = `/clinic/appointments/${id}/accept`; break;
                case 'IN_PROGRESS':
                    endpoint = `/clinic/appointments/${id}/start`; break;
                case 'COMPLETED':
                    endpoint = `/clinic/appointments/${id}/complete`; break;
                case 'NO_SHOW':
                    endpoint = `/clinic/appointments/${id}/no-show`; break;
                default:
                    throw new Error(`Bu status uchun amal mavjud emas: ${status}`);
            }
            const { data } = await api.post(endpoint);
            return data.data;
        },
        onSuccess: () => invalidateBookings(qc),
    });
};

// ─── Staff ────────────────────────────────────────────────────────────────────
export const useClinicStaff = (filters = {}) =>
    useQuery({
        queryKey: ['clinic', 'staff', filters],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (filters.search) params.append('search', filters.search);
            if (filters.page) params.append('page', String(filters.page));
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
