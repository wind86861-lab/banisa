import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../../../../shared/api/axios';

const BASE = '/admin/clinics';

// ─── Queries ─────────────────────────────────────────────────────────────────

export const useClinics = (filters = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '' && v !== 'all') {
            params.set(k, String(v));
        }
    });

    return useQuery({
        queryKey: ['admin-clinics', filters],
        queryFn: async () => {
            const { data } = await axiosInstance.get(`${BASE}?${params}`);
            return data;
        },
        placeholderData: (prev) => prev,
        staleTime: 30_000,
    });
};

export const useClinicById = (id) => {
    return useQuery({
        queryKey: ['admin-clinic', id],
        queryFn: async () => {
            const { data } = await axiosInstance.get(`${BASE}/${id}`);
            return data?.data;
        },
        enabled: !!id,
    });
};

export const useClinicCounts = () => {
    const allQuery = useClinics({ limit: 1 });
    const pendingQuery = useClinics({ source: 'SELF_REGISTERED', status: 'PENDING', limit: 1 });
    const adminQuery = useClinics({ source: 'ADMIN_CREATED', status: 'APPROVED', limit: 1 });

    return {
        all: allQuery.data?.meta?.total ?? 0,
        adminCreated: adminQuery.data?.meta?.total ?? 0,
        pending: pendingQuery.data?.meta?.total ?? 0,
    };
};

// ─── Mutations ────────────────────────────────────────────────────────────────

export const useApproveClinic = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id) => axiosInstance.post(`${BASE}/${id}/approve`),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-clinics'] }),
    });
};

export const useRejectClinic = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, reason }) => axiosInstance.post(`${BASE}/${id}/reject`, { reason }),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-clinics'] }),
    });
};

export const useReopenClinic = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id) => axiosInstance.post(`${BASE}/${id}/reopen`),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-clinics'] }),
    });
};

export const useUpdateClinicStatus = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, status, rejectionReason }) =>
            axiosInstance.patch(`${BASE}/${id}/status`, { status, rejectionReason }),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-clinics'] }),
    });
};

export const useCreateClinic = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data) => axiosInstance.post(`${BASE}`, data),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-clinics'] }),
    });
};

export const useUpdateClinic = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, ...data }) => axiosInstance.put(`${BASE}/${id}`, data),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-clinics'] }),
    });
};

export const useDeleteClinic = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id) => axiosInstance.delete(`${BASE}/${id}`),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-clinics'] }),
    });
};
