import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../shared/api/axios';

// ─── GET customization for a clinic service ─────────────────────────────────
export const useServiceCustomization = (clinicServiceId, options = {}) => {
    return useQuery({
        queryKey: ['clinic', 'service', clinicServiceId, 'customization'],
        queryFn: async () => {
            const { data } = await api.get(
                `/clinic/services/${clinicServiceId}/customization`,
            );
            return data.data;
        },
        enabled: !!clinicServiceId,
        ...options,
    });
};

// ─── UPSERT customization ───────────────────────────────────────────────────
export const useUpsertCustomization = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({ clinicServiceId, data }) => {
            const res = await api.put(
                `/clinic/services/${clinicServiceId}/customization`,
                data,
            );
            return res.data.data;
        },
        onSuccess: (_data, variables) => {
            qc.invalidateQueries({ queryKey: ['clinic', 'service', variables.clinicServiceId, 'customization'] });
            qc.invalidateQueries({ queryKey: ['clinic', 'services'] });
        },
    });
};

// ─── DELETE customization ───────────────────────────────────────────────────
export const useDeleteCustomization = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (clinicServiceId) => {
            const res = await api.delete(
                `/clinic/services/${clinicServiceId}/customization`,
            );
            return res.data;
        },
        onSuccess: (_data, clinicServiceId) => {
            qc.invalidateQueries({ queryKey: ['clinic', 'service', clinicServiceId, 'customization'] });
            qc.invalidateQueries({ queryKey: ['clinic', 'services'] });
        },
    });
};

// ─── UPLOAD image ───────────────────────────────────────────────────────────
export const useUploadServiceImage = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({ clinicServiceId, file, alt }) => {
            const formData = new FormData();
            formData.append('image', file);
            if (alt) formData.append('alt', alt);
            const res = await api.post(
                `/clinic/services/${clinicServiceId}/customization/images`,
                formData,
                { headers: { 'Content-Type': 'multipart/form-data' } },
            );
            return res.data.data;
        },
        onSuccess: (_data, variables) => {
            qc.invalidateQueries({ queryKey: ['clinic', 'service', variables.clinicServiceId, 'customization'] });
        },
    });
};

// ─── DELETE image ───────────────────────────────────────────────────────────
export const useDeleteServiceImage = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({ clinicServiceId, imageId }) => {
            const res = await api.delete(
                `/clinic/services/${clinicServiceId}/customization/images/${imageId}`,
            );
            return res.data;
        },
        onSuccess: (_data, variables) => {
            qc.invalidateQueries({ queryKey: ['clinic', 'service', variables.clinicServiceId, 'customization'] });
        },
    });
};

// ─── SET primary image ──────────────────────────────────────────────────────
export const useSetPrimaryImage = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({ clinicServiceId, imageId }) => {
            const res = await api.put(
                `/clinic/services/${clinicServiceId}/customization/images/${imageId}/primary`,
            );
            return res.data;
        },
        onSuccess: (_data, variables) => {
            qc.invalidateQueries({ queryKey: ['clinic', 'service', variables.clinicServiceId, 'customization'] });
        },
    });
};

// ─── REORDER images ─────────────────────────────────────────────────────────
export const useReorderImages = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({ clinicServiceId, imageIds }) => {
            const res = await api.put(
                `/clinic/services/${clinicServiceId}/customization/images/reorder`,
                { imageIds },
            );
            return res.data;
        },
        onSuccess: (_data, variables) => {
            qc.invalidateQueries({ queryKey: ['clinic', 'service', variables.clinicServiceId, 'customization'] });
        },
    });
};
