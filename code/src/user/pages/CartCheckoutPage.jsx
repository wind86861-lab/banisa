import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Building2, Calendar, CreditCard, ArrowRight, ArrowLeft, ShoppingCart, Package, Banknote, AlertCircle } from 'lucide-react';
import { useCart } from '../../contexts/CartContext';
import axiosInstance from '../../shared/api/axios';
import TopBar from '../../pages/home/TopBar';
import Navigation from '../../pages/home/Navigation';
import Footer from '../../pages/home/Footer';
import './css/CheckoutPage.css';

const fmt = (n) => n ? Number(n).toLocaleString('uz-UZ') : '0';

export default function CartCheckoutPage() {
    const navigate = useNavigate();
    const { cart, clearCart, refreshCart } = useCart();
    const [paymentMethod, setPaymentMethod] = useState('naqd');
    const [selectedDate, setSelectedDate] = useState('');
    const [notes, setNotes] = useState('');
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [clinicPaymentMethods, setClinicPaymentMethods] = useState({});

    // Fetch payment methods for all clinics in cart
    useEffect(() => {
        if (!cart || cart.length === 0) return;

        const fetchPaymentMethods = async () => {
            const methods = {};
            for (const group of cart) {
                try {
                    const res = await axiosInstance.get(`/public/clinics/${group.clinic.id}`);
                    const clinic = res.data.data;
                    methods[group.clinic.id] = Array.isArray(clinic.paymentMethods) ? clinic.paymentMethods : [];
                } catch (err) {
                    console.error(`Failed to fetch payment methods for clinic ${group.clinic.id}:`, err);
                    methods[group.clinic.id] = ['CASH']; // Default to cash only
                }
            }
            setClinicPaymentMethods(methods);
        };

        fetchPaymentMethods();
    }, [cart]);

    if (!cart || cart.length === 0) {
        return (
            <div className="home-page">
                <TopBar /><Navigation />
                <div style={{ padding: '120px 20px', textAlign: 'center' }}>
                    <ShoppingCart size={64} style={{ color: '#ccc', marginBottom: 16 }} />
                    <h2>Savatingiz bo'sh</h2>
                    <Link to="/xizmatlar" style={{ color: '#00BDE0' }}>Xizmatlarga qaytish</Link>
                </div>
                <Footer />
            </div>
        );
    }

    const grandTotal = cart.reduce((sum, g) => sum + g.totalPrice, 0);
    const totalItems = cart.reduce((sum, g) => sum + g.itemCount, 0);

    // Check if ALL clinics support online payment
    const allClinicsSupport = (method) => {
        if (Object.keys(clinicPaymentMethods).length === 0) return false;
        return cart.every(group => {
            const methods = clinicPaymentMethods[group.clinic.id] || [];
            return methods.includes(method);
        });
    };

    const supportsPayme = allClinicsSupport('PAYME');
    const supportsClick = allClinicsSupport('CLICK');
    const supportsCard = supportsPayme || supportsClick; // Card = any online payment

    // Min date = tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const minDate = tomorrow.toISOString().split('T')[0];

    const handleCheckout = async () => {
        if (!selectedDate) {
            setError('Iltimos, sanani tanlang');
            return;
        }

        setError('');
        setSubmitting(true);

        try {
            const scheduledAt = `${selectedDate}T09:00:00.000Z`;
            const response = await axiosInstance.post('/cart/checkout', {
                scheduledAt,
                notes: notes || undefined,
                paymentMethod,
            });

            const result = response.data.data;

            // Clear frontend cart
            await refreshCart();

            if (paymentMethod === 'naqd') {
                // Cash — redirect to appointment detail with PENDING_ARRIVAL check-in instructions
                const firstAppt = result.appointments?.[0];
                if (firstAppt?.id) {
                    navigate(`/user/appointments/${firstAppt.id}`);
                } else {
                    navigate('/user/appointments');
                }
            } else {
                // Card/Payme/Click — go to payment page
                const firstAppointment = result.appointments?.[0];
                navigate('/payment', {
                    state: {
                        bookingData: {
                            clinicId: firstAppointment?.clinicId,
                            clinicName: firstAppointment?.clinic?.nameUz || 'Klinika',
                            serviceType: firstAppointment?.serviceType || 'DIAGNOSTIC',
                            serviceName: `Savat buyurtmasi (${result.count} ta)`,
                            diagnosticServiceId: firstAppointment?.diagnosticServiceId,
                            surgicalServiceId: firstAppointment?.surgicalServiceId,
                            scheduledAt,
                            selectedDate,
                            price: grandTotal,
                            appointmentId: firstAppointment?.id,
                            skipCreate: true,
                        },
                    },
                });
            }
        } catch (err) {
            setError(err.response?.data?.error?.message || err.response?.data?.message || 'Xatolik yuz berdi');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="home-page">
            <TopBar />
            <Navigation />
            <main className="home-container co-main">
                <div className="co-breadcrumb">
                    <Link to="/user/cart"><ArrowLeft size={16} /> Savatga qaytish</Link>
                </div>

                <h1 className="co-title">Buyurtmani tasdiqlash</h1>

                <div className="co-layout">
                    {/* Left: Order Details */}
                    <div className="co-details">
                        {/* Cart Summary */}
                        <div className="co-card">
                            <h3 className="co-card-title">
                                <Package size={18} /> Buyurtma tarkibi
                            </h3>
                            {cart.map((group) => (
                                <div key={group.clinic.id} style={{ marginBottom: 16 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                        <h4 style={{ margin: 0, fontSize: 15, color: '#1a1a2e' }}>
                                            <Building2 size={14} style={{ marginRight: 6 }} />
                                            {group.clinic.nameUz}
                                        </h4>
                                        <span style={{ fontWeight: 600, color: '#00BDE0' }}>{fmt(group.totalPrice)} so'm</span>
                                    </div>
                                    {group.items.map((item) => (
                                        <div key={item.id} style={{ padding: '6px 0 6px 20px', fontSize: 14, color: '#555', display: 'flex', justifyContent: 'space-between' }}>
                                            <span>{item.service?.nameUz} {item.quantity > 1 ? `× ${item.quantity}` : ''}</span>
                                            <span>{fmt((item.service?.priceRecommended || 0) * item.quantity)} so'm</span>
                                        </div>
                                    ))}
                                    <div className="co-divider" />
                                </div>
                            ))}
                        </div>

                        {/* Date Selection */}
                        <div className="co-card">
                            <h3 className="co-card-title">
                                <Calendar size={18} /> Sana
                            </h3>
                            <div>
                                <label style={{ display: 'block', fontWeight: 500, marginBottom: 6, fontSize: 14 }}>Sana</label>
                                <input
                                    type="date"
                                    min={minDate}
                                    value={selectedDate}
                                    onChange={(e) => setSelectedDate(e.target.value)}
                                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14 }}
                                />
                            </div>

                            <div style={{ marginTop: 16 }}>
                                <label style={{ display: 'block', fontWeight: 500, marginBottom: 6, fontSize: 14 }}>Izoh (ixtiyoriy)</label>
                                <textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="Qo'shimcha ma'lumot..."
                                    rows={3}
                                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, resize: 'vertical' }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Right: Payment Summary */}
                    <div className="co-payment">
                        <div className="co-card">
                            <h3 className="co-card-title">To'lov xulosasi</h3>

                            <div className="co-price-breakdown">
                                <div className="co-price-row">
                                    <span>Xizmatlar soni</span>
                                    <span>{totalItems} ta</span>
                                </div>
                                <div className="co-price-row">
                                    <span>Klinikalar</span>
                                    <span>{cart.length} ta</span>
                                </div>
                                <div className="co-price-row">
                                    <span>Chegirma</span>
                                    <span className="co-green">-0 so'm</span>
                                </div>
                                <div className="co-price-divider" />
                                <div className="co-price-row co-price-total">
                                    <span>Jami</span>
                                    <span>{fmt(grandTotal)} so'm</span>
                                </div>
                            </div>

                            <h4 className="co-payment-title"><CreditCard size={16} /> To'lov usuli</h4>
                            <div className="co-payment-methods">
                                {/* Cash - always available */}
                                <div
                                    className={`co-payment-opt ${paymentMethod === 'naqd' ? 'selected' : ''}`}
                                    onClick={() => setPaymentMethod('naqd')}
                                >
                                    <span>💵</span>
                                    <span>Naqd</span>
                                </div>

                                {/* Payme - only if all clinics support it */}
                                {supportsPayme && (
                                    <div
                                        className={`co-payment-opt ${paymentMethod === 'payme' ? 'selected' : ''}`}
                                        onClick={() => setPaymentMethod('payme')}
                                    >
                                        <span>🔵</span>
                                        <span>Payme</span>
                                    </div>
                                )}

                                {/* Click - only if all clinics support it */}
                                {supportsClick && (
                                    <div
                                        className={`co-payment-opt ${paymentMethod === 'click' ? 'selected' : ''}`}
                                        onClick={() => setPaymentMethod('click')}
                                    >
                                        <span>🟠</span>
                                        <span>Click</span>
                                    </div>
                                )}
                            </div>

                            {/* Warning if online payment not available */}
                            {!supportsPayme && !supportsClick && (
                                <div style={{
                                    marginTop: 12,
                                    padding: '10px 12px',
                                    background: '#fff3cd',
                                    border: '1px solid #ffc107',
                                    borderRadius: 8,
                                    fontSize: 13,
                                    color: '#856404',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 8
                                }}>
                                    <AlertCircle size={16} />
                                    <span>Onlayn to'lov hozircha faqat ba'zi klinikalarda mavjud. Naqd to'lov uchun klinikaga tashrif buyuring.</span>
                                </div>
                            )}

                            {error && <div className="co-error">{error}</div>}

                            <button
                                className="co-confirm-btn"
                                onClick={handleCheckout}
                                disabled={submitting}
                            >
                                {submitting ? 'Saqlanmoqda...' : 'Buyurtma berish'}
                                <ArrowRight size={18} />
                            </button>

                            <p className="co-note">
                                Buyurtma yaratilgach, operator siz bilan bog'lanadi va tasdiqlaydi.
                            </p>
                        </div>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
}
