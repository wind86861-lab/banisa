import { useQuery } from '@tanstack/react-query';
import api from '../shared/api/axios';

/** Raw Telegram Mini App initData — the credential the register endpoint verifies. */
export const getInitData = () =>
    (typeof window !== 'undefined' && window.Telegram?.WebApp?.initData) || '';

/** Register the current Telegram user as a doctor. Returns { accessToken, user }. */
export async function registerDoctor(payload) {
    const { data } = await api.post('/doctor/register', { initData: getInitData(), ...payload });
    return data.data;
}

/** Doctor's own profile + approval status. */
export function useMyDoctor(enabled = true) {
    return useQuery({
        queryKey: ['doctor-me'],
        queryFn: async () => (await api.get('/doctor/me')).data.data,
        enabled,
        retry: false,
    });
}

export async function updateMyDoctor(patch) {
    const { data } = await api.patch('/doctor/me', patch);
    return data.data;
}

/** Upload one image, returns its URL. */
export async function uploadDoctorImage(file) {
    const fd = new FormData();
    fd.append('image', file);
    const { data } = await api.post('/upload/image', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
    return data.data.url;
}
