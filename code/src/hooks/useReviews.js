import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../shared/api/axios';
import { tokenStorage } from '../shared/auth/tokenStorage';
import { userTokenStorage } from '../shared/auth/UserAuthContext';

// Check if any user is logged in — clinic/admin OR patient
const isAnyUserLoggedIn = () =>
    tokenStorage.isLoggedIn() || userTokenStorage.isLoggedIn();

// Get reviews for a service
export function useServiceReviews(serviceId, serviceType) {
    return useQuery({
        queryKey: ['reviews', serviceId, serviceType],
        queryFn: async () => {
            const { data } = await api.get(`/reviews/services/${serviceId}?serviceType=${serviceType}`);
            return data.data;
        },
        enabled: !!serviceId && !!serviceType,
    });
}

// Get user's own review for a service
export function useMyReview(serviceId, serviceType) {
    return useQuery({
        queryKey: ['myReview', serviceId, serviceType],
        queryFn: async () => {
            const { data } = await api.get(`/reviews/my-review/${serviceId}?serviceType=${serviceType}`);
            return data.data;
        },
        enabled: !!serviceId && !!serviceType && isAnyUserLoggedIn(),
        retry: false,
    });
}

// Submit a review
export function useSubmitReview() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ serviceId, serviceType, rating, comment }) => {
            const { data } = await api.post('/reviews', {
                serviceId,
                serviceType,
                rating,
                comment,
            });
            return data;
        },
        onSuccess: (data, variables) => {
            // Invalidate reviews query to refetch
            queryClient.invalidateQueries(['reviews', variables.serviceId, variables.serviceType]);
            queryClient.invalidateQueries(['myReview', variables.serviceId, variables.serviceType]);
        },
    });
}

// Admin: Get all reviews
export function useAllReviews(status, page = 1, limit = 20) {
    return useQuery({
        queryKey: ['allReviews', status, page, limit],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (status) params.append('status', status);
            params.append('page', page);
            params.append('limit', limit);

            const { data } = await api.get(`/reviews?${params.toString()}`);
            return data.data;
        },
    });
}

// Admin: Approve review
export function useApproveReview() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (reviewId) => {
            const { data } = await api.patch(`/reviews/${reviewId}/approve`);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['allReviews']);
        },
    });
}

// Admin: Reject review
export function useRejectReview() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ reviewId, rejectionReason }) => {
            const { data } = await api.patch(`/reviews/${reviewId}/reject`, {
                rejectionReason,
            });
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['allReviews']);
        },
    });
}

// Admin: Delete review
export function useDeleteReview() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (reviewId) => {
            const { data } = await api.delete(`/reviews/${reviewId}`);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['allReviews']);
        },
    });
}
