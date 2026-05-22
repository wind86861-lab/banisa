import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Camera } from 'lucide-react';
import api from '../../shared/api/axios';
import { useUserAuth } from '../../shared/auth/UserAuthContext';
import { canCheckIn, awaitingCashier } from '../../shared/utils/appointmentStatus';
import './CheckInFab.css';

// Global floating "Klinikadaman" button. Shows when the patient has at least
// one booking that's eligible for check-in today. One tap → opens the scanner.
// Hidden on the scan page itself and on auth screens.
export default function CheckInFab() {
    const { user, isLoading: authLoading } = useUserAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const [dismissed, setDismissed] = useState(false);

    const HIDE_ON = ['/user/login', '/user/signup', '/user/scan-checkin', '/checkin/'];
    const hidden = HIDE_ON.some(p => location.pathname.startsWith(p)) || !user || authLoading;

    const { data } = useQuery({
        queryKey: ['user', 'appointments', 'fab-snapshot'],
        queryFn: async () => {
            const res = await api.get('/user/appointments?limit=50&page=1');
            return res.data?.data || [];
        },
        enabled: !hidden,
        refetchInterval: 60000,
        staleTime: 30000,
    });

    const eligible = (data || []).filter(a => canCheckIn(a) || awaitingCashier(a));

    useEffect(() => { setDismissed(false); }, [location.pathname]);

    if (hidden || eligible.length === 0 || dismissed) return null;

    const awaiting = eligible.find(awaitingCashier);
    const label = awaiting ? 'Kassani kuting' : 'Klinikadaman';
    const tone = awaiting ? 'cf-fab--info' : 'cf-fab--warn';

    return (
        <button
            className={`cf-fab ${tone}`}
            onClick={() => {
                if (awaiting) navigate(`/user/appointments/${awaiting.id}`);
                else navigate('/user/scan-checkin');
            }}
            aria-label={label}
        >
            <Camera size={20} />
            <span>{label}</span>
            {eligible.length > 1 && <span className="cf-fab-count">{eligible.length}</span>}
        </button>
    );
}
