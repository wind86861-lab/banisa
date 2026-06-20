import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Building2, Calendar, CreditCard, ArrowRight, ArrowLeft, ShoppingCart, Package, AlertCircle, CheckCircle2, QrCode, FileText, X } from 'lucide-react';
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
    const [clinicWorkingHours, setClinicWorkingHours] = useState({});
    const [success, setSuccess] = useState(null); // { appointmentId, isCash } after submit
    const [oferta, setOferta] = useState(null); // { id, version, fileUrl, fileName } or null if none
    const [ofertaAgreed, setOfertaAgreed] = useState(false);
    const [ofertaModalOpen, setOfertaModalOpen] = useState(false);
    const [ofertaModalChecked, setOfertaModalChecked] = useState(false);

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
            const hours = {};
            for (const group of cart) {
                try {
                    const res = await axiosInstance.get(`/public/clinics/${group.clinic.id}`);
                    const clinic = res.data.data;
                    methods[group.clinic.id] = Array.isArray(clinic.paymentMethods) ? clinic.paymentMethods : [];
                    discounts[group.clinic.id] = Number(clinic.defaultDiscountPercent) || 0;
                    hours[group.clinic.id] = clinic.workingHours || null;
                } catch (err) {
                    console.error(`Failed to fetch payment methods for clinic ${group.clinic.id}:`, err);
                    methods[group.clinic.id] = ['CASH'];
                    discounts[group.clinic.id] = 0;
                    hours[group.clinic.id] = null;
                }
            }
            setClinicPaymentMethods(methods);
            setClinicDiscounts(discounts);
            setClinicWorkingHours(hours);
        };

        fetchPaymentMethods();
    }, [cart]);

    // Auto-clear time when the new date/working-hours window makes the
    // currently-selected time invalid. Must live above the early returns so
    // the hook is called on every render (Rules of Hooks). Computes the
    // bounds inline from state so deps stay simple.
    useEffect(() => {
        if (!selectedTime || !selectedDate) return;
        if (!cart || cart.length === 0) return;
        const primaryClinicId = cart[0]?.clinic?.id;
        const wh = primaryClinicId ? clinicWorkingHours[primaryClinicId] : null;
        if (!wh) return;
        const DAY_KEYS_LOCAL = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const dayKey = DAY_KEYS_LOCAL[new Date(selectedDate + 'T00:00').getDay()];
        const dayInfo = wh[dayKey];
        if (!dayInfo) return;
        if (!dayInfo.isAroundClock && !dayInfo.isOpen) {
            setSelectedTime('');
            return;
        }
        if (dayInfo.isAroundClock) return;
        const open = dayInfo.openTime;
        const close = dayInfo.closeTime;
        if (open && selectedTime < open) setSelectedTime('');
        else if (close && selectedTime > close) setSelectedTime('');
    }, [cart, clinicWorkingHours, selectedDate, selectedTime]);

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
                            <>
                                <p className="co-success-lead">
                                    Bron <strong>klinika tasdiqi kutilmoqda</strong> bo'limiga qo'shildi.
                                    Klinika qabul qilgach, sizga <strong>{success.paymentMethod === 'click' ? 'Click' : 'Payme'}</strong> orqali to'lov havolasi yuboriladi (Telegram + sayt notifikatsiyasi orqali).
                                </p>
                                <div className="co-success-steps">
                                    <div className="co-success-step"><span>1</span> Klinika bronni qabul qiladi</div>
                                    <div className="co-success-step"><span>2</span> Sizga "💳 To'lash" havolasi keladi</div>
                                    <div className="co-success-step"><span>3</span> Istalgan vaqtda — klinikaga kelganingizgacha — to'laysiz</div>
                                    <div className="co-success-step"><span>4</span> Belgilangan kuni klinikaga kelib check-in qilasiz va xizmatdan foydalanasiz</div>
                                </div>
                                <p style={{ marginTop: 14, fontSize: 13, color: '#94a3b8' }}>
                                    💡 Eslatma: agar klinikaga kelib check-in qilganingizgacha to'lov qilmagan bo'lsangiz, xizmat boshlanmaydi. Kassada to'lashingiz yoki onlayn to'lash tugmasi qoladi.
                                </p>
                            </>
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

    // ─── Working-hours clamp ───────────────────────────────────────────────
    // Cart is always a single clinic on submit (we block multi-clinic above),
    // so use the first group as the source of truth for time bounds. Day key
    // matches the DB shape: { monday: {...}, tuesday: {...}, ... }.
    const DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const DAY_LABEL_UZ = {
        sunday: 'Yakshanba', monday: 'Dushanba', tuesday: 'Seshanba',
        wednesday: 'Chorshanba', thursday: 'Payshanba', friday: 'Juma', saturday: 'Shanba',
    };
    const primaryClinicId = cart[0]?.clinic?.id;
    const workingHours = primaryClinicId ? clinicWorkingHours[primaryClinicId] : null;
    const selectedDayKey = selectedDate
        ? DAY_KEYS[new Date(selectedDate + 'T00:00').getDay()]
        : null;
    const selectedDayHours = workingHours && selectedDayKey ? workingHours[selectedDayKey] : null;
    const isClinicOpenOnDay = !workingHours || !selectedDayKey
        ? true // unknown hours → don't block, server validates
        : selectedDayHours?.isAroundClock || Boolean(selectedDayHours?.isOpen);
    const dayOpenTime = selectedDayHours?.isAroundClock ? '00:00' : (selectedDayHours?.openTime || null);
    const dayCloseTime = selectedDayHours?.isAroundClock ? '23:59' : (selectedDayHours?.closeTime || null);
    // For today, clamp opening to "now + 30min" if it's after the clinic opens.
    const effectiveMinTime = (() => {
        if (!dayOpenTime) return isToday ? minTimeIfToday : undefined;
        if (isToday && minTimeIfToday > dayOpenTime) return minTimeIfToday;
        return dayOpenTime;
    })();
    const effectiveMaxTime = dayCloseTime || undefined;

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
        if (!isClinicOpenOnDay) {
            setError(`Klinika ${DAY_LABEL_UZ[selectedDayKey] || ''} kuni dam oladi. Iltimos, boshqa sanani tanlang.`);
            return;
        }
        if (effectiveMinTime && selectedTime < effectiveMinTime) {
            setError(`Tanlangan vaqt klinika ish vaqti oraligʻidan tashqarida. Iltimos, ${effectiveMinTime} dan keyingi vaqtni tanlang.`);
            return;
        }
        if (effectiveMaxTime && selectedTime > effectiveMaxTime) {
            setError(`Tanlangan vaqt klinika ish vaqti oraligʻidan tashqarida. Iltimos, ${effectiveMaxTime} dan oldingi vaqtni tanlang.`);
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

            // Both cash AND online checkouts now land on the same success
            // screen — clinic must accept first. Online payment opens later
            // via the notification + "💳 To'lash" button on /payment.
            // (Old flow let the patient pay immediately, which could collide
            // with a clinic rejection. That's now gated server-side too —
            // Payme + Click webhooks refuse non-CONFIRMED bookings.)
            const firstAppt = result.appointments?.[0];
            setSuccess({
                appointmentId: firstAppt?.id,
                isCash: paymentMethod === 'naqd',
                paymentMethod,
            });
            return;
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
                                        min={effectiveMinTime}
                                        max={effectiveMaxTime}
                                        value={selectedTime}
                                        onChange={(e) => setSelectedTime(e.target.value)}
                                        disabled={!isClinicOpenOnDay}
                                        style={{
                                            width: '100%', padding: '10px 12px',
                                            border: '1px solid #ddd', borderRadius: 8, fontSize: 14,
                                            background: !isClinicOpenOnDay ? '#f1f5f9' : '#fff',
                                            cursor: !isClinicOpenOnDay ? 'not-allowed' : 'auto',
                                        }}
                                    />
                                </div>
                            </div>
                            {selectedDate && !isClinicOpenOnDay && (
                                <p style={{ marginTop: 8, fontSize: 13, color: '#dc2626', fontWeight: 500 }}>
                                    ⚠️ Klinika {DAY_LABEL_UZ[selectedDayKey] || ''} kuni dam oladi. Iltimos, boshqa sanani tanlang.
                                </p>
                            )}
                            {selectedDate && isClinicOpenOnDay && dayOpenTime && dayCloseTime && (
                                <p style={{ marginTop: 8, fontSize: 12, color: '#64748b' }}>
                                    🕐 Klinika ish vaqti: <b>{dayOpenTime} – {dayCloseTime}</b>
                                    {isToday && minTimeIfToday > dayOpenTime && (
                                        <> · bugungi kun uchun {minTimeIfToday} dan</>
                                    )}
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

                            {oferta && (
                                <div id="oferta-block" style={{ marginTop: 18 }}>
                                    {ofertaAgreed ? (
                                        <div style={{
                                            display: 'flex', alignItems: 'center', gap: 10,
                                            padding: '12px 14px',
                                            background: '#ecfeff', border: '2px solid #06b6d4',
                                            borderRadius: 12, color: '#0e7490',
                                            fontSize: 14, fontWeight: 600,
                                        }}>
                                            <CheckCircle2 size={18} />
                                            Ommaviy oferta (v{oferta.version}) qabul qilingan
                                        </div>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => { setOfertaModalChecked(false); setOfertaModalOpen(true); }}
                                            style={{
                                                width: '100%',
                                                display: 'flex', alignItems: 'center', gap: 12,
                                                padding: '14px 16px',
                                                background: '#fff7ed', border: '2px solid #fb923c',
                                                borderRadius: 12, color: '#9a3412',
                                                fontSize: 14, fontWeight: 700, cursor: 'pointer',
                                                textAlign: 'left',
                                            }}
                                        >
                                            <FileText size={20} style={{ flexShrink: 0 }} />
                                            <span style={{ flex: 1 }}>
                                                Ommaviy oferta (v{oferta.version}) bilan tanishish va qabul qilish
                                                <span style={{ display: 'block', marginTop: 4, fontSize: 12, fontWeight: 600, color: '#c2410c' }}>
                                                    * Buyurtma berishdan oldin shart
                                                </span>
                                            </span>
                                            <ArrowRight size={18} />
                                        </button>
                                    )}
                                </div>
                            )}
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

                            {oferta && !ofertaAgreed && (
                                <button
                                    type="button"
                                    onClick={() => { setOfertaModalChecked(false); setOfertaModalOpen(true); }}
                                    style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                                        padding: '10px 14px',
                                        background: '#fff7ed', border: '1px solid #fdba74',
                                        borderRadius: 10, color: '#9a3412',
                                        fontSize: 13, fontWeight: 700, cursor: 'pointer',
                                        animation: 'co-pulse 1.8s ease-in-out infinite',
                                    }}
                                >
                                    <FileText size={15} />
                                    Ommaviy ofertani ochish va qabul qilish
                                </button>
                            )}
                            {oferta && ofertaAgreed && (
                                <div style={{
                                    display: 'flex', alignItems: 'center', gap: 8,
                                    padding: '8px 12px',
                                    background: '#ecfeff', border: '1px solid #67e8f9',
                                    borderRadius: 10, color: '#0e7490',
                                    fontSize: 12, fontWeight: 600,
                                }}>
                                    <CheckCircle2 size={14} />
                                    Oferta qabul qilingan (v{oferta.version})
                                </div>
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

            {/* ── Oferta modal ── */}
            {oferta && ofertaModalOpen && (() => {
                const isAbs = oferta.fileUrl.startsWith('http');
                const origin = window.location.origin === 'http://localhost:5173' ? 'http://localhost:5000' : window.location.origin;
                const pdfHref = isAbs ? oferta.fileUrl : `${origin}${oferta.fileUrl}`;
                // Google Docs Viewer: inline PDF reader that works well on mobile
                // without forcing the user to leave the page. Falls back to the
                // native renderer only on desktop where it's typically fine.
                const isMobile = typeof window !== 'undefined' && window.matchMedia('(max-width: 700px)').matches;
                const viewerSrc = isMobile
                    ? `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(pdfHref)}`
                    : pdfHref;
                return (
                    <div className="co-oferta-backdrop" onClick={() => setOfertaModalOpen(false)}>
                        <div className="co-oferta-modal" onClick={e => e.stopPropagation()}>
                            <div className="co-oferta-head">
                                <div className="co-oferta-title">
                                    <FileText size={20} />
                                    <div className="co-oferta-title-text">
                                        <div className="co-oferta-title-main">Ommaviy oferta</div>
                                        <div className="co-oferta-title-sub">v{oferta.version}{oferta.fileName ? ` · ${oferta.fileName}` : ''}</div>
                                    </div>
                                </div>
                                <div className="co-oferta-head-actions">
                                    <button
                                        type="button"
                                        onClick={() => setOfertaModalOpen(false)}
                                        aria-label="Yopish"
                                        className="co-oferta-close"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>
                            </div>

                            <div className="co-oferta-pdf-wrap">
                                <iframe
                                    title="Ommaviy oferta PDF"
                                    src={viewerSrc}
                                    className="co-oferta-iframe"
                                />
                            </div>

                            <div className="co-oferta-foot">
                                <label className="co-oferta-check">
                                    <input
                                        type="checkbox"
                                        checked={ofertaModalChecked}
                                        onChange={e => setOfertaModalChecked(e.target.checked)}
                                    />
                                    <span>Men ushbu ommaviy oferta (v{oferta.version}) shartlari bilan to'liq tanishdim va qabul qilaman.</span>
                                </label>
                                <div className="co-oferta-actions">
                                    <button
                                        type="button"
                                        onClick={() => setOfertaModalOpen(false)}
                                        className="co-oferta-btn-cancel"
                                    >
                                        Bekor qilish
                                    </button>
                                    <button
                                        type="button"
                                        disabled={!ofertaModalChecked}
                                        onClick={() => { setOfertaAgreed(true); setOfertaModalOpen(false); }}
                                        className="co-oferta-btn-confirm"
                                    >
                                        <CheckCircle2 size={16} />
                                        Tasdiqlash
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
}
