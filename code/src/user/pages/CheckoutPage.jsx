import { useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { Building2, Calendar, Clock, CreditCard, ChevronRight, ArrowRight } from 'lucide-react';
import { useCreateAppointment } from '../hooks/useBooking';
import TopBar from '../../pages/home/TopBar';
import Navigation from '../../pages/home/Navigation';
import Footer from '../../pages/home/Footer';
import './css/CheckoutPage.css';

const fmt = (n) => n ? Number(n).toLocaleString('uz-UZ') : '0';

export default function CheckoutPage() {
    const location = useLocation();
    const navigate = useNavigate();
    const bookingData = location.state?.booking;

    const [paymentMethod, setPaymentMethod] = useState('card');
    const [error, setError] = useState('');
    const createAppointment = useCreateAppointment();

    if (!bookingData) {
        return (
            <div className="home-page">
                <TopBar /><Navigation />
                <div style={{ padding: '120px 20px', textAlign: 'center' }}>
                    <h2>Ma'lumotlar topilmadi</h2>
                    <Link to="/xizmatlar" style={{ color: '#00BDE0' }}>Xizmatlarga qaytish</Link>
                </div>
                <Footer />
            </div>
        );
    }

    const { clinic, service, selectedDate, selectedTime, notes, serviceType, serviceId } = bookingData;

    const handleCheckout = async () => {
        setError('');
        try {
            const scheduledAt = `${selectedDate}T${selectedTime}:00.000Z`;
            const appointment = await createAppointment.mutateAsync({
                clinicId: clinic.id,
                serviceType: serviceType || 'DIAGNOSTIC',
                diagnosticServiceId: serviceType === 'DIAGNOSTIC' ? serviceId : undefined,
                surgicalServiceId: serviceType === 'SURGICAL' ? serviceId : undefined,
                scheduledAt,
                notes: notes || undefined,
                price: clinic.price || 0,
            });
            navigate('/user/booking-success', { state: { appointment } });
        } catch (err) {
            setError(err.response?.data?.message || 'Xatolik yuz berdi');
        }
    };

    const formattedDate = selectedDate
        ? new Date(selectedDate).toLocaleDateString('uz-UZ', { day: '2-digit', month: 'long', year: 'numeric' })
        : '—';

    return (
        <div className="home-page">
            <TopBar />
            <Navigation />
            <main className="home-container co-main">
                {/* Breadcrumb */}
                <div className="co-breadcrumb">
                    <Link to="/xizmatlar">Xizmatlar</Link>
                    <ChevronRight size={16} />
                    <span>To'lov</span>
                </div>

                <h1 className="co-title">To'lov va tasdiqlash</h1>

                <div className="co-layout">
                    {/* Left: Order Details */}
                    <div className="co-details">
                        <div className="co-card">
                            <h3 className="co-card-title">Buyurtma ma'lumotlari</h3>

                            <div className="co-info-section">
                                <h4>Xizmat</h4>
                                <p className="co-info-value">{service?.nameUz || 'Xizmat'}</p>
                                {service?.shortDescription && (
                                    <p className="co-info-desc">{service.shortDescription}</p>
                                )}
                            </div>

                            <div className="co-divider" />

                            <div className="co-info-section">
                                <h4><Building2 size={14} /> Klinika</h4>
                                <p className="co-info-value">{clinic?.nameUz || clinic?.name || '—'}</p>
                                {clinic?.address && <p className="co-info-desc">{clinic.address}</p>}
                            </div>

                            <div className="co-divider" />

                            <div className="co-info-row">
                                <div className="co-info-section">
                                    <h4><Calendar size={14} /> Sana</h4>
                                    <p className="co-info-value">{formattedDate}</p>
                                </div>
                                <div className="co-info-section">
                                    <h4><Clock size={14} /> Vaqt</h4>
                                    <p className="co-info-value">{selectedTime || '—'}</p>
                                </div>
                            </div>

                            {notes && (
                                <>
                                    <div className="co-divider" />
                                    <div className="co-info-section">
                                        <h4>Izoh</h4>
                                        <p className="co-info-desc">{notes}</p>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Right: Payment Summary */}
                    <div className="co-payment">
                        <div className="co-card">
                            <h3 className="co-card-title">To'lov xulosasi</h3>

                            <div className="co-price-breakdown">
                                <div className="co-price-row">
                                    <span>Xizmat narxi</span>
                                    <span>{fmt(clinic?.price)} so'm</span>
                                </div>
                                <div className="co-price-row">
                                    <span>Chegirma</span>
                                    <span className="co-green">-0 so'm</span>
                                </div>
                                <div className="co-price-divider" />
                                <div className="co-price-row co-price-total">
                                    <span>Jami</span>
                                    <span>{fmt(clinic?.price)} so'm</span>
                                </div>
                            </div>

                            {/* Payment Method */}
                            <h4 className="co-payment-title"><CreditCard size={16} /> To'lov usuli</h4>
                            <div className="co-payment-methods">
                                {[
                                    { id: 'card', label: 'Karta', icon: '💳' },
                                    { id: 'payme', label: 'Payme', icon: '🔵' },
                                    { id: 'click', label: 'Click', icon: '🟠' },
                                ].map(m => (
                                    <div
                                        key={m.id}
                                        className={`co-payment-opt ${paymentMethod === m.id ? 'selected' : ''}`}
                                        onClick={() => setPaymentMethod(m.id)}
                                    >
                                        <span>{m.icon}</span>
                                        <span>{m.label}</span>
                                    </div>
                                ))}
                            </div>

                            {error && <div className="co-error">{error}</div>}

                            <button
                                className="co-confirm-btn"
                                onClick={handleCheckout}
                                disabled={createAppointment.isPending}
                            >
                                {createAppointment.isPending ? 'Saqlanmoqda...' : 'To\'lash va bronlash'}
                                <ArrowRight size={18} />
                            </button>

                            <p className="co-note">
                                To'lov MVP rejimida amalga oshirilmaydi. Bron yaratiladi va klinika siz bilan bog'lanadi.
                            </p>
                        </div>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
}
