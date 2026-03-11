import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../shared/api/axios';

export const useClinicServices = (filters = {}) => {
    return useQuery({
        queryKey: ['clinic', 'services', filters],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (filters.search)     params.append('search',     filters.search);
            if (filters.categoryId) params.append('categoryId', filters.categoryId);
            if (filters.onlyActive) params.append('onlyActive', 'true');
            const { data } = await api.get(`/clinic/services/available?${params}`);
            return data.data;
        },
    });
};

export const useActivateService = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (serviceId) => {
            const { data } = await api.post('/clinic/services/activate', { serviceId });
            return data.data;
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['clinic', 'services'] }),
    });
};

export const useDeactivateService = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (serviceId) => {
            const { data } = await api.delete(`/clinic/services/${serviceId}`);
            return data.data;
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['clinic', 'services'] }),
    });
};
