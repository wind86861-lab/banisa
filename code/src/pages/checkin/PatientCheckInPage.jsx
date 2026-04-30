import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useUserAuth } from '../../shared/auth/UserAuthContext';
import axiosInstance from '../../shared/api/axios';
import { Html5Qrcode } from 'html5-qrcode';
import './CheckIn.css';

/**
 * /checkin/:clinicSecret
 *
 * Opened when patient scans the clinic's wall QR.
 * 1. Ensure patient is logged in
 * 2. Request GPS (soft — skip on deny)
 * 3. Load patient's active PENDING_ARRIVAL appointments
 * 4. Show which appointment(s) to check-in
 * 5. POST /api/user/appointments/:id/patient-checkin
 * 6. Show success screen with patient's appointment QR
 */
export default function PatientCheckInPage() {
    const { clinicSecret } = useParams();
    const navigate = useNavigate();
    const { user } = useUserAuth();

    const [step, setStep] = useState('loading'); // loading | login | gps | select | confirming | success | error
    const [appointments, setAppointments] = useState([]);
    const [selected, setSelected] = useState(null);
    const [gps, setGps] = useState(null);
    const [gpsSkipped, setGpsSkipped] = useState(false);
    const [clinicName, setClinicName] = useState('');
    const [result, setResult] = useState(null);
    const [errMsg, setErrMsg] = useState('');

    // Step 1: auth check
    useEffect(() => {
        if (!user) {
            setStep('login');
            return;
        }
        fetchAppointments();
    }, [user]);

    const fetchAppointments = async () => {
        try {
            const res = await axiosInstance.get('/user/appointments?status=PENDING_ARRIVAL&limit=10');
            const items = res.data?.data?.items || res.data?.data || [];
            if (items.length === 0) {
                setErrMsg('Klinikaga kelish kutilayotgan bronlaringiz topilmadi.');
                setStep('error');
                return;
            }
            setAppointments(items);
            if (items[0]?.clinic?.nameUz) setClinicName(items[0].clinic.nameUz);
            setStep('gps');
        } catch {
            setErrMsg('Bronlaringizni yuklashda xatolik.');
            setStep('error');
        }
    };

    const requestGps = () => {
        if (!navigator.geolocation) { setGpsSkipped(true); setStep('select'); return; }
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                setStep('select');
            },
            () => { setGpsSkipped(true); setStep('select'); },
            { timeout: 8000 }
        );
    };

    const skipGps = () => { setGpsSkipped(true); setStep('select'); };

    const doCheckIn = async (appt) => {
        setSelected(appt);
        setStep('confirming');
        try {
            const body = { clinicSecret };
            if (gps) { body.lat = gps.lat; body.lng = gps.lng; }
            const res = await axiosInstance.post(`/user/appointments/${appt.id}/patient-checkin`, body);
            setResult(res.data?.data);
            setStep('success');
        } catch (e) {
            setErrMsg(e.response?.data?.error?.message || e.response?.data?.message || 'Check-in xatoligi');
            setStep('error');
        }
    };

    const fmtDate = (d) => new Date(d).toLocaleDateString('uz-UZ', { day: '2-digit', month: 'short', year: 'numeric' });
    const fmt = (n) => n ? Number(n).toLocaleString('en-US').replace(/,/g, '\u00A0') : '0';

    if (step === 'login') return (
        <div className="ci-page">
            <div className="ci-card">
                <div className="ci-icon">🔒</div>
                <h2>Kirish talab qilinadi</h2>
                <p>Check-in qilish uchun avval Banisa hisobingizga kiring.</p>
                <button className="ci-btn-primary" onClick={() => navigate(`/user/login?redirect=/checkin/${clinicSecret}`)}>
                    Kirish
                </button>
            </div>
        </div>
    );

    if (step === 'loading') return (
        <div className="ci-page"><div className="ci-spinner" /></div>
    );

    if (step === 'gps') return (
        <div className="ci-page">
            <div className="ci-card">
                <div className="ci-icon">📍</div>
                <h2>Joylashuvingizni ulashing</h2>
                <p>Klinikada ekanligingizni tasdiqlash uchun GPS yordam beradi. Bu ixtiyoriy.</p>
                <button className="ci-btn-primary" onClick={requestGps}>📍 Joylashuvni ulashish</button>
                <button className="ci-btn-ghost" onClick={skipGps}>O'tkazib yuborish</button>
            </div>
        </div>
    );

    if (step === 'select') return (
        <div className="ci-page">
            <div className="ci-card ci-card--wide">
                <div className="ci-icon">✅</div>
                <h2>Bronni tanlang</h2>
                {gpsSkipped && <p className="ci-gps-note">📍 GPS almashilmadi — xodim tasdiqlaydi.</p>}
                <div className="ci-appt-list">
                    {appointments.map(a => (
                        <button key={a.id} className="ci-appt-item" onClick={() => doCheckIn(a)}>
                            <div className="ci-appt-title">{a.diagnosticService?.nameUz || a.surgicalService?.nameUz || a.clinic?.nameUz || 'Xizmat'}</div>
                            <div className="ci-appt-meta">
                                <span>🏥 {a.clinic?.nameUz}</span>
                                <span>📅 {fmtDate(a.scheduledAt)}</span>
                                <span>💰 {fmt(a.finalPrice || a.price)} so'm</span>
                            </div>
                            <div className="ci-appt-badge">Kelish tasdiqlash →</div>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );

    if (step === 'confirming') return (
        <div className="ci-page"><div className="ci-spinner" /><p className="ci-loading-text">Tasdiqlanmoqda...</p></div>
    );

    if (step === 'success' && result) return (
        <div className="ci-page">
            <div className="ci-card ci-card--success">
                <div className="ci-success-icon">✓</div>
                <h2>Kelishingiz tasdiqlandi!</h2>
                <p className="ci-success-sub">Xodimga quyidagi ekranni ko'rsating — ular QR ni skanlaydi va naqd to'lovni qabul qiladi.</p>

                <div className="ci-booking-info">
                    <div className="ci-booking-row"><span>Bron №</span><strong>{result.bookingNumber}</strong></div>
                    <div className="ci-booking-row"><span>Klinika</span><strong>{result.clinic?.nameUz}</strong></div>
                    <div className="ci-booking-row"><span>To'lov</span><strong>{fmt(result.finalPrice || result.price)} so'm (naqd)</strong></div>
                </div>

                <div className="ci-qr-wrap">
                    <img
                        src={`/api/user/appointments/${result.id}/qr.png`}
                        alt="Bemor QR"
                        className="ci-qr-img"
                    />
                    <p className="ci-qr-hint">Xodimga shu QR ni ko'rsating</p>
                </div>

                <button className="ci-btn-primary" onClick={() => navigate(`/user/appointments/${result.id}`)}>
                    Bron tafsilotlarini ko'rish
                </button>
            </div>
        </div>
    );

    if (step === 'error') return (
        <div className="ci-page">
            <div className="ci-card ci-card--error">
                <div className="ci-icon">⚠️</div>
                <h2>Xatolik</h2>
                <p>{errMsg}</p>
                <button className="ci-btn-primary" onClick={() => navigate('/user/appointments')}>
                    Bronlarimga qaytish
                </button>
            </div>
        </div>
    );

    return null;
}
