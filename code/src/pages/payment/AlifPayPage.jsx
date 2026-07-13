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

// Alif (Nasiya) is a redirect payment: the backend creates an invoice and
// returns the checkout.alifpay.uz URL where the customer picks card or Nasiya
// installment. Returns to /payment/result?order_id=... when done.
export default function AlifPayPage() {
    const location = useLocation();
    const bookingData = location.state?.bookingData;
    const appointmentId = bookingData?.appointmentId;

    const [error, setError] = useState('');
    const [redirecting, setRedirecting] = useState(false);
    const [checkoutUrl, setCheckoutUrl] = useState('');
    const [isTestMode, setIsTestMode] = useState(false);

    useEffect(() => {
        if (!appointmentId) return;
        let cancelled = false;
        axiosInstance.post('/alif/initiate', { appointmentId })
            .then(res => {
                if (cancelled) return;
                const data = res.data?.data;
                if (!data?.checkoutUrl) { setError("To'lov havolasini olishda xato"); return; }
                setCheckoutUrl(data.checkoutUrl);
                setIsTestMode(!!data.isTestMode);
            })
            .catch(err => { if (!cancelled) setError(friendlyApiError(err, 'Alif ulanishida xatolik')); });
        return () => { cancelled = true; };
    }, [appointmentId]);

    const handleGo = () => { if (!checkoutUrl) return; setRedirecting(true); window.location.href = checkoutUrl; };

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
            <div className="pay-root"><div className="pay-state-screen">
                <AlertTriangle size={44} className="pay-icon-err" />
                <h2>Buyurtma topilmadi</h2>
                <p>To'lov sahifasiga to'g'ridan-to'g'ri kirmang.</p>
                <Link to="/xizmatlar" className="pay-back-btn"><ArrowLeft size={15} /> Xizmatlarga qaytish</Link>
            </div></div>
        );
    }
    if (error) {
        return (
            <div className="pay-root"><div className="pay-state-screen">
                <AlertTriangle size={44} className="pay-icon-err" />
                <h2>Xatolik yuz berdi</h2><p>{error}</p>
                <Link to="/xizmatlar" className="pay-back-btn"><ArrowLeft size={15} /> Xizmatlarga qaytish</Link>
            </div></div>
        );
    }
    if (!checkoutUrl) {
        return (
            <div className="pay-root"><div className="pay-state-screen">
                <Loader2 size={44} className="pay-spin" />
                <h2>Alif tayyorlanmoqda</h2><p>Iltimos, kuting...</p>
            </div></div>
        );
    }
    if (redirecting) {
        return (
            <div className="pay-root"><div className="pay-state-screen">
                <Loader2 size={44} className="pay-spin" />
                <h2>Alif'ga o'tilmoqda</h2><p>Karta yoki Nasiya Alif xavfsiz sahifasida tanlanadi.</p>
            </div></div>
        );
    }

    return (
        <div className="pay-root">
            <div className="pay-wrap">
                <div className="pay-topbar">
                    <Link to="/xizmatlar" className="pay-topbar-back"><ArrowLeft size={16} /> Orqaga</Link>
                    <div className="pay-topbar-secure"><Lock size={13} /> Xavfsiz to'lov</div>
                </div>

                <div className="pay-card">
                    <div className="pay-steps">
                        <div className="pay-step done"><CheckCircle2 size={16} /><span>Bron</span></div>
                        <div className="pay-step-line" />
                        <div className="pay-step active"><div className="pay-step-dot">2</div><span>To'lov</span></div>
                        <div className="pay-step-line" />
                        <div className="pay-step"><div className="pay-step-dot">3</div><span>Tasdiqlash</span></div>
                    </div>

                    <div className="pay-summary">
                        <div className="pay-summary-header">
                            <span className="pay-summary-id">#{appointmentId.slice(0, 8).toUpperCase()}</span>
                            <span className="pay-summary-badge"><CheckCircle2 size={12} /> Bron tasdiqlandi</span>
                        </div>
                        <div className="pay-summary-rows">
                            {clinic && <div className="pay-summary-row"><Building2 size={15} /><div><span className="pay-row-label">Klinika</span><span className="pay-row-val">{clinic}</span></div></div>}
                            {service && <div className="pay-summary-row"><Stethoscope size={15} /><div><span className="pay-row-label">Xizmat</span><span className="pay-row-val">{service}</span></div></div>}
                            {dateLabel && <div className="pay-summary-row"><CalendarDays size={15} /><div><span className="pay-row-label">Sana va vaqt</span><span className="pay-row-val">{dateLabel}</span></div></div>}
                        </div>
                        <div className="pay-amount-box">
                            <span className="pay-amount-label">Jami to'lov</span>
                            <span className="pay-amount">{fmt(amountUZS)} so'm</span>
                            {isTestMode && <span className="pay-amount-sub" style={{ color: '#b45309' }}>TEST rejimi — real pul yechilmaydi</span>}
                        </div>
                    </div>

                    <div className="pay-payme-section">
                        <div className="pay-payme-brand">
                            <div className="pay-payme-logo" style={{ background: '#7c3aed' }}>A</div>
                            <div><strong>Alif Nasiya</strong><span>alifpay.uz — karta yoki muddatli to'lov</span></div>
                        </div>
                        <button type="button" className="pay-btn" onClick={handleGo} disabled={!checkoutUrl} style={{ background: '#7c3aed' }}>
                            {fmt(amountUZS)} so'm — Alif'ga o'tish
                        </button>
                        <p className="pay-hint">Alif sahifasida karta yoki Nasiya (muddatli to'lov) tanlanadi</p>
                    </div>

                    <div className="pay-security">
                        <span><ShieldCheck size={13} /> SSL himoyalangan</span>
                        <span><Lock size={13} /> Alif xavfsiz</span>
                        <span><CheckCircle2 size={13} /> Nasiya imkoni</span>
                    </div>
                </div>

                <p className="pay-footer">Banisa Medical · To'lovlar Alif (alifpay.uz) orqali amalga oshiriladi</p>
            </div>
        </div>
    );
}
