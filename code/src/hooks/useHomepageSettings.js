import { useQuery } from '@tanstack/react-query';
import publicApi from '../shared/api/publicApi';
import axiosInstance from '../shared/api/axios';

export const useHomepageSettings = () => {
    return useQuery({
        queryKey: ['homepage-settings'],
        queryFn: async () => {
            const { data } = await publicApi.get('/homepage');
            return data.data;
        },
        staleTime: 1000 * 60 * 5,
        retry: false,
    });
};

export const useUpdateHomepageSection = () => {
    const updateSection = async (section, content) => {
        const { data } = await axiosInstance.put(`/homepage/${section}`, content);
        return data.data;
    };
    return { updateSection };
};
