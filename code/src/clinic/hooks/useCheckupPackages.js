import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../shared/api/axios';

export const useCheckupPackages = () => {
    return useQuery({
        queryKey: ['clinic', 'checkup-packages'],
        queryFn: async () => {
            const { data } = await api.get('/clinic/checkup-packages/available');
            return data.data;
        },
    });
};

export const useActivatePackage = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ packageId, clinicPrice, customNotes }) => {
            const { data } = await api.post('/clinic/checkup-packages/activate', {
                packageId,
                clinicPrice,
                customNotes,
            });
            return data.data;
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['clinic', 'checkup-packages'] }),
    });
};

export const useUpdatePackage = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, ...body }) => {
            const { data } = await api.patch(`/clinic/checkup-packages/${id}`, body);
            return data.data;
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['clinic', 'checkup-packages'] }),
    });
};

export const useDeactivatePackage = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id) => {
            const { data } = await api.delete(`/clinic/checkup-packages/${id}`);
            return data.data;
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['clinic', 'checkup-packages'] }),
    });
};
