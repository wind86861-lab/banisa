import { useState, useEffect } from 'react';
import { useSearchParams, Link, useLocation } from 'react-router-dom';
import {
    ShieldCheck, Lock, ArrowLeft, CheckCircle2,
    Building2, CalendarDays, Stethoscope,
    AlertTriangle, Loader2,
} from 'lucide-react';
import axiosInstance from '../../shared/api/axios';
import { friendlyApiError } from '../../shared/utils/apiError';
import './PaymePage.css';

// Checkout host depends on the clinic's Payme mode (live → checkout.paycom.uz,
// sandbox → checkout.test.paycom.uz). Merchant id is loaded from the clinic
// itself — using a hardcoded one routed every clinic's payment to Medilux's
// webhook URL.
const PAYME_CHECKOUT_LIVE = 'https://checkout.paycom.uz';
const PAYME_CHECKOUT_TEST = 'https://checkout.test.paycom.uz';

const fmt = (n) => new Intl.NumberFormat('uz-UZ').format(Number(n));

// ─── Main page ────────────────────────────────────────────────────────────────
export default function PaymePage() {
    const location = useLocation();
    const [params] = useSearchParams();

    const bookingData = location.state?.bookingData;

    const [orderId, setOrderId] = useState('');
    const [creatingAppointment, setCreatingAppointment] = useState(false);
    const [error, setError] = useState('');
    const [clinicPaymentMethods, setClinicPaymentMethods] = useState([]);
    const [paymeMerchantId, setPaymeMerchantId] = useState('');
    const [paymeIsTestMode, setPaymeIsTestMode] = useState(false);
    const [checkingClinic, setCheckingClinic] = useState(true);

    // Check if clinic supports Payme
    useEffect(() => {
        if (!bookingData?.clinicId) {
            setCheckingClinic(false);
            return;
        }

        axiosInstance.get(`/public/clinics/${bookingData.clinicId}`)
            .then(res => {
                const clinic = res.data.data;
                const methods = Array.isArray(clinic.paymentMethods) ? clinic.paymentMethods : [];
                setClinicPaymentMethods(methods);
                setPaymeMerchantId(clinic.paymeMerchantId || '');
                setPaymeIsTestMode(Boolean(clinic.paymeIsTestMode));

                if (!methods.includes('PAYME')) {
                    setError('Bu klinika onlayn to\'lovni qo\'llab-quvvatlamaydi. Iltimos, naqd to\'lov usulini tanlang.');
                } else if (!clinic.paymeMerchantId) {
                    setError('Klinikaning Payme sozlamasi to\'liq emas. Klinika administratoriga murojaat qiling.');
                }
            })
            .catch(err => {
                console.error('Failed to fetch clinic payment methods:', err);
                setError('Klinika ma\'lumotlarini yuklashda xatolik');
            })
            .finally(() => {
                setCheckingClinic(false);
            });
    }, [bookingData?.clinicId]);

    // Create appointment first, then use its real ID for Payme
    // If skipCreate is true (cart checkout already created it), use the provided appointmentId
    useEffect(() => {
        if (bookingData && !orderId && !creatingAppointment && !error) {
            if (bookingData.skipCreate && bookingData.appointmentId) {
                setOrderId(bookingData.appointmentId);
                return;
            }
            setCreatingAppointment(true);
            axiosInstance.post('/user/appointments', {
                clinicId: bookingData.clinicId,
                serviceType: bookingData.serviceType || 'DIAGNOSTIC',
                diagnosticServiceId: bookingData.diagnosticServiceId,
                surgicalServiceId: bookingData.surgicalServiceId,
                scheduledAt: bookingData.scheduledAt,
                notes: bookingData.notes || undefined,
                price: Number(bookingData.price),
            })
                .then(res => { setOrderId(res.data.data.id); })
                .catch(err => { setError(friendlyApiError(err, 'Bron yaratishda xatolik yuz berdi')); })
                .finally(() => { setCreatingAppointment(false); });
        }
    }, [bookingData, orderId, creatingAppointment, error, checkingClinic]);

    const amountUZS = bookingData?.price || parseInt(params.get('amount') || '0', 10);
    const amountTiyin = amountUZS * 100;
    const service = bookingData?.serviceName || params.get('service') || '';
    const clinic = bookingData?.clinicName || params.get('clinic') || '';
    const dateStr = bookingData?.selectedDate || params.get('date') || '';
    const timeStr = bookingData?.selectedTime || '';
    const dateLabel = dateStr
        ? `${new Date(dateStr).toLocaleDateString('uz-UZ', { day: '2-digit', month: 'long', year: 'numeric' })}${timeStr ? ', ' + timeStr : ''}`
        : '';
    const callbackUrl = `${window.location.origin}/payment/result?order_id=${orderId}`;
    const ready = !!orderId && amountUZS > 0;

    // ── Checking clinic screen ────────────────────────────────────────────────
    if (checkingClinic) {
        return (
            <div className="pay-root">
                <div className="pay-state-screen">
                    <Loader2 size={44} className="pay-spin" />
                    <h2>Klinika tekshirilmoqda</h2>
                    <p>Iltimos, kuting...</p>
                </div>
            </div>
        );
    }

    // ── Loading screen ────────────────────────────────────────────────────────
    if (creatingAppointment) {
        return (
            <div className="pay-root">
                <div className="pay-state-screen">
                    <Loader2 size={44} className="pay-spin" />
                    <h2>Bron yaratilmoqda</h2>
                    <p>Iltimos, kuting...</p>
                </div>
            </div>
        );
    }

    // ── Error screen ─────────────────────────────────────────────────────────
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

    // ── No booking data screen ────────────────────────────────────────────────
    if (!bookingData) {
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

    // ── Main payment screen ───────────────────────────────────────────────────
    return (
        <div className="pay-root">
            <div className="pay-wrap">

                {/* ── Top bar ── */}
                <div className="pay-topbar">
                    <Link to="/xizmatlar" className="pay-topbar-back">
                        <ArrowLeft size={16} /> Orqaga
                    </Link>
                    <div className="pay-topbar-secure">
                        <Lock size={13} /> Xavfsiz to'lov
                    </div>
                </div>

                {/* ── Card ── */}
                <div className="pay-card">

                    {/* Steps */}
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

                    {/* Order summary */}
                    <div className="pay-summary">
                        <div className="pay-summary-header">
                            <span className="pay-summary-id">#{orderId.slice(0, 8).toUpperCase()}</span>
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
                            <span className="pay-amount-sub">{fmt(amountTiyin)} tiyin</span>
                        </div>
                    </div>

                    {/* Pay with Payme — POST form (most secure: params not in URL) */}
                    <div className="pay-payme-section">
                        <div className="pay-payme-brand">
                            <div className="pay-payme-logo">P</div>
                            <div>
                                <strong>Payme</strong>
                                <span>paycom.uz orqali xavfsiz to'lov</span>
                            </div>
                        </div>

                        {/* POST form — field names per official Payme docs */}
                        <form method="POST" action={paymeIsTestMode ? PAYME_CHECKOUT_TEST : PAYME_CHECKOUT_LIVE}>
                            <input type="hidden" name="merchant" value={paymeMerchantId} />
                            <input type="hidden" name="amount" value={amountTiyin} />
                            <input type="hidden" name="account[order_id]" value={orderId} />
                            <input type="hidden" name="lang" value="uz" />
                            <input type="hidden" name="callback" value={callbackUrl} />
                            <button
                                type="submit"
                                className="pay-btn"
                                disabled={!ready || !paymeMerchantId}
                            >
                                {fmt(amountUZS)} so'm to'lash
                            </button>
                        </form>

                        <p className="pay-hint">Karta ma'lumotlari Payme xavfsiz sahifasida kiritiladi</p>
                    </div>

                    {/* Security row */}
                    <div className="pay-security">
                        <span><ShieldCheck size={13} /> SSL himoyalangan</span>
                        <span><Lock size={13} /> PCI DSS</span>
                        <span><CheckCircle2 size={13} /> Payme sertifikati</span>
                    </div>

                </div>

                <p className="pay-footer">
                    Banisa Medical · To'lovlar Payme (paycom.uz) orqali amalga oshiriladi
                </p>
            </div>
        </div>
    );
}
