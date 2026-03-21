import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../shared/api/axios';

export const useSanatoriumServices = (filters = {}) => {
    return useQuery({
        queryKey: ['clinic', 'sanatorium-services', filters],
        queryFn: async () => {
            const params = {};
            if (filters.search) params.search = filters.search;
            if (filters.categoryId) params.categoryId = filters.categoryId;
            const { data } = await api.get('/clinic/sanatorium-services/available', { params });
            return data.data;
        },
    });
};

export const useActivateSanatoriumService = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ serviceId, clinicPrice }) => {
            const { data } = await api.post('/clinic/sanatorium-services/activate', { serviceId, clinicPrice });
            return data.data;
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['clinic', 'sanatorium-services'] }),
    });
};

export const useDeactivateSanatoriumService = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (serviceId) => {
            const { data } = await api.delete(`/clinic/sanatorium-services/${serviceId}`);
            return data.data;
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['clinic', 'sanatorium-services'] }),
    });
};
