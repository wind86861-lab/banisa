import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useUserAuth } from '../../shared/auth/UserAuthContext';
import axiosInstance from '../../shared/api/axios';
import { shortBookingNo } from '../../shared/utils/format';
import BookingQr from '../../user/components/BookingQr';
import './CheckIn.css';

// Stop the silent spinner and offer "call clinic" after this long.
const CASHIER_TIMEOUT_TICKS = 36; // 36 × 5s ≈ 3 min

// Short success cue — single tone, no external assets.
function playSuccessChime() {
    try {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        const ctx = new AC();
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(1320, now + 0.18);
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.25, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
        osc.connect(gain).connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.4);
    } catch { /* sound is non-essential */ }
}

/**
 * /checkin/:clinicSecret
 *
 * Patient scans the clinic's wall QR → this page does ONE round-trip
 * to /user/appointments/scan-checkin. Backend resolves clinic from secret
 * and decides:
 *   - kind=checked_in → success ticket (poll for cash confirm)
 *   - kind=already    → success ticket (idempotent)
 *   - kind=multiple   → user picks → POST /:id/patient-checkin
 *   - kind=none       → "no booking at this clinic"
 */
export default function PatientCheckInPage() {
    const { clinicSecret } = useParams();
    const navigate = useNavigate();
    const { user, isLoading: authLoading } = useUserAuth();

    const [step, setStep] = useState('loading'); // loading | login | select | confirming | success | paid | error
    const [clinic, setClinic] = useState(null);
    const [pickList, setPickList] = useState([]);
    const [result, setResult] = useState(null);
    const [errMsg, setErrMsg] = useState('');
    const [alreadyChecked, setAlreadyChecked] = useState(false);
    const [waitedLong, setWaitedLong] = useState(false);
    const pollRef = useRef(null);
    const tickCountRef = useRef(0);

    // Resolve QR + check in (or pick) once auth is ready.
    useEffect(() => {
        if (authLoading) return;
        if (!user) { setStep('login'); return; }
        scan();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [authLoading, user]);

    const scan = async () => {
        setStep('loading');
        try {
            const res = await axiosInstance.post('/user/appointments/scan-checkin', { secret: clinicSecret });
            const data = res.data?.data;
            handleResult(data);
        } catch (e) {
            setErrMsg(e.response?.data?.error?.message || e.response?.data?.message || 'Check-in xatoligi');
            setStep('error');
        }
    };

    const handleResult = (data) => {
        if (!data) { setErrMsg('Javob topilmadi'); setStep('error'); return; }
        if (data.clinic) setClinic(data.clinic);

        if (data.kind === 'none') {
            setErrMsg(`${data.clinic?.nameUz || 'Bu klinika'}da bugun siz uchun bron topilmadi.`);
            setStep('error');
        } else if (data.kind === 'multiple') {
            setPickList(data.appointments || []);
            setStep('select');
        } else {
            // checked_in or already → both go to success ticket
            setAlreadyChecked(data.kind === 'already');
            setResult(data.appointment);
            const isPaid = data.appointment?.paymentStatus === 'PAID';
            setStep(isPaid ? 'paid' : 'success');
            // Audible + haptic confirmation of successful scan.
            playSuccessChime();
            if (navigator.vibrate) { try { navigator.vibrate([60, 40, 60]); } catch { /* ignore */ } }
        }
    };

    const pickAppointment = async (appt) => {
        setStep('confirming');
        try {
            const res = await axiosInstance.post(`/user/appointments/${appt.id}/patient-checkin`, { clinicSecret });
            setResult(res.data?.data);
            setStep('success');
        } catch (e) {
            setErrMsg(e.response?.data?.error?.message || e.response?.data?.message || 'Check-in xatoligi');
            setStep('error');
        }
    };

    const checkStatusOnce = async () => {
        if (!result?.id) return;
        try {
            const res = await axiosInstance.get(`/user/appointments/${result.id}`);
            const a = res.data?.data;
            if (a && (a.status === 'COMPLETED' || a.paymentStatus === 'PAID')) {
                setResult((prev) => ({ ...prev, ...a }));
                setStep('paid');
            }
        } catch { /* keep polling */ }
    };

    // Poll appointment status while on success — flips to "paid" when reception
    // confirms cash. After ~3 min of waiting, surface a "call clinic" fallback
    // instead of an endless silent spinner.
    useEffect(() => {
        if (step !== 'success' || !result?.id) return;
        tickCountRef.current = 0;
        setWaitedLong(false);
        const tick = async () => {
            tickCountRef.current += 1;
            if (tickCountRef.current >= CASHIER_TIMEOUT_TICKS) setWaitedLong(true);
            await checkStatusOnce();
        };
        pollRef.current = setInterval(tick, 5000);
        return () => { if (pollRef.current) clearInterval(pollRef.current); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [step, result?.id]);

    const manualRefresh = async () => {
        tickCountRef.current = 0;
        setWaitedLong(false);
        await checkStatusOnce();
    };

    const fmtDate = (d) => new Date(d).toLocaleDateString('uz-UZ', { day: '2-digit', month: 'short', year: 'numeric' });
    const fmt = (n) => n ? Number(n).toLocaleString('en-US').replace(/,/g, ' ') : '0';

    if (step === 'loading' || authLoading) return (
        <div className="ci-page"><div className="ci-spinner" /></div>
    );

    if (step === 'login') {
        const redirect = encodeURIComponent(`/checkin/${clinicSecret}`);
        return (
            <div className="ci-page">
                <div className="ci-card">
                    <div className="ci-icon">🔒</div>
                    <h2>Kirish talab qilinadi</h2>
                    <p>Check-in qilish uchun avval Banisa hisobingizga kiring yoki ro'yxatdan o'ting.</p>
                    <button className="ci-btn-primary" onClick={() => navigate(`/user/login?redirect=${redirect}`)}>
                        Kirish
                    </button>
                    <button className="ci-btn-secondary" onClick={() => navigate(`/user/signup?redirect=${redirect}`)}>
                        Ro'yxatdan o'tish
                    </button>
                    <p className="ci-login-hint">Tizimga kirgach, sahifa avtomatik check-in qiladi.</p>
                </div>
            </div>
        );
    }

    if (step === 'select') return (
        <div className="ci-page">
            <div className="ci-card ci-card--wide">
                <div className="ci-icon">✅</div>
                <h2>Bronni tanlang</h2>
                {clinic && <p style={{ color: '#64748b', fontSize: 13, marginTop: -8 }}>{clinic.nameUz}</p>}
                <div className="ci-appt-list">
                    {pickList.map(a => (
                        <button key={a.id} className="ci-appt-item" onClick={() => pickAppointment(a)}>
                            <div className="ci-appt-title">
                                {a.diagnosticService?.nameUz || a.surgicalService?.nameUz || a.checkupPackage?.nameUz || 'Xizmat'}
                            </div>
                            <div className="ci-appt-meta">
                                <span>📅 {fmtDate(a.scheduledAt)}</span>
                                <span>💰 {fmt(a.finalPrice || a.price)} so'm</span>
                            </div>
                            <div className="ci-appt-badge">Tasdiqlash →</div>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );

    if (step === 'confirming') return (
        <div className="ci-page"><div className="ci-spinner" /><p className="ci-loading-text">Tasdiqlanmoqda...</p></div>
    );

    if (step === 'success' && result) {
        const original = Number(result.price || 0);
        const finalP = Number(result.finalPrice || result.price || 0);
        const discount = Math.max(0, original - finalP);
        const discountPct = result.discountPercent || (original > 0 ? Math.round((discount / original) * 100) : 0);

        const clinicPhone = (Array.isArray(result?.clinic?.phones) && result.clinic.phones[0])
            || (Array.isArray(clinic?.phones) && clinic.phones[0]) || null;

        return (
            <div className="ci-page">
                <div className="ci-card ci-card--awaiting">
                    <div className="ci-success-icon ci-icon--awaiting">✓</div>
                    <h2>Kelishingiz tasdiqlandi!</h2>
                    {alreadyChecked && (
                        <p className="ci-already-note">Siz allaqachon check-in qilgansiz.</p>
                    )}

                    <div className="ci-qr-block">
                        <BookingQr appointmentId={result.id} size={210} />
                        <span className="ci-qr-caption">
                            Kassirga shu QR kodni ko'rsating — u skanerlab naqd to'lovni tasdiqlaydi
                        </span>
                    </div>

                    <div className="ci-price-card">
                        {discount > 0 && (
                            <>
                                <div className="ci-price-row">
                                    <span>Asl narx</span>
                                    <span className="ci-price-original">{fmt(original)} so'm</span>
                                </div>
                                <div className="ci-price-row ci-price-discount">
                                    <span>Chegirma{discountPct ? ` (${discountPct}%)` : ''}</span>
                                    <span>−{fmt(discount)} so'm</span>
                                </div>
                            </>
                        )}
                        <div className="ci-price-final-row">
                            <span>To'lov summasi</span>
                            <strong>{fmt(finalP)} so'm</strong>
                        </div>
                        <div className="ci-price-method">💰 Naqd — kassada</div>
                    </div>

                    <div className="ci-booking-info">
                        <div className="ci-booking-row"><span>Bron raqami</span><strong style={{ fontSize: 18 }}>{shortBookingNo(result.bookingNumber)}</strong></div>
                        <div className="ci-booking-row"><span>Klinika</span><strong>{result.clinic?.nameUz}</strong></div>
                    </div>

                    {!waitedLong ? (
                        <div className="ci-polling">
                            <span className="ci-polling-dot" />
                            <span>Kassirning tasdiqlashi kutilmoqda...</span>
                        </div>
                    ) : (
                        <div className="ci-wait-fallback">
                            <p>Tasdiqlash kutilganidan uzoq davom etmoqda.</p>
                            {clinicPhone && (
                                <a className="ci-btn-primary" href={`tel:${clinicPhone}`}>
                                    📞 Klinikaga qo'ng'iroq qilish
                                </a>
                            )}
                            <button className="ci-btn-secondary" onClick={manualRefresh}>
                                Holatni yangilash
                            </button>
                        </div>
                    )}

                    <button className="ci-btn-secondary" onClick={() => navigate(`/user/appointments/${result.id}`)} style={{ marginTop: 8 }}>
                        Bron tafsilotlariga o'tish
                    </button>
                </div>
            </div>
        );
    }

    if (step === 'paid' && result) {
        const finalP = Number(result.finalPrice || result.price || 0);
        return (
            <div className="ci-page">
                <div className="ci-card ci-card--success">
                    <div className="ci-success-icon" style={{ background: '#10b981' }}>✓</div>
                    <h2>To'lov qabul qilindi</h2>
                    {alreadyChecked && (
                        <p className="ci-already-note">Siz allaqachon check-in qilgansiz.</p>
                    )}
                    <p className="ci-success-sub">Xizmat xonasiga o'ting — sizni shifokor kutmoqda.</p>
                    <div className="ci-price-card">
                        <div className="ci-price-final-row">
                            <span>To'langan</span>
                            <strong style={{ color: '#10b981' }}>{fmt(finalP)} so'm</strong>
                        </div>
                    </div>
                    <div className="ci-booking-info">
                        <div className="ci-booking-row"><span>Bron №</span><strong>{result.bookingNumber}</strong></div>
                        <div className="ci-booking-row"><span>Klinika</span><strong>{result.clinic?.nameUz}</strong></div>
                    </div>
                    <button className="ci-btn-primary" onClick={() => navigate(`/user/appointments/${result.id}`)}>
                        Bron tafsilotlari
                    </button>
                </div>
            </div>
        );
    }

    if (step === 'error') return (
        <div className="ci-page">
            <div className="ci-card ci-card--error">
                <div className="ci-icon">⚠️</div>
                <h2>Bron topilmadi</h2>
                <p>{errMsg}</p>
                <button className="ci-btn-primary" onClick={() => navigate('/user/appointments')}>
                    Bronlarimga qaytish
                </button>
            </div>
        </div>
    );

    return null;
}
