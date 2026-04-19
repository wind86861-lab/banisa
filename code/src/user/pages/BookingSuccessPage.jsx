import { useLocation, Link, Navigate } from 'react-router-dom';
import { CheckCircle2, Calendar, Building2, Clock, CreditCard, ArrowRight, Home } from 'lucide-react';
import TopBar from '../../pages/home/TopBar';
import Navigation from '../../pages/home/Navigation';
import Footer from '../../pages/home/Footer';
import './css/BookingSuccess.css';

const fmt = (n) => n ? Number(n).toLocaleString('uz-UZ') : '0';

export default function BookingSuccessPage() {
    const location = useLocation();
    const appointment = location.state?.appointment;

    if (!appointment) {
        return <Navigate to="/user/dashboard" replace />;
    }

    const shortId = appointment.id?.slice(0, 8).toUpperCase();
    const svcName = appointment.diagnosticService?.nameUz
        || appointment.surgicalService?.nameUz
        || 'Xizmat';
    const clinicName = appointment.clinic?.nameUz || 'Klinika';
    const scheduledDate = appointment.scheduledAt
        ? new Date(appointment.scheduledAt).toLocaleString('uz-UZ', {
            day: '2-digit', month: 'long', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
        })
        : '—';

    return (
        <div className="home-page">
            <TopBar />
            <Navigation />
            <main className="bs-main">
                <div className="bs-card">
                    {/* Success Icon */}
                    <div className="bs-icon-wrap">
                        <CheckCircle2 size={64} className="bs-icon" />
                    </div>

                    <h1 className="bs-title">Broningiz qabul qilindi!</h1>
                    <p className="bs-subtitle">Klinika tez orada siz bilan bog'lanadi va bronni tasdiqlaydi</p>

                    {/* Booking Details */}
                    <div className="bs-details">
                        <div className="bs-detail-row">
                            <span className="bs-detail-label">Bron raqami</span>
                            <span className="bs-detail-value bs-mono">{appointment.bookingNumber || `#${shortId}`}</span>
                        </div>
                        <div className="bs-detail-row">
                            <span className="bs-detail-label">Xizmat</span>
                            <span className="bs-detail-value">{svcName}</span>
                        </div>
                        <div className="bs-detail-row">
                            <span className="bs-detail-label">
                                <Building2 size={14} /> Klinika
                            </span>
                            <span className="bs-detail-value">{clinicName}</span>
                        </div>
                        <div className="bs-detail-row">
                            <span className="bs-detail-label">
                                <Calendar size={14} /> Sana va vaqt
                            </span>
                            <span className="bs-detail-value">{scheduledDate}</span>
                        </div>
                        <div className="bs-detail-row">
                            <span className="bs-detail-label">
                                <CreditCard size={14} /> Narx
                            </span>
                            <span className="bs-detail-value bs-price">{fmt(appointment.price)} so'm</span>
                        </div>
                        <div className="bs-detail-row">
                            <span className="bs-detail-label">
                                <Clock size={14} /> Holat
                            </span>
                            <span className="bs-badge bs-badge-pending">Kutilmoqda</span>
                        </div>
                    </div>

                    {/* Info Box */}
                    <div className="bs-info-box">
                        <p>Klinika tez orada siz bilan bog'lanadi va bronni tasdiqlaydi. Iltimos, telefon qo'ng'irog'ini kutib turing.</p>
                    </div>

                    {/* Buttons */}
                    <div className="bs-actions">
                        <Link to={`/user/appointments/${appointment.id}`} className="bs-btn-primary">
                            Bron tafsiloti <ArrowRight size={18} />
                        </Link>
                        <Link to="/user/appointments" className="bs-btn-secondary">
                            Barcha bronlar
                        </Link>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
}
