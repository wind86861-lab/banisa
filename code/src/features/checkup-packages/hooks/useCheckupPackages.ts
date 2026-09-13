import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { checkupPackagesApi } from '../api/checkupPackagesApi';
import { CheckupPackageFilters, PublicCheckupPackageFilters } from '../types/checkupPackage.types';
import { toastBus } from '../../../shared/components/Toast';
// @ts-ignore — plain-JS shared helper, no .d.ts
import { panelApiError } from '../../../shared/utils/apiError';

// Mutations fired straight from a list row have no form to render an error in,
// so they toast. create/update are deliberately excluded: CheckupPackageForm
// shows those inline next to the Save button, where a modal can't cover them.
const toastOnError = (fallback: string) => (err: any) => toastBus.error(panelApiError(err, fallback));

// SUPER ADMIN HOOKS
export const useCheckupPackages = (filters: CheckupPackageFilters) => {
    return useQuery({
        queryKey: ['admin-checkup-packages', filters],
        queryFn: () => checkupPackagesApi.getAll(filters),
        staleTime: 5 * 60 * 1000,
    });
};

export const useCheckupPackage = (id: string) => {
    return useQuery({
        queryKey: ['admin-checkup-package', id],
        queryFn: () => checkupPackagesApi.getById(id),
        enabled: !!id,
    });
};

export const useCreateCheckupPackage = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: checkupPackagesApi.create,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-checkup-packages'] }),
    });
};

export const useUpdateCheckupPackage = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string, data: any }) => checkupPackagesApi.update(id, data),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-checkup-packages'] }),
    });
};

export const useDeleteCheckupPackage = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: checkupPackagesApi.delete,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-checkup-packages'] }),
        onError: toastOnError("Paketni o'chirib bo'lmadi"),
    });
};

export const useTogglePackageStatus = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, activate }: { id: string, activate: boolean }) => checkupPackagesApi.toggleStatus(id, activate),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-checkup-packages'] }),
        onError: toastOnError("Paket holatini o'zgartirib bo'lmadi"),
    });
};

// CLINIC ADMIN HOOKS
export const useClinicAvailablePackages = () => {
    return useQuery({
        queryKey: ['clinic-available-packages'],
        queryFn: () => checkupPackagesApi.getClinicAvailable(),
        staleTime: 5 * 60 * 1000,
    });
};

export const useClinicActivatedPackages = () => {
    return useQuery({
        queryKey: ['clinic-activated-packages'],
        queryFn: () => checkupPackagesApi.getClinicActivated(),
        staleTime: 5 * 60 * 1000,
    });
};

export const useActivateClinicPackage = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: checkupPackagesApi.activateForClinic,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['clinic-activated-packages'] });
            queryClient.invalidateQueries({ queryKey: ['clinic-available-packages'] });
        },
        onError: toastOnError("Paketni faollashtirib bo'lmadi"),
    });
};

export const useUpdateClinicPackage = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string, data: any }) => checkupPackagesApi.updateClinicPackage(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['clinic-activated-packages'] });
        },
        onError: toastOnError('Paket sozlamalarini saqlab bo\'lmadi'),
    });
};

// PUBLIC HOOKS
export const usePublicCheckupPackages = (filters: PublicCheckupPackageFilters) => {
    return useQuery({
        queryKey: ['public-checkup-packages', filters],
        queryFn: () => checkupPackagesApi.getPublicList(filters),
        enabled: !!filters.clinicId,
        staleTime: 5 * 60 * 1000,
    });
};
