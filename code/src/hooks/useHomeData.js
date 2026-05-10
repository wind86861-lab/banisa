import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import api from '../shared/api/axios';

const publicApi = axios.create({ baseURL: '/api' });

export function useHomeData() {
    return useQuery({
        queryKey: ['public', 'home'],
        queryFn: async () => {
            const { data } = await publicApi.get('/public/home');
            return data.data;
        },
        staleTime: 2 * 60 * 1000,
    });
}

export function useHomeAutocomplete(q) {
    return useQuery({
        queryKey: ['public', 'autocomplete', q],
        queryFn: async () => {
            const { data } = await publicApi.get('/public/search/autocomplete', { params: { q } });
            return data.data;
        },
        enabled: Boolean(q && q.trim().length >= 2),
        staleTime: 30 * 1000,
    });
}

export function useUserHomeSummary(enabled = true) {
    return useQuery({
        queryKey: ['user', 'home-summary'],
        queryFn: async () => {
            const { data } = await api.get('/user/home-summary');
            return data.data;
        },
        enabled: Boolean(enabled),
        staleTime: 60 * 1000,
    });
}
