import { useQuery } from '@tanstack/react-query';
import publicApi from '../shared/api/publicApi';

/**
 * Fetch all publicly active clinic services with images, clinic info and location.
 * Uses the backend /api/public/services endpoint (no auth required).
 */
export const usePublicServices = () => {
    return useQuery({
        queryKey: ['public-services'],
        queryFn: async () => {
            const { data } = await publicApi.get('/public/services');
            return data.data || [];
        },
        // 60s instead of 5min — clinic admins activate/deactivate / change
        // prices in real time and patients shouldn't have to wait up to
        // five minutes to see a fresh listing.
        staleTime: 60 * 1000,
        refetchOnWindowFocus: true,
    });
};
