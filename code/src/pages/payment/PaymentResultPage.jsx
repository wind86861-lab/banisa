import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import {
    CheckCircle2, XCircle, Clock, AlertTriangle, Loader2,
    ArrowLeft, Home, RefreshCw, Building2, CalendarDays,
    Stethoscope, CreditCard, User,
} from 'lucide-react';
import axiosInstance from '../../shared/api/axios';
import './PaymePage.css';

const fmt = (n) => new Intl.NumberFormat('uz-UZ').format(Number(n));

const MAX_POLLS = 15;
const POLL_INTERVAL_MS = 1000;

export default function PaymentResultPage() {
    const [params] = useSearchParams();
    const navigate = useNavigate();
    const orderId = params.get('order_id');

    const [polling, setPolling] = useState(true);
    const [appointment, setAppointment] = useState(null);
    const [error, setError] = useState('');
    const [pollCount, setPollCount] = useState(0);
    const pollCountRef = useRef(0);
    const pollTimerRef = useRef(null);
    const cancelledRef = useRef(false);

    // Hits the lightweight /payment-status endpoint; the full appointment
    // is fetched once after polling resolves so we have data for the
    // result screen.
    const fetchFullAppointment = useCallback(async () => {
        try {
            const res = await axiosInstance.get(`/user/appointments/${orderId}`);
            if (!cancelledRef.current) setAppointment(res.data.data);
        } catch (err) {
            if (!cancelledRef.current) {
                setError(err.response?.data?.error?.message || 'Buyurtma topilmadi');
            }
        }
    }, [orderId]);

    // Stable polling loop. Earlier this lived inside a useEffect whose deps
    // included pollCount — every tick re-mounted the effect, cleared its
    // own setTimeout, and immediately fired the next request without
    // waiting POLL_INTERVAL_MS. Result: the page hammered the backend
    // 5-10×/sec instead of 1×/sec. The pollCount lives in a ref now so it
    // can be read without forcing a re-render, and the timer is the only
    // thing that schedules the next call.
    useEffect(() => {
        if (!orderId) {
            setError('Buyurtma raqami topilmadi');
            setPolling(false);
            return;
        }
        cancelledRef.current = false;
        pollCountRef.current = 0;

        const tick = async () => {
            if (cancelledRef.current) return;
            try {
                const res = await axiosInstance.get(`/user/appointments/${orderId}/payment-status`);
                const status = res.data.data;
                pollCountRef.current += 1;
                setPollCount(pollCountRef.current);

                const done = status.paymentStatus === 'PAID'
                    || status.status === 'CANCELLED'
                    || pollCountRef.current >= MAX_POLLS;
                if (done) {
                    // Fetch full payload once for the final render.
                    await fetchFullAppointment();
                    if (!cancelledRef.current) setPolling(false);
                    return;
                }
                pollTimerRef.current = setTimeout(tick, POLL_INTERVAL_MS);
            } catch (err) {
                if (cancelledRef.current) return;
                setError(err.response?.data?.error?.message || 'Buyurtma topilmadi');
                setPolling(false);
            }
        };

        tick();

        return () => {
            cancelledRef.current = true;
            if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
        };
    }, [orderId, fetchFullAppointment]);

    const handleManualRefresh = useCallback(async () => {
        await fetchFullAppointment();
    }, [fetchFullAppointment]);

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
    // Show the post-discount amount the customer was charged. Falls back
    // to the gross `price` only when finalPrice is missing (older bookings
    // pre-dating the column).
    const chargedAmount = appointment?.finalPrice ?? appointment?.price ?? 0;
    // Footer text + branding follow whichever provider the booking used.
    const providerLabel = appointment?.paymentMethod === 'CLICK' ? 'CLICK' : 'Payme';
    const providerHost = appointment?.paymentMethod === 'CLICK' ? 'my.click.uz' : 'paycom.uz';

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
                    <p className="pay-footer">Banisa Medical · {providerLabel} to'lov tizimi ({providerHost})</p>
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
                    <p className="pay-footer">Banisa Medical · {providerLabel} to'lov tizimi ({providerHost})</p>
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
                                <span className="pay-result-value pay-result-amount">{fmt(chargedAmount)} so'm</span>
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
                    <p className="pay-footer">Banisa Medical · {providerLabel} to'lov tizimi ({providerHost})</p>
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
                                <span className="pay-result-value">{fmt(chargedAmount)} so'm</span>
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
                    <p className="pay-footer">Banisa Medical · {providerLabel} to'lov tizimi ({providerHost})</p>
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
                            <span className="pay-result-value">{fmt(chargedAmount)} so'm</span>
                        </div>
                    </div>

                    <div className="pay-result-actions">
                        <button onClick={handleManualRefresh} className="pay-result-btn pay-result-btn--primary">
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
