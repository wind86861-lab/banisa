import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../shared/api/axios';

export const useSurgicalServices = (filters = {}) => {
    return useQuery({
        queryKey: ['clinic', 'surgical-services', filters],
        queryFn: async () => {
            const params = {};
            if (filters.search) params.search = filters.search;
            if (filters.categoryId) params.categoryId = filters.categoryId;
            const { data } = await api.get('/clinic/surgical-services/available', { params });
            return data.data;
        },
    });
};

export const useActivateSurgicalService = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (serviceId) => {
            const { data } = await api.post('/clinic/surgical-services/activate', { serviceId });
            return data.data;
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['clinic', 'surgical-services'] }),
    });
};

export const useDeactivateSurgicalService = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (serviceId) => {
            const { data } = await api.delete(`/clinic/surgical-services/${serviceId}`);
            return data.data;
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['clinic', 'surgical-services'] }),
    });
};
