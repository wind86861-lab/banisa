import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import api from '../../shared/api/axios';
import { useUserAuth } from '../../shared/auth/UserAuthContext';

// Patient-only favorites. Returns a Set for O(1) membership checks.
export function useFavoriteIds() {
    const { user } = useUserAuth();
    const enabled = !!user && user.role === 'PATIENT';
    const q = useQuery({
        queryKey: ['user', 'favorites', 'ids'],
        queryFn: async () => {
            const res = await api.get('/user/favorites/ids');
            return res.data?.data || [];
        },
        enabled,
        staleTime: 60_000,
    });
    const set = useMemo(() => {
        const s = new Set();
        (q.data || []).forEach(r => s.add(`${r.serviceType}:${r.serviceId}`));
        return s;
    }, [q.data]);
    return { set, isLoading: q.isLoading };
}

export function useToggleFavorite() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({ serviceType, serviceId }) => {
            const res = await api.post('/user/favorites/toggle', { serviceType, serviceId });
            return res.data?.data;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['user', 'favorites'] });
            qc.invalidateQueries({ queryKey: ['user', 'favorites', 'ids'] });
        },
    });
}
