import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

const publicApi = axios.create({ baseURL: '/api' });

export function usePublicClinics(filters = {}) {
    return useQuery({
        queryKey: ['public', 'clinics', filters],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (filters.search) params.set('search', filters.search);
            if (filters.city) params.set('city', filters.city);
            if (filters.type) params.set('type', filters.type);
            if (filters.rating) params.set('rating', String(filters.rating));
            if (filters.isOpen) params.set('isOpen', 'true');
            if (filters.sort) params.set('sort', filters.sort);
            params.set('page', String(filters.page || 1));
            params.set('limit', String(filters.limit || 12));
            const { data } = await publicApi.get(`/public/clinics?${params}`);
            return data;
        },
        placeholderData: (prev) => prev,
    });
}

export function usePublicClinicDetail(clinicId) {
    return useQuery({
        queryKey: ['public', 'clinic', clinicId],
        queryFn: async () => {
            const { data } = await publicApi.get(`/public/clinics/${clinicId}`);
            return data.data;
        },
        enabled: !!clinicId,
        staleTime: 2 * 60 * 1000,
    });
}
