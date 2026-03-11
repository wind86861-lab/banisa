import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../shared/api/axios';

export const useWorkingHours = () => {
    return useQuery({
        queryKey: ['clinic', 'settings', 'working-hours'],
        queryFn: async () => {
            const { data } = await api.get('/clinic/settings/working-hours');
            return data.data;
        },
    });
};

export const useUpdateWorkingHours = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (hours) => {
            const { data } = await api.put('/clinic/settings/working-hours', hours);
            return data.data;
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['clinic', 'settings', 'working-hours'] }),
    });
};

export const useQueueSettings = () => {
    return useQuery({
        queryKey: ['clinic', 'settings', 'queue'],
        queryFn: async () => {
            const { data } = await api.get('/clinic/settings/queue');
            return data.data;
        },
    });
};

export const useUpdateQueueSettings = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (settings) => {
            const { data } = await api.put('/clinic/settings/queue', settings);
            return data.data;
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['clinic', 'settings', 'queue'] }),
    });
};
