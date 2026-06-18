import { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import {
    CheckCircle2, XCircle, Clock, AlertTriangle, Loader2,
    ArrowLeft, Home, RefreshCw, Building2, CalendarDays,
    Stethoscope, CreditCard, User,
} from 'lucide-react';
import axiosInstance from '../../shared/api/axios';
import './PaymePage.css';

const fmt = (n) => new Intl.NumberFormat('uz-UZ').format(Number(n));

export default function PaymentResultPage() {
    const [params] = useSearchParams();
    const navigate = useNavigate();
    const orderId = params.get('order_id');

    const [polling, setPolling] = useState(true);
    const [appointment, setAppointment] = useState(null);
    const [error, setError] = useState('');
    const [pollCount, setPollCount] = useState(0);
    const pollTimerRef = useRef(null);

    // Smart polling: check status every 1s for up to 15s
    useEffect(() => {
        if (!orderId) {
            setError('Buyurtma raqami topilmadi');
            setPolling(false);
            return;
        }

        const checkStatus = () => {
            axiosInstance.get(`/user/appointments/${orderId}`)
                .then(res => {
                    const appt = res.data.data;
                    setAppointment(appt);
                    setPollCount(prev => prev + 1);

                    // Stop polling if payment completed/failed or max attempts reached.
                    // Payment is tracked on `paymentStatus` (not `status`) in
                    // the simplified appointment model.
                    if (appt.paymentStatus === 'PAID' || appt.status === 'CANCELLED' || pollCount >= 15) {
                        setPolling(false);
                        if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
                    } else {
                        // Continue polling
                        pollTimerRef.current = setTimeout(checkStatus, 1000);
                    }
                })
                .catch(err => {
                    setError(err.response?.data?.error?.message || 'Buyurtma topilmadi');
                    setPolling(false);
                    if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
                });
        };

        checkStatus();

        return () => {
            if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
        };
    }, [orderId, pollCount]);

    const handleRetry = () => {
        if (!appointment) return;
        // Route the retry to whichever provider the original booking used.
        // CLICK has its own redirect-style page; everything else goes to
        // the existing Payme POST-form page.
        const target = appointment.paymentMethod === 'CLICK' ? '/payment/click' : '/payment';
        navigate(target, {
            state: {
                bookingData: {
                    skipCreate: true,
                    appointmentId: appointment.id,
                    price: appointment.price,
                    serviceName: appointment.diagnosticService?.nameUz || appointment.surgicalService?.nameUz,
                    clinicName: appointment.clinic?.nameUz,
                    selectedDate: appointment.scheduledAt,
                    clinicId: appointment.clinicId,
                    serviceType: appointment.serviceType,
                    diagnosticServiceId: appointment.diagnosticServiceId,
                    surgicalServiceId: appointment.surgicalServiceId,
                    scheduledAt: appointment.scheduledAt,
                },
            },
        });
    };

    const shortId = orderId ? `#${orderId.slice(0, 8).toUpperCase()}` : '';
    const isPaid = appointment?.paymentStatus === 'PAID';
    const isCancelled = appointment?.status === 'CANCELLED';
    const isPending = appointment && !isPaid && !isCancelled;

    const serviceName = appointment?.diagnosticService?.nameUz || appointment?.surgicalService?.nameUz || 'Xizmat';
    const clinicName = appointment?.clinic?.nameUz || '';
    const patientName = appointment?.patient ? `${appointment.patient.firstName || ''} ${appointment.patient.lastName || ''}`.trim() : '';
    const dateLabel = appointment?.scheduledAt
        ? new Date(appointment.scheduledAt).toLocaleDateString('uz-UZ', {
            day: '2-digit', month: 'long', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        })
        : '';

    // ── Loading / Polling ──
    if (polling) {
        return (
            <div className="pay-root">
                <div className="pay-wrap">
                    <div className="pay-result-card">
                        <div className="pay-result-icon pay-result-icon--loading">
                            <Loader2 size={48} className="pay-spin" />
                        </div>
                        <h2>To'lov holati tekshirilmoqda</h2>
                        <p className="pay-result-hint">Iltimos, kuting... ({pollCount}/15)</p>
                        {appointment && (
                            <div className="pay-result-status-badge pay-result-status-badge--pending">
                                <Clock size={14} /> {appointment.status}
                            </div>
                        )}
                    </div>
                    <p className="pay-footer">Banisa Medical · Payme to'lov tizimi</p>
                </div>
            </div>
        );
    }

    // ── Error ──
    if (error || !appointment) {
        return (
            <div className="pay-root">
                <div className="pay-wrap">
                    <div className="pay-result-card">
                        <div className="pay-result-icon pay-result-icon--error">
                            <AlertTriangle size={48} />
                        </div>
                        <h2>Xatolik yuz berdi</h2>
                        <p className="pay-result-text">{error || 'Buyurtma topilmadi'}</p>
                        <div className="pay-result-actions">
                            <Link to="/xizmatlar" className="pay-result-btn pay-result-btn--primary">
                                <Home size={16} /> Xizmatlarga qaytish
                            </Link>
                        </div>
                    </div>
                    <p className="pay-footer">Banisa Medical · Payme to'lov tizimi</p>
                </div>
            </div>
        );
    }

    // ── Success: Payment Completed ──
    if (isPaid) {
        return (
            <div className="pay-root">
                <div className="pay-wrap">
                    <div className="pay-result-card pay-result-card--success">
                        <div className="pay-result-icon pay-result-icon--success">
                            <CheckCircle2 size={64} />
                        </div>
                        <h1 className="pay-result-title">To'lov muvaffaqiyatli!</h1>
                        <p className="pay-result-text">
                            Sizning bronlaringiz tasdiqlandi. Tez orada operator siz bilan bog'lanadi.
                        </p>

                        <div className="pay-result-id-badge">{shortId}</div>

                        <div className="pay-result-details">
                            {patientName && (
                                <div className="pay-result-row">
                                    <User size={16} />
                                    <span className="pay-result-label">Bemor</span>
                                    <span className="pay-result-value">{patientName}</span>
                                </div>
                            )}
                            {clinicName && (
                                <div className="pay-result-row">
                                    <Building2 size={16} />
                                    <span className="pay-result-label">Klinika</span>
                                    <span className="pay-result-value">{clinicName}</span>
                                </div>
                            )}
                            <div className="pay-result-row">
                                <Stethoscope size={16} />
                                <span className="pay-result-label">Xizmat</span>
                                <span className="pay-result-value">{serviceName}</span>
                            </div>
                            {dateLabel && (
                                <div className="pay-result-row">
                                    <CalendarDays size={16} />
                                    <span className="pay-result-label">Sana va vaqt</span>
                                    <span className="pay-result-value">{dateLabel}</span>
                                </div>
                            )}
                            <div className="pay-result-row pay-result-row--highlight">
                                <CreditCard size={16} />
                                <span className="pay-result-label">To'lov summasi</span>
                                <span className="pay-result-value pay-result-amount">{fmt(appointment.price)} so'm</span>
                            </div>
                            <div className="pay-result-row">
                                <span className="pay-result-label">To'lov usuli</span>
                                <span className="pay-result-value">
                                    {appointment.paymentMethod === 'CLICK' ? 'CLICK' : 'Payme'}
                                </span>
                            </div>
                        </div>

                        <div className="pay-result-actions">
                            <Link to="/profile/appointments" className="pay-result-btn pay-result-btn--primary">
                                Mening bronlarim
                            </Link>
                            <Link to="/xizmatlar" className="pay-result-btn pay-result-btn--ghost">
                                <Home size={16} /> Bosh sahifa
                            </Link>
                        </div>
                    </div>
                    <p className="pay-footer">Banisa Medical · Payme to'lov tizimi</p>
                </div>
            </div>
        );
    }

    // ── Failed: Payment Cancelled ──
    if (isCancelled) {
        return (
            <div className="pay-root">
                <div className="pay-wrap">
                    <div className="pay-result-card pay-result-card--error">
                        <div className="pay-result-icon pay-result-icon--error">
                            <XCircle size={64} />
                        </div>
                        <h1 className="pay-result-title">To'lov amalga oshmadi</h1>
                        <p className="pay-result-text">
                            {appointment.cancelReason || 'To\'lov jarayoni bekor qilindi yoki xatolik yuz berdi. Qayta urinib ko\'ring.'}
                        </p>

                        <div className="pay-result-id-badge pay-result-id-badge--error">{shortId}</div>

                        <div className="pay-result-details">
                            <div className="pay-result-row">
                                <Stethoscope size={16} />
                                <span className="pay-result-label">Xizmat</span>
                                <span className="pay-result-value">{serviceName}</span>
                            </div>
                            {clinicName && (
                                <div className="pay-result-row">
                                    <Building2 size={16} />
                                    <span className="pay-result-label">Klinika</span>
                                    <span className="pay-result-value">{clinicName}</span>
                                </div>
                            )}
                            <div className="pay-result-row">
                                <CreditCard size={16} />
                                <span className="pay-result-label">Summa</span>
                                <span className="pay-result-value">{fmt(appointment.price)} so'm</span>
                            </div>
                        </div>

                        <div className="pay-result-actions">
                            <button onClick={handleRetry} className="pay-result-btn pay-result-btn--primary">
                                <RefreshCw size={16} /> Qayta urinish
                            </button>
                            <Link to="/xizmatlar" className="pay-result-btn pay-result-btn--ghost">
                                <ArrowLeft size={16} /> Orqaga
                            </Link>
                        </div>
                    </div>
                    <p className="pay-footer">Banisa Medical · Payme to'lov tizimi</p>
                </div>
            </div>
        );
    }

    // ── Pending: Payment Not Yet Confirmed ──
    return (
        <div className="pay-root">
            <div className="pay-wrap">
                <div className="pay-result-card pay-result-card--pending">
                    <div className="pay-result-icon pay-result-icon--pending">
                        <Clock size={64} />
                    </div>
                    <h1 className="pay-result-title">To'lov kutilmoqda</h1>
                    <p className="pay-result-text">
                        To'lov hali tasdiqlanmadi. Agar to'lovni amalga oshirgan bo'lsangiz, bir necha daqiqa kuting.
                    </p>

                    <div className="pay-result-id-badge pay-result-id-badge--pending">{shortId}</div>

                    <div className="pay-result-details">
                        <div className="pay-result-row">
                            <span className="pay-result-label">Holat</span>
                            <span className="pay-result-value">{appointment.status}</span>
                        </div>
                        <div className="pay-result-row">
                            <Stethoscope size={16} />
                            <span className="pay-result-label">Xizmat</span>
                            <span className="pay-result-value">{serviceName}</span>
                        </div>
                        <div className="pay-result-row">
                            <CreditCard size={16} />
                            <span className="pay-result-label">Summa</span>
                            <span className="pay-result-value">{fmt(appointment.price)} so'm</span>
                        </div>
                    </div>

                    <div className="pay-result-actions">
                        <button onClick={() => window.location.reload()} className="pay-result-btn pay-result-btn--primary">
                            <RefreshCw size={16} /> Holatni yangilash
                        </button>
                        <Link to="/profile/appointments" className="pay-result-btn pay-result-btn--ghost">
                            Mening bronlarim
                        </Link>
                    </div>
                </div>
                <p className="pay-footer">Banisa Medical · Payme to'lov tizimi</p>
            </div>
        </div>
    );
}
