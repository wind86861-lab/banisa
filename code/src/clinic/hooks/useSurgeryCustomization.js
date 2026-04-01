import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../shared/api/axios';

export const useSurgeryCustomization = (surgeryId) => {
    return useQuery({
        queryKey: ['clinic', 'surgery-customization', surgeryId],
        queryFn: async () => {
            const { data } = await api.get(`/clinic/surgical-services/${surgeryId}/customization`);
            return data.data;
        },
        enabled: !!surgeryId,
    });
};

export const useUpsertSurgeryCustomization = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ surgeryId, data: formData }) => {
            const { data } = await api.put(`/clinic/surgical-services/${surgeryId}/customization`, formData);
            return data.data;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['clinic', 'surgery-customization', variables.surgeryId] });
            queryClient.invalidateQueries({ queryKey: ['clinic', 'surgical-services'] });
        },
    });
};

export const useDeleteSurgeryCustomization = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (surgeryId) => {
            const { data } = await api.delete(`/clinic/surgical-services/${surgeryId}/customization`);
            return data.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['clinic', 'surgical-services'] });
            queryClient.invalidateQueries({ queryKey: ['clinic', 'surgery-customization'] });
        },
    });
};
