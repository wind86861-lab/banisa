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
// 30 s poll so bot-side accepts (clinic admin taps the inline button in
// Telegram) reflect in the web list within a tab focus, instead of leaving
// a stale "Qabul qilish" button that 400s when the operator clicks it.
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
        refetchInterval: 30_000,
        refetchOnWindowFocus: true,
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
        mutationFn: async ({ id, note }) => {
            const { data } = await api.post(`/clinic/appointments/${id}/complete`, { note });
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

// Per-patient stats at this clinic — drives the "Mijoz tarixi" block
// in the booking drawer (returning vs new, last visit, total paid).
export const usePatientStats = (patientId) =>
    useQuery({
        queryKey: ['clinic', 'patient-stats', patientId],
        queryFn: async () => {
            const { data } = await api.get(`/clinic/appointments/patient-stats/${patientId}`);
            return data.data;
        },
        enabled: !!patientId,
        staleTime: 60_000,
    });

// Backwards-compatible wrapper for old ClinicBookings page — maps old statuses to new actions
export const useUpdateBookingStatus = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, status }) => {
            let endpoint;
            switch (status) {
                case 'CONFIRMED':
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
            // POST with an explicit empty object — without a body Express
            // leaves req.body as undefined, and the zod schemas wrapping
            // these endpoints (clinicAcceptSchema, clinicCompleteSchema, …)
            // require body to be an object. Sending {} satisfies the
            // optional-field schemas without needing a per-action payload.
            const { data } = await api.post(endpoint, {});
            return data.data;
        },
        onSuccess: () => invalidateBookings(qc),
    });
};

export const useConfirmCash = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, amount, note }) => {
            const { data } = await api.post(`/clinic/appointments/${id}/confirm-cash`, { amount, note });
            return data.data;
        },
        onSuccess: () => invalidateBookings(qc),
    });
};

