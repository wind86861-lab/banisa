import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../shared/api/axios';

export function useCreateAppointment() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (data) => {
            const res = await api.post('/user/appointments', data);
            return res.data.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['user', 'appointments'] });
        },
    });
}

export function useAvailableSlots(clinicId, serviceId, date) {
    return useQuery({
        queryKey: ['slots', clinicId, serviceId, date],
        queryFn: async () => {
            try {
                const params = new URLSearchParams();
                if (date) params.set('date', date);
                if (serviceId) params.set('serviceId', serviceId);
                const res = await api.get(`/public/clinics/${clinicId}/slots?${params}`);
                return res.data.data || [];
            } catch {
                return generateMockSlots();
            }
        },
        enabled: !!clinicId && !!date,
        staleTime: 5 * 60 * 1000,
    });
}

function generateMockSlots() {
    const slots = [];
    for (let h = 9; h < 17; h++) {
        for (let m = 0; m < 60; m += 30) {
            slots.push({
                time: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`,
                available: Math.random() > 0.3,
            });
        }
    }
    return slots;
}

export function useBookingState() {
    const [state, setState] = useState({
        step: 1,
        selectedClinic: null,
        selectedDate: null,
        selectedTime: null,
        notes: '',
        paymentMethod: 'card',
    });

    const update = (patch) => setState((prev) => ({ ...prev, ...patch }));
    const nextStep = () => setState((prev) => ({ ...prev, step: Math.min(3, prev.step + 1) }));
    const prevStep = () => setState((prev) => ({ ...prev, step: Math.max(1, prev.step - 1) }));
    const reset = () => setState({ step: 1, selectedClinic: null, selectedDate: null, selectedTime: null, notes: '', paymentMethod: 'card' });

    return { state, update, nextStep, prevStep, reset };
}
