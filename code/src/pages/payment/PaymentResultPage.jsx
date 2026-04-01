import { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { CheckCircle2, XCircle, Clock, ArrowLeft, Home, Loader2 } from 'lucide-react';
import axiosInstance from '../../shared/api/axios';
import './PaymePage.css';

export default function PaymentResultPage() {
    const [params] = useSearchParams();
    const navigate = useNavigate();

    const orderId = params.get('order_id') || '';
    const status = params.get('status') || '';
    const isSuccess = status === 'success' || (!status && !!orderId);
    const isCanceled = status === 'canceled' || status === 'failed';

    const [loading, setLoading] = useState(false);
    const [appointmentId, setAppointmentId] = useState(null);
    const [fetchError, setFetchError] = useState('');

    // On success: fetch appointment and auto-redirect
    useEffect(() => {
        if (isSuccess && orderId && !loading && !appointmentId && !fetchError) {
            setLoading(true);
            axiosInstance.get(`/user/appointments/${orderId}`)
                .then(res => {
                    const appt = res.data.data;
                    setAppointmentId(appt.id);
                    setTimeout(() => {
                        navigate('/user/booking-success', { state: { appointment: appt }, replace: true });
                    }, 1500);
                })
                .catch(() => setFetchError('Bron ma\'lumotlari topilmadi. Dashboard sahifasiga o\'ting.'))
                .finally(() => setLoading(false));
        }
    }, [isSuccess, orderId, loading, appointmentId, fetchError, navigate]);

    const shortId = orderId ? `#${orderId.slice(0, 8).toUpperCase()}` : '';

    return (
        <div className="pay-root">
            <div className="pay-wrap">

                {/* ── Loading: fetching appointment ── */}
                {isSuccess && loading && (
                    <div className="pay-result-card">
                        <div className="pay-result-icon pay-result-icon--loading">
                            <Loader2 size={36} className="pay-spin" />
                        </div>
                        <h2>To'lov qabul qilindi</h2>
                        <p>Bron ma'lumotlari yuklanmoqda...</p>
                    </div>
                )}

                {/* ── Success ── */}
                {isSuccess && !loading && !fetchError && (
                    <div className="pay-result-card">
                        <div className="pay-result-icon pay-result-icon--success">
                            <CheckCircle2 size={36} />
                        </div>
                        <h2>To'lov muvaffaqiyatli!</h2>
                        <p>Broningiz tasdiqlandi. Bosh sahifaga yo'naltirilmoqda...</p>
                        {appointmentId && (
                            <div className="pay-result-id">{shortId}</div>
                        )}
                        <Link to="/user/appointments" className="pay-result-btn pay-result-btn--primary">
                            Bronlarimga o'tish
                        </Link>
                    </div>
                )}

                {/* ── Success but appointment fetch failed ── */}
                {isSuccess && !loading && fetchError && (
                    <div className="pay-result-card">
                        <div className="pay-result-icon pay-result-icon--warn">
                            <Clock size={36} />
                        </div>
                        <h2>To'lov qabul qilindi</h2>
                        <p>{fetchError}</p>
                        <Link to="/user/dashboard" className="pay-result-btn pay-result-btn--primary">
                            Dashboard
                        </Link>
                    </div>
                )}

                {/* ── Canceled / Failed ── */}
                {isCanceled && (
                    <div className="pay-result-card">
                        <div className="pay-result-icon pay-result-icon--error">
                            <XCircle size={36} />
                        </div>
                        <h2>To'lov bekor qilindi</h2>
                        <p>To'lov amalga oshmadi. Qayta urinib ko'ring.</p>
                        <div className="pay-result-actions">
                            <Link to="/xizmatlar" className="pay-result-btn pay-result-btn--primary">
                                <ArrowLeft size={15} /> Qayta urinish
                            </Link>
                            <Link to="/" className="pay-result-btn pay-result-btn--ghost">
                                <Home size={15} /> Bosh sahifa
                            </Link>
                        </div>
                    </div>
                )}

                {/* ── Unknown state ── */}
                {!isSuccess && !isCanceled && (
                    <div className="pay-result-card">
                        <div className="pay-result-icon pay-result-icon--warn">
                            <Clock size={36} />
                        </div>
                        <h2>To'lov holati noma'lum</h2>
                        <p>To'lov holati tekshirilmoqda. Biroz kuting.</p>
                        <Link to="/" className="pay-result-btn pay-result-btn--ghost">
                            <Home size={15} /> Bosh sahifa
                        </Link>
                    </div>
                )}

                <p className="pay-footer">
                    Banisa Medical · To'lovlar Payme (paycom.uz) orqali amalga oshiriladi
                </p>
            </div>
        </div>
    );
}
