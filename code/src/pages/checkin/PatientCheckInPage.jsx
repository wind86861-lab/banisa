import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useUserAuth } from '../../shared/auth/UserAuthContext';
import axiosInstance from '../../shared/api/axios';
import { shortBookingNo } from '../../shared/utils/format';
import { friendlyApiError } from '../../shared/utils/apiError';
import './CheckIn.css';

// Stop the silent spinner and offer "call clinic" after this long.
const CASHIER_TIMEOUT_TICKS = 36; // 36 × 5s ≈ 3 min

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
 * Unified post-scan result page. Backend decides everything from the secret:
 *   - kind=checked_in / already → success (split by paymentStatus)
 *   - kind=none → no eligible booking at this clinic
 */
export default function PatientCheckInPage() {
    const { clinicSecret } = useParams();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { user, isLoading: authLoading } = useUserAuth();

    const [step, setStep] = useState('loading'); // loading | login | pick | awaiting-cash | paid | error
    const [result, setResult] = useState(null);
    const [pickList, setPickList] = useState([]);
    const [picking, setPicking] = useState(false);
    const [clinicInfo, setClinicInfo] = useState(null);
    const [errMsg, setErrMsg] = useState('');
    const [alreadyChecked, setAlreadyChecked] = useState(false);
    const [waitedLong, setWaitedLong] = useState(false);
    const pollRef = useRef(null);
    const tickCountRef = useRef(0);

    const geo = (() => {
        const lat = searchParams.get('lat');
        const lng = searchParams.get('lng');
        return (lat && lng) ? { lat: Number(lat), lng: Number(lng) } : null;
    })();

    const handleData = (data) => {
        if (!data) { setErrMsg('Javob topilmadi'); setStep('error'); return; }
        if (data.clinic) setClinicInfo(data.clinic);

        if (data.kind === 'none') {
            setErrMsg(`${data.clinic?.nameUz || 'Bu klinika'}da bugun siz uchun bron topilmadi.`);
            setStep('error');
            return;
        }
        if (data.kind === 'multiple') {
            setPickList(data.appointments || []);
            setStep('pick');
            return;
        }
        setAlreadyChecked(data.kind === 'already');
        setResult(data.appointment);
        const isPaid = data.appointment?.paymentStatus === 'PAID';
        setStep(isPaid ? 'paid' : 'awaiting-cash');
        playSuccessChime();
        if (navigator.vibrate) { try { navigator.vibrate([60, 40, 60]); } catch { /* ignore */ } }
    };

    useEffect(() => {
        if (authLoading) return;
        if (!user) { setStep('login'); return; }
        (async () => {
            try {
                const body = { secret: clinicSecret };
                if (geo) { body.lat = geo.lat; body.lng = geo.lng; }
                const res = await axiosInstance.post('/user/appointments/scan-checkin', body);
                handleData(res.data?.data);
            } catch (e) {
                setErrMsg(friendlyApiError(e, 'Check-in xatoligi'));
                setStep('error');
            }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [authLoading, user]);

    const pickBooking = async (appointmentId) => {
        setPicking(true);
        try {
            const body = { secret: clinicSecret, appointmentId };
            if (geo) { body.lat = geo.lat; body.lng = geo.lng; }
            const res = await axiosInstance.post('/user/appointments/scan-checkin/pick', body);
            const appt = res.data?.data;
            setResult(appt);
            setStep(appt?.paymentStatus === 'PAID' ? 'paid' : 'awaiting-cash');
            playSuccessChime();
        } catch (e) {
            setErrMsg(friendlyApiError(e, 'Check-in xatoligi'));
            setStep('error');
        } finally {
            setPicking(false);
        }
    };

    // Poll while waiting for cashier — flips to "paid" when clinic admin confirms cash.
    useEffect(() => {
        if (step !== 'awaiting-cash' || !result?.id) return;
        tickCountRef.current = 0;
        setWaitedLong(false);
        const tick = async () => {
            tickCountRef.current += 1;
            if (tickCountRef.current >= CASHIER_TIMEOUT_TICKS) setWaitedLong(true);
            try {
                const res = await axiosInstance.get(`/user/appointments/${result.id}`);
                const a = res.data?.data;
                if (a && a.paymentStatus === 'PAID') {
                    setResult((prev) => ({ ...prev, ...a }));
                    setStep('paid');
                }
            } catch { /* keep polling */ }
        };
        pollRef.current = setInterval(tick, 5000);
        return () => { if (pollRef.current) clearInterval(pollRef.current); };
    }, [step, result?.id]);

    const manualRefresh = async () => {
        if (!result?.id) return;
        tickCountRef.current = 0;
        setWaitedLong(false);
        try {
            const res = await axiosInstance.get(`/user/appointments/${result.id}`);
            const a = res.data?.data;
            if (a && a.paymentStatus === 'PAID') {
                setResult((prev) => ({ ...prev, ...a }));
                setStep('paid');
            }
        } catch { /* ignore */ }
    };

    const fmt = (n) => n ? Number(n).toLocaleString('en-US').replace(/,/g, ' ') : '0';

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

    if (step === 'pick') {
        const fmtDate = (d) => new Date(d).toLocaleString('uz-UZ', {
            day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
        });
        return (
            <div className="ci-page">
                <div className="ci-card ci-card--wide">
                    <div className="ci-icon">📋</div>
                    <h2>Qaysi bron uchun?</h2>
                    {clinicInfo?.nameUz && (
                        <p style={{ color: '#64748b', fontSize: 13, marginTop: -8 }}>{clinicInfo.nameUz}</p>
                    )}
                    <div className="ci-appt-list">
                        {pickList.map(a => {
                            const svc = a.diagnosticService?.nameUz || a.surgicalService?.nameUz || 'Xizmat';
                            const price = a.finalPrice || a.price || 0;
                            const isCash = a.paymentMethod === 'CASH';
                            const isPaid = a.paymentStatus === 'PAID';
                            return (
                                <button
                                    key={a.id}
                                    className="ci-appt-item"
                                    onClick={() => pickBooking(a.id)}
                                    disabled={picking}
                                >
                                    <div className="ci-appt-title">{svc}</div>
                                    <div className="ci-appt-meta">
                                        <span>📅 {fmtDate(a.scheduledAt)}</span>
                                        <span>{isPaid ? '✅ To\'langan' : isCash ? `💵 Naqd ${fmt(price)} so'm` : `💳 ${fmt(price)} so'm`}</span>
                                    </div>
                                    <div className="ci-appt-badge">{picking ? 'Yuborilmoqda...' : 'Tanlash →'}</div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    }

    if (step === 'awaiting-cash' && result) {
        const original = Number(result.price || 0);
        const finalP = Number(result.finalPrice || result.price || 0);
        const discount = Math.max(0, original - finalP);
        const discountPct = result.discountPercent || (original > 0 ? Math.round((discount / original) * 100) : 0);
        const clinicPhone = Array.isArray(result?.clinic?.phones) && result.clinic.phones[0];

        return (
            <div className="ci-page">
                <div className="ci-card ci-card--awaiting">
                    <div className="ci-success-icon ci-icon--awaiting">✓</div>
                    <h2>Kelishingiz tasdiqlandi</h2>
                    {alreadyChecked && (
                        <p className="ci-already-note">Siz allaqachon check-in qilgansiz.</p>
                    )}

                    <div className="ci-cashier-instruct">
                        <div className="ci-cashier-emoji">💵</div>
                        <div>
                            <div className="ci-cashier-title">Kassaga yo'naling</div>
                            <div className="ci-cashier-sub">Naqd to'lovni amalga oshiring</div>
                        </div>
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
                    </div>

                    <div className="ci-booking-info">
                        <div className="ci-booking-row"><span>Bron raqami</span><strong style={{ fontSize: 18 }}>{shortBookingNo(result.bookingNumber)}</strong></div>
                        <div className="ci-booking-row"><span>Klinika</span><strong>{result.clinic?.nameUz}</strong></div>
                    </div>

                    {!waitedLong ? (
                        <div className="ci-polling">
                            <span className="ci-polling-dot" />
                            <span>Kassir tasdiqi kutilmoqda...</span>
                        </div>
                    ) : (
                        <div className="ci-wait-fallback">
                            <p>Tasdiqlash biroz cho'zilmoqda. Klinikaga qo'ng'iroq qilib aniqlashishingiz mumkin.</p>
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
                        Bron tafsilotlari
                    </button>
                </div>
            </div>
        );
    }

    if (step === 'paid' && result) {
        const finalP = Number(result.finalPrice || result.price || 0);
        const clinicPhone = Array.isArray(result?.clinic?.phones) && result.clinic.phones[0];
        return (
            <div className="ci-page">
                <div className="ci-card ci-card--success">
                    <div className="ci-success-icon" style={{ background: '#10b981' }}>✓</div>
                    <h2>Xush kelibsiz! 🎉</h2>
                    {alreadyChecked && (
                        <p className="ci-already-note">Siz allaqachon check-in qilgansiz.</p>
                    )}
                    <p className="ci-success-sub">
                        Xizmat xonasiga o'ting — sizni shifokor kutmoqda.<br/>
                        <strong>Bron raqami:</strong> {shortBookingNo(result.bookingNumber)}
                    </p>
                    <div className="ci-price-card">
                        <div className="ci-price-final-row">
                            <span>To'langan</span>
                            <strong style={{ color: '#10b981' }}>{fmt(finalP)} so'm</strong>
                        </div>
                    </div>
                    <div className="ci-booking-info">
                        <div className="ci-booking-row"><span>Klinika</span><strong>{result.clinic?.nameUz}</strong></div>
                    </div>
                    <button className="ci-btn-primary" onClick={() => navigate(`/user/appointments/${result.id}`)}>
                        Yaxshi, tushundim ✓
                    </button>
                </div>
            </div>
        );
    }

    if (step === 'error') return (
        <div className="ci-page">
            <div className="ci-card ci-card--error">
                <div className="ci-icon">😕</div>
                <h2>Bir narsa noto'g'ri ketdi</h2>
                <p>{errMsg}</p>
                <button className="ci-btn-primary" onClick={() => navigate('/user/appointments')}>
                    Bronlarimga qaytish
                </button>
                <button className="ci-btn-secondary" onClick={() => navigate('/user/scan-checkin')} style={{ marginTop: 8 }}>
                    Qaytadan skanerlash
                </button>
            </div>
        </div>
    );

    return null;
}
