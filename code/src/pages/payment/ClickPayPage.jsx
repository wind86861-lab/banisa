import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
    Lock, ArrowLeft, AlertTriangle, Loader2,
    Building2, CalendarDays, Stethoscope, ShieldCheck, CheckCircle2,
} from 'lucide-react';
import axiosInstance from '../../shared/api/axios';
import { friendlyApiError } from '../../shared/utils/apiError';
import './PaymePage.css';

const fmt = (n) => new Intl.NumberFormat('uz-UZ').format(Number(n));

// CLICK is a redirect-style payment: we ask the backend for the my.click.uz
// URL and bounce the browser there. There's no embedded card form on our side
// (unlike Payme's checkout.paycom.uz POST form). The user comes back to
// /payment/result?order_id=... once CLICK is done.
export default function ClickPayPage() {
    const location = useLocation();
    const bookingData = location.state?.bookingData;
    const appointmentId = bookingData?.appointmentId;

    const [error, setError] = useState('');
    const [redirecting, setRedirecting] = useState(false);
    const [paymentUrl, setPaymentUrl] = useState('');
    const [isTestMode, setIsTestMode] = useState(false);

    useEffect(() => {
        if (!appointmentId) return;
        let cancelled = false;
        axiosInstance.post('/click/initiate', { appointmentId })
            .then(res => {
                if (cancelled) return;
                const data = res.data?.data;
                if (!data?.paymentUrl) {
                    setError("To'lov havolasini olishda xato");
                    return;
                }
                setPaymentUrl(data.paymentUrl);
                setIsTestMode(!!data.isTestMode);
            })
            .catch(err => {
                if (cancelled) return;
                setError(friendlyApiError(err, "CLICK ulanishida xatolik"));
            });
        return () => { cancelled = true; };
    }, [appointmentId]);

    const handleGo = () => {
        if (!paymentUrl) return;
        setRedirecting(true);
        window.location.href = paymentUrl;
    };

    const amountUZS = bookingData?.price || 0;
    const service = bookingData?.serviceName || '';
    const clinic = bookingData?.clinicName || '';
    const dateStr = bookingData?.selectedDate || '';
    const timeStr = bookingData?.selectedTime || '';
    const dateLabel = dateStr
        ? `${new Date(dateStr).toLocaleDateString('uz-UZ', { day: '2-digit', month: 'long', year: 'numeric' })}${timeStr ? ', ' + timeStr : ''}`
        : '';

    if (!bookingData || !appointmentId) {
        return (
            <div className="pay-root">
                <div className="pay-state-screen">
                    <AlertTriangle size={44} className="pay-icon-err" />
                    <h2>Buyurtma topilmadi</h2>
                    <p>To'lov sahifasiga to'g'ridan-to'g'ri kirmang.</p>
                    <Link to="/xizmatlar" className="pay-back-btn">
                        <ArrowLeft size={15} /> Xizmatlarga qaytish
                    </Link>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="pay-root">
                <div className="pay-state-screen">
                    <AlertTriangle size={44} className="pay-icon-err" />
                    <h2>Xatolik yuz berdi</h2>
                    <p>{error}</p>
                    <Link to="/xizmatlar" className="pay-back-btn">
                        <ArrowLeft size={15} /> Xizmatlarga qaytish
                    </Link>
                </div>
            </div>
        );
    }

    if (!paymentUrl) {
        return (
            <div className="pay-root">
                <div className="pay-state-screen">
                    <Loader2 size={44} className="pay-spin" />
                    <h2>CLICK tayyorlanmoqda</h2>
                    <p>Iltimos, kuting...</p>
                </div>
            </div>
        );
    }

    if (redirecting) {
        return (
            <div className="pay-root">
                <div className="pay-state-screen">
                    <Loader2 size={44} className="pay-spin" />
                    <h2>CLICK'ga o'tilmoqda</h2>
                    <p>Karta ma'lumotlari CLICK xavfsiz sahifasida kiritiladi.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="pay-root">
            <div className="pay-wrap">
                <div className="pay-topbar">
                    <Link to="/xizmatlar" className="pay-topbar-back">
                        <ArrowLeft size={16} /> Orqaga
                    </Link>
                    <div className="pay-topbar-secure">
                        <Lock size={13} /> Xavfsiz to'lov
                    </div>
                </div>

                <div className="pay-card">
                    <div className="pay-steps">
                        <div className="pay-step done">
                            <CheckCircle2 size={16} /><span>Bron</span>
                        </div>
                        <div className="pay-step-line" />
                        <div className="pay-step active">
                            <div className="pay-step-dot">2</div><span>To'lov</span>
                        </div>
                        <div className="pay-step-line" />
                        <div className="pay-step">
                            <div className="pay-step-dot">3</div><span>Tasdiqlash</span>
                        </div>
                    </div>

                    <div className="pay-summary">
                        <div className="pay-summary-header">
                            <span className="pay-summary-id">#{appointmentId.slice(0, 8).toUpperCase()}</span>
                            <span className="pay-summary-badge">
                                <CheckCircle2 size={12} /> Bron tasdiqlandi
                            </span>
                        </div>

                        <div className="pay-summary-rows">
                            {clinic && (
                                <div className="pay-summary-row">
                                    <Building2 size={15} />
                                    <div>
                                        <span className="pay-row-label">Klinika</span>
                                        <span className="pay-row-val">{clinic}</span>
                                    </div>
                                </div>
                            )}
                            {service && (
                                <div className="pay-summary-row">
                                    <Stethoscope size={15} />
                                    <div>
                                        <span className="pay-row-label">Xizmat</span>
                                        <span className="pay-row-val">{service}</span>
                                    </div>
                                </div>
                            )}
                            {dateLabel && (
                                <div className="pay-summary-row">
                                    <CalendarDays size={15} />
                                    <div>
                                        <span className="pay-row-label">Sana va vaqt</span>
                                        <span className="pay-row-val">{dateLabel}</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="pay-amount-box">
                            <span className="pay-amount-label">Jami to'lov</span>
                            <span className="pay-amount">{fmt(amountUZS)} so'm</span>
                            {isTestMode && (
                                <span className="pay-amount-sub" style={{ color: '#b45309' }}>
                                    TEST rejimi — real pul yechilmaydi
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="pay-payme-section">
                        <div className="pay-payme-brand">
                            <div className="pay-payme-logo" style={{ background: '#0078d4' }}>C</div>
                            <div>
                                <strong>CLICK</strong>
                                <span>my.click.uz orqali xavfsiz to'lov</span>
                            </div>
                        </div>

                        <button
                            type="button"
                            className="pay-btn"
                            onClick={handleGo}
                            disabled={!paymentUrl}
                            style={{ background: '#0078d4' }}
                        >
                            {fmt(amountUZS)} so'm to'lash
                        </button>

                        <p className="pay-hint">CLICK sahifasida UzCard, HUMO yoki Visa qabul qilinadi</p>
                    </div>

                    <div className="pay-security">
                        <span><ShieldCheck size={13} /> SSL himoyalangan</span>
                        <span><Lock size={13} /> PCI DSS</span>
                        <span><CheckCircle2 size={13} /> CLICK sertifikati</span>
                    </div>
                </div>

                <p className="pay-footer">
                    Banisa Medical · To'lovlar CLICK (my.click.uz) orqali amalga oshiriladi
                </p>
            </div>
        </div>
    );
}
