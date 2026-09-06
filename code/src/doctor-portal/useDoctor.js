import { useQuery } from '@tanstack/react-query';
import api from '../shared/api/axios';
import publicApi from '../shared/api/publicApi';

// service.category → Recommendation ServiceType enum
export const CATEGORY_TO_TYPE = (cat) =>
    cat === 'operatsiya' || cat === 'jarrohlik' ? 'SURGICAL'
    : cat === 'sanatoriya' ? 'SANATORIUM'
    : cat === 'checkup' ? 'CHECKUP'
    : 'DIAGNOSTIC';

/** Raw Telegram Mini App initData — the credential the register endpoint verifies. */
export const getInitData = () =>
    (typeof window !== 'undefined' && window.Telegram?.WebApp?.initData) || '';

/** Parsed Telegram user (for prefilling name). No phone here — that comes from
 *  the shared contact, read off the logged-in account. */
export const getTelegramUser = () =>
    (typeof window !== 'undefined' && window.Telegram?.WebApp?.initDataUnsafe?.user) || null;

/** Upload one diploma/credential file (image or PDF). Returns its URL. */
export async function uploadDoctorDoc(file) {
    const fd = new FormData();
    fd.append('file', file);
    const { data } = await api.post('/upload/doctor-doc', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
    return data.data.url;
}

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

/** Check a patient by phone (must be bot-bound). */
export async function lookupPatient(phone) {
    const { data } = await api.get('/doctor/patient-lookup', { params: { phone } });
    return data.data;
}

export async function createRecommendation(payload) {
    const { data } = await api.post('/doctor/recommendations', payload);
    return data.data;
}

export function useMyRecommendations() {
    return useQuery({
        queryKey: ['doctor-recommendations'],
        queryFn: async () => (await api.get('/doctor/recommendations')).data.data,
    });
}

/** All active services (with clinic + price) — source for the builder. */
export function usePublicServicesForBuilder() {
    return useQuery({
        queryKey: ['builder-services'],
        queryFn: async () => (await publicApi.get('/public/services')).data.data,
        staleTime: 5 * 60 * 1000,
    });
}

/** Upload one image, returns its URL. */
export async function uploadDoctorImage(file) {
    const fd = new FormData();
    fd.append('image', file);
    const { data } = await api.post('/upload/image', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
    return data.data.url;
}
