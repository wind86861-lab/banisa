import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

// Get reviews for a service
export function useServiceReviews(serviceId, serviceType) {
    return useQuery({
        queryKey: ['reviews', serviceId, serviceType],
        queryFn: async () => {
            const { data } = await axios.get(`/api/reviews/services/${serviceId}?serviceType=${serviceType}`);
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
            const { data } = await axios.get(`/api/reviews/my-review/${serviceId}?serviceType=${serviceType}`);
            return data.data;
        },
        enabled: !!serviceId && !!serviceType,
    });
}

// Submit a review
export function useSubmitReview() {
    const queryClient = useQueryClient();
    
    return useMutation({
        mutationFn: async ({ serviceId, serviceType, rating, comment }) => {
            const { data } = await axios.post('/api/reviews', {
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
            
            const { data } = await axios.get(`/api/reviews?${params.toString()}`);
            return data.data;
        },
    });
}

// Admin: Approve review
export function useApproveReview() {
    const queryClient = useQueryClient();
    
    return useMutation({
        mutationFn: async (reviewId) => {
            const { data } = await axios.patch(`/api/reviews/${reviewId}/approve`);
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
            const { data } = await axios.patch(`/api/reviews/${reviewId}/reject`, {
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
            const { data } = await axios.delete(`/api/reviews/${reviewId}`);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['allReviews']);
        },
    });
}
