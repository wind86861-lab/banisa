import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Building2, Calendar, CreditCard, ArrowRight, ArrowLeft, ShoppingCart, Package, AlertCircle, CheckCircle2, QrCode } from 'lucide-react';
import { useCart } from '../../contexts/CartContext';
import axiosInstance from '../../shared/api/axios';
import { fmtSum } from '../../shared/utils/format';
import TopBar from '../../pages/home/TopBar';
import Navigation from '../../pages/home/Navigation';
import Footer from '../../pages/home/Footer';
import BanisaLoader from '../../shared/components/BanisaLoader';
import './css/CheckoutPage.css';

const fmt = fmtSum;

export default function CartCheckoutPage() {
    const navigate = useNavigate();
    const { cart, refreshCart } = useCart();
    const [paymentMethod, setPaymentMethod] = useState('naqd');
    const [selectedDate, setSelectedDate] = useState('');
    const [selectedTime, setSelectedTime] = useState('');
    const [notes, setNotes] = useState('');
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [clinicPaymentMethods, setClinicPaymentMethods] = useState({});
    const [clinicDiscounts, setClinicDiscounts] = useState({});
    const [success, setSuccess] = useState(null); // { appointmentId, isCash } after submit
    const [oferta, setOferta] = useState(null); // { id, version, fileUrl, fileName } or null if none
    const [ofertaAgreed, setOfertaAgreed] = useState(false);

    useEffect(() => {
        let cancelled = false;
        axiosInstance.get('/oferta/current')
            .then(res => { if (!cancelled) setOferta(res.data?.data || null); })
            .catch(() => { if (!cancelled) setOferta(null); });
        return () => { cancelled = true; };
    }, []);

    // Fetch payment methods + cash discount for all clinics in cart
    useEffect(() => {
        if (!cart || cart.length === 0) return;

        const fetchPaymentMethods = async () => {
            const methods = {};
            const discounts = {};
            for (const group of cart) {
                try {
                    const res = await axiosInstance.get(`/public/clinics/${group.clinic.id}`);
                    const clinic = res.data.data;
                    methods[group.clinic.id] = Array.isArray(clinic.paymentMethods) ? clinic.paymentMethods : [];
                    discounts[group.clinic.id] = Number(clinic.defaultDiscountPercent) || 0;
                } catch (err) {
                    console.error(`Failed to fetch payment methods for clinic ${group.clinic.id}:`, err);
                    methods[group.clinic.id] = ['CASH'];
                    discounts[group.clinic.id] = 0;
                }
            }
            setClinicPaymentMethods(methods);
            setClinicDiscounts(discounts);
        };

        fetchPaymentMethods();
    }, [cart]);

    if (submitting) {
        return <BanisaLoader message="Bron yaratilmoqda..." />;
    }

    if (success) {
        return (
            <div className="home-page">
                <TopBar /><Navigation />
                <main className="home-container co-main">
                    <div className="co-success">
                        <div className="co-success-icon"><CheckCircle2 size={56} /></div>
                        <h1>Bron yaratildi</h1>
                        {success.isCash ? (
                            <>
                                <p className="co-success-lead">Klinikaga kelganingizda devordagi <strong>QR kodni telefoningiz kamerasi bilan skanlang</strong> — keyin kassada naqd to'lashingiz mumkin.</p>
                                <div className="co-success-steps">
                                    <div className="co-success-step"><span>1</span> Belgilangan kuni klinikaga keling</div>
                                    <div className="co-success-step"><span>2</span> Qabulxonadagi yoki devordagi QR kodni skanlang</div>
                                    <div className="co-success-step"><span>3</span> Kassaga boring va naqd to'lang</div>
                                    <div className="co-success-step"><span>4</span> Xizmat xonasiga o'ting</div>
                                </div>
                            </>
                        ) : (
                            <p className="co-success-lead">To'lov sahifasiga yo'naltirilmoqdasiz...</p>
                        )}
                        <div className="co-success-actions">
                            {success.appointmentId && (
                                <button className="co-confirm-btn" onClick={() => navigate(`/user/appointments/${success.appointmentId}`)}>
                                    <QrCode size={18} /> Bron tafsilotlari
                                </button>
                            )}
                            <Link to="/user/appointments" className="co-success-secondary">Barcha bronlarim</Link>
                        </div>
                    </div>
                </main>
                <Footer />
            </div>
        );
    }

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

    // Cash discount preview — if every clinic in cart offers the same %, show as a single hint.
    const cashDiscountPcts = cart.map(g => clinicDiscounts[g.clinic.id] || 0);
    const minCashPct = cashDiscountPcts.length ? Math.min(...cashDiscountPcts) : 0;
    const allClinicsHaveCashDiscount = cashDiscountPcts.length > 0 && cashDiscountPcts.every(p => p > 0);
    const showCashDiscount = allClinicsHaveCashDiscount && minCashPct > 0;
    const cashTotal = showCashDiscount ? Math.round(grandTotal * (1 - minCashPct / 100)) : grandTotal;
    const cashSavings = grandTotal - cashTotal;

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

    // Min date = today (allow same-day booking).
    const todayStr = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD in local tz
    const minDate = todayStr;
    const isToday = selectedDate === todayStr;
    // If booking for today, earliest pickable time = now + 30 min (clinic prep).
    const minTimeIfToday = (() => {
        const m = new Date();
        m.setMinutes(m.getMinutes() + 30);
        return m.toTimeString().slice(0, 5);
    })();

    const hasMultipleClinics = cart.length > 1;

    const handleCheckout = async () => {
        if (hasMultipleClinics) {
            setError("Bitta bron faqat bitta klinikadan bo'lishi mumkin. Iltimos, boshqa klinika xizmatlarini savatdan olib tashlang.");
            return;
        }
        if (oferta && !ofertaAgreed) {
            setError("Buyurtma berish uchun ommaviy oferta shartlariga rozi bo'ling.");
            return;
        }
        if (!selectedDate) {
            setError('Iltimos, sanani tanlang');
            return;
        }
        if (!selectedTime) {
            setError('Iltimos, vaqtni tanlang');
            return;
        }
        // Build local datetime → ISO. Avoids the old `T09:00Z` hack that put
        // every booking at 14:00 Tashkent time regardless of user choice.
        const [hh, mm] = selectedTime.split(':');
        const dt = new Date(selectedDate);
        dt.setHours(parseInt(hh, 10), parseInt(mm, 10), 0, 0);
        if (dt.getTime() < Date.now() + 15 * 60 * 1000) {
            setError('Tanlangan vaqt o\'tib ketgan. Iltimos, kelajakdagi vaqtni tanlang.');
            return;
        }

        setError('');
        setSubmitting(true);

        try {
            const scheduledAt = dt.toISOString();
            const response = await axiosInstance.post('/cart/checkout', {
                scheduledAt,
                notes: notes || undefined,
                paymentMethod,
                ofertaVersionId: oferta?.id || undefined,
            });

            const result = response.data.data;

            // Clear frontend cart
            await refreshCart();

            if (paymentMethod === 'naqd') {
                // Cash — show success screen with explicit "scan clinic wall QR" guidance.
                const firstAppt = result.appointments?.[0];
                setSuccess({ appointmentId: firstAppt?.id, isCash: true });
                return;
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
            const status = err.response?.status;
            if (status === 401 || status === 403) {
                setError("Bron qilish uchun bemor hisobi bilan tizimga kirishingiz kerak. Iltimos, qayta kiring.");
            } else {
                setError(err.response?.data?.error?.message || err.response?.data?.message || 'Xatolik yuz berdi');
            }
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
                                <Calendar size={18} /> Sana va vaqt
                            </h3>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
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
                                <div>
                                    <label style={{ display: 'block', fontWeight: 500, marginBottom: 6, fontSize: 14 }}>Vaqt</label>
                                    <input
                                        type="time"
                                        min={isToday ? minTimeIfToday : undefined}
                                        value={selectedTime}
                                        onChange={(e) => setSelectedTime(e.target.value)}
                                        style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14 }}
                                    />
                                </div>
                            </div>
                            {isToday && (
                                <p style={{ marginTop: 8, fontSize: 12, color: '#64748b' }}>
                                    Bugungi sana uchun: kamida {minTimeIfToday} dan keyingi vaqtni tanlang.
                                </p>
                            )}

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
                                {paymentMethod === 'naqd' && cashSavings > 0 && (
                                    <>
                                        <div className="co-price-row">
                                            <span>Oraliq jami</span>
                                            <span>{fmt(grandTotal)} so'm</span>
                                        </div>
                                        <div className="co-price-row">
                                            <span>Naqd chegirma ({minCashPct}%)</span>
                                            <span className="co-green">−{fmt(cashSavings)} so'm</span>
                                        </div>
                                    </>
                                )}
                                <div className="co-price-divider" />
                                <div className="co-price-row co-price-total">
                                    <span>Jami</span>
                                    <span>{fmt(paymentMethod === 'naqd' ? cashTotal : grandTotal)} so'm</span>
                                </div>
                            </div>

                            <h4 className="co-payment-title"><CreditCard size={16} /> To'lov usuli</h4>
                            {showCashDiscount && (
                                <div className="co-cash-discount-hint">
                                    💡 Naqd to'lov tanlasangiz <strong>{minCashPct}% chegirma</strong> — {fmt(cashSavings)} so'm tejaysiz
                                </div>
                            )}
                            <div className="co-payment-methods">
                                {/* Cash - always available */}
                                <div
                                    className={`co-payment-opt ${paymentMethod === 'naqd' ? 'selected' : ''}`}
                                    onClick={() => setPaymentMethod('naqd')}
                                >
                                    <span>💵</span>
                                    <span>Naqd{showCashDiscount ? ` −${minCashPct}%` : ''}</span>
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

                            {hasMultipleClinics && (
                                <div style={{
                                    marginTop: 12,
                                    padding: '12px 14px',
                                    background: '#fee2e2',
                                    border: '1px solid #fca5a5',
                                    borderRadius: 10,
                                    fontSize: 13,
                                    color: '#991b1b',
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    gap: 8,
                                    lineHeight: 1.5,
                                }}>
                                    <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                                    <div>
                                        <strong>Bitta bron — bitta klinika</strong>
                                        <div style={{ marginTop: 2 }}>
                                            Savatingizda {cart.length} ta klinika xizmatlari bor. Hozircha bir vaqtning o'zida faqat bitta klinikadan bron qilish mumkin. <Link to="/user/cart" style={{ color: '#991b1b', textDecoration: 'underline', fontWeight: 600 }}>Savatga qaytish</Link> orqali boshqa klinika xizmatlarini olib tashlang.
                                        </div>
                                    </div>
                                </div>
                            )}

                            {oferta && (
                                <label style={{
                                    display: 'flex', alignItems: 'flex-start', gap: 10,
                                    padding: '12px 14px',
                                    background: ofertaAgreed ? '#f0fbff' : '#f8fafc',
                                    border: `1px solid ${ofertaAgreed ? '#bae6fd' : '#e2e8f0'}`,
                                    borderRadius: 10,
                                    fontSize: 13, lineHeight: 1.5,
                                    cursor: 'pointer',
                                    transition: 'background 0.18s, border-color 0.18s',
                                }}>
                                    <input
                                        type="checkbox"
                                        checked={ofertaAgreed}
                                        onChange={e => setOfertaAgreed(e.target.checked)}
                                        style={{ marginTop: 3, width: 16, height: 16, flexShrink: 0, accentColor: '#00BDE0' }}
                                    />
                                    <span>
                                        Men{' '}
                                        <a
                                            href={oferta.fileUrl.startsWith('http') ? oferta.fileUrl : `${window.location.origin === 'http://localhost:5173' ? 'http://localhost:5000' : ''}${oferta.fileUrl}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={e => e.stopPropagation()}
                                            style={{ color: '#00BDE0', fontWeight: 700, textDecoration: 'underline' }}
                                        >
                                            ommaviy oferta
                                        </a>
                                        {' '}(v{oferta.version}) shartlari bilan tanishdim va roziman.
                                    </span>
                                </label>
                            )}

                            {error && <div className="co-error">{error}</div>}

                            <button
                                className="co-confirm-btn"
                                onClick={handleCheckout}
                                disabled={submitting || hasMultipleClinics || (oferta && !ofertaAgreed)}
                                style={(hasMultipleClinics || (oferta && !ofertaAgreed)) ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
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
