import { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate, Link } from 'react-router-dom';
import { Calendar, Clock, ChevronRight, ChevronLeft, CheckCircle2, Building2, ArrowRight, ShoppingCart } from 'lucide-react';
import api from '../../shared/api/axios';
import { useBookingState } from '../hooks/useBooking';
import { useCart } from '../../contexts/CartContext';
import TopBar from '../../pages/home/TopBar';
import Navigation from '../../pages/home/Navigation';
import Footer from '../../pages/home/Footer';
import './css/BookingPage.css';

const fmt = (n) => n ? Number(n).toLocaleString('uz-UZ') : '0';

const MONTHS = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'];
const DAYS = ['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya'];

function MiniCalendar({ selectedDate, onChange }) {
    const today = new Date();
    const [viewYear, setViewYear] = useState(today.getFullYear());
    const [viewMonth, setViewMonth] = useState(today.getMonth());

    const firstDay = new Date(viewYear, viewMonth, 1).getDay();
    const offset = firstDay === 0 ? 6 : firstDay - 1;
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const maxDate = new Date(today);
    maxDate.setDate(today.getDate() + 30);

    const cells = [];
    for (let i = 0; i < offset; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);

    const isDisabled = (day) => {
        if (!day) return true;
        const date = new Date(viewYear, viewMonth, day);
        return date < today || date > maxDate;
    };

    const isSelected = (day) => {
        if (!day || !selectedDate) return false;
        const d = new Date(selectedDate);
        return d.getFullYear() === viewYear && d.getMonth() === viewMonth && d.getDate() === day;
    };

    const isToday = (day) => {
        if (!day) return false;
        return day === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear();
    };

    const prevMonth = () => {
        if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
        else setViewMonth(m => m - 1);
    };
    const nextMonth = () => {
        if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
        else setViewMonth(m => m + 1);
    };

    const handleSelect = (day) => {
        if (!day || isDisabled(day)) return;
        const d = new Date(viewYear, viewMonth, day);
        onChange(d.toISOString().split('T')[0]);
    };

    return (
        <div className="bp-calendar">
            <div className="bp-cal-header">
                <button onClick={prevMonth} className="bp-cal-nav"><ChevronLeft size={18} /></button>
                <span>{MONTHS[viewMonth]} {viewYear}</span>
                <button onClick={nextMonth} className="bp-cal-nav"><ChevronRight size={18} /></button>
            </div>
            <div className="bp-cal-weekdays">
                {DAYS.map(d => <span key={d}>{d}</span>)}
            </div>
            <div className="bp-cal-grid">
                {cells.map((day, i) => (
                    <button
                        key={i}
                        className={`bp-cal-day ${!day ? 'empty' : ''} ${isDisabled(day) ? 'disabled' : ''} ${isSelected(day) ? 'selected' : ''} ${isToday(day) ? 'today' : ''}`}
                        onClick={() => handleSelect(day)}
                        disabled={!day || isDisabled(day)}
                    >
                        {day || ''}
                    </button>
                ))}
            </div>
        </div>
    );
}

export default function BookingPage() {
    const { serviceId } = useParams();
    const location = useLocation();
    const navigate = useNavigate();

    const serviceType = location.state?.serviceType || 'DIAGNOSTIC';
    const serviceData = location.state?.serviceData || null;
    const preselected = location.state?.selectedClinic || null;

    const [svc, setSvc] = useState(serviceData);
    const [loadingSvc, setLoadingSvc] = useState(!serviceData);
    const [error, setError] = useState('');

    const { state, update, nextStep, prevStep } = useBookingState();
    const { addToCart } = useCart();
    const [addingToCart, setAddingToCart] = useState(false);

    useEffect(() => {
        if (!serviceData) {
            setLoadingSvc(true);
            api.get(`/public/services/${serviceId}`)
                .then(res => setSvc(res.data.data))
                .catch(() => setError('Xizmat topilmadi'))
                .finally(() => setLoadingSvc(false));
        }
    }, [serviceId, serviceData]);

    // Auto-select clinic: prefer pre-selected from navigation state, fallback to first clinic
    const selectedClinic = preselected || svc?.clinics?.[0] || null;

    const handleStep1Next = () => {
        if (!state.selectedDate) { setError('Sanani tanlang'); return; }
        setError('');
        nextStep();
    };

    const handleConfirm = async () => {
        if (!selectedClinic?.id) { setError('Klinika tanlanmagan'); return; }
        if (!state.selectedDate) { setError('Sana tanlanmagan'); return; }
        setError('');
        setAddingToCart(true);

        try {
            const result = await addToCart(selectedClinic.id, serviceType, serviceId, 1);
            if (result.success) {
                navigate('/user/cart');
            } else {
                setError(result.message || 'Savatga qo\'shishda xatolik');
            }
        } catch (err) {
            setError('Xatolik yuz berdi');
        } finally {
            setAddingToCart(false);
        }
    };

    if (loadingSvc) {
        return (
            <div className="home-page">
                <TopBar /><Navigation />
                <div style={{ padding: '120px 20px', textAlign: 'center' }}><p>Yuklanmoqda...</p></div>
                <Footer />
            </div>
        );
    }

    if (error && !svc) {
        return (
            <div className="home-page">
                <TopBar /><Navigation />
                <div style={{ padding: '120px 20px', textAlign: 'center' }}>
                    <p>{error}</p>
                    <Link to="/xizmatlar">Xizmatlarga qaytish</Link>
                </div>
                <Footer />
            </div>
        );
    }

    return (
        <div className="home-page">
            <TopBar />
            <Navigation />
            <main className="home-container bp-main">
                {/* Breadcrumb */}
                <div className="bp-breadcrumb">
                    <Link to="/xizmatlar">Xizmatlar</Link>
                    <ChevronRight size={16} />
                    {svc && <Link to={`/xizmatlar/${serviceId}`}>{svc.nameUz}</Link>}
                    <ChevronRight size={16} />
                    <span>Bron qilish</span>
                </div>

                <h1 className="bp-title">Xizmatni bron qilish</h1>

                {/* Step Indicator */}
                <div className="bp-steps">
                    {['Sana tanlash', 'To\'lov'].map((label, i) => (
                        <div key={i} className={`bp-step ${state.step === i + 1 ? 'active' : ''} ${state.step > i + 1 ? 'done' : ''}`}>
                            <div className="bp-step-num">
                                {state.step > i + 1 ? <CheckCircle2 size={16} /> : i + 1}
                            </div>
                            <span>{label}</span>
                            {i < 1 && <div className="bp-step-line" />}
                        </div>
                    ))}
                </div>

                <div className="bp-body">
                    {/* ── STEP 1: Date ── */}
                    {state.step === 1 && (
                        <div className="bp-panel">
                            {/* Service + Clinic Info */}
                            {svc && (
                                <div className="bp-service-card">
                                    <div className="bp-svc-header">
                                        <div className="bp-svc-icon"><Building2 size={24} /></div>
                                        <div>
                                            <h2>{svc.nameUz}</h2>
                                            <p>{svc.shortDescription || svc.fullDescription}</p>
                                        </div>
                                    </div>
                                    {selectedClinic && (
                                        <div className="bp-svc-meta">
                                            <span><Building2 size={14} /> {selectedClinic.nameUz || selectedClinic.name}</span>
                                            {svc.durationMinutes && <span><Clock size={14} /> {svc.durationMinutes} daqiqa</span>}
                                        </div>
                                    )}
                                </div>
                            )}

                            {!selectedClinic && (
                                <div className="bp-no-clinics">
                                    <Building2 size={40} />
                                    <p>Bu xizmat uchun klinika topilmadi</p>
                                </div>
                            )}

                            {selectedClinic && (
                                <>
                                    <h3 className="bp-section-title">Sana tanlang</h3>
                                    <MiniCalendar selectedDate={state.selectedDate} onChange={(d) => update({ selectedDate: d })} />

                                    <div className="bp-form-group" style={{ marginTop: 24 }}>
                                        <label>Izoh (ixtiyoriy)</label>
                                        <textarea
                                            className="bp-textarea"
                                            rows={3}
                                            placeholder="Qo'shimcha ma'lumot kiritishingiz mumkin..."
                                            value={state.notes}
                                            onChange={(e) => update({ notes: e.target.value })}
                                        />
                                    </div>
                                </>
                            )}

                            {error && <div className="bp-error">{error}</div>}
                            <div className="bp-nav-row">
                                <Link to={`/xizmatlar/${serviceId}`} className="bp-btn-back">
                                    <ChevronLeft size={18} /> Orqaga
                                </Link>
                                <button className="bp-btn-next" onClick={handleStep1Next} disabled={!selectedClinic}>
                                    Davom etish <ChevronRight size={18} />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ── STEP 2: Summary & Payment ── */}
                    {state.step === 2 && (
                        <div className="bp-panel">
                            {/* Order Summary */}
                            <div className="bp-summary">
                                <h3 className="bp-section-title">Buyurtma xulosasi</h3>
                                <div className="bp-summary-card">
                                    <div className="bp-summary-row">
                                        <span>Xizmat</span>
                                        <strong>{svc?.nameUz}</strong>
                                    </div>
                                    <div className="bp-summary-row">
                                        <span>Klinika</span>
                                        <strong>{selectedClinic?.name || selectedClinic?.nameUz || '—'}</strong>
                                    </div>
                                    {selectedClinic?.address && (
                                        <div className="bp-summary-row">
                                            <span>Manzil</span>
                                            <strong>{selectedClinic.address}</strong>
                                        </div>
                                    )}
                                    <div className="bp-summary-row">
                                        <span>Sana</span>
                                        <strong>{state.selectedDate && new Date(state.selectedDate).toLocaleDateString('uz-UZ')}</strong>
                                    </div>
                                    <div className="bp-summary-row bp-summary-total">
                                        <span>Narx</span>
                                        <strong className="bp-price">{fmt(selectedClinic?.price || svc?.priceRecommended || 0)} so'm</strong>
                                    </div>
                                </div>
                            </div>


                            {error && <div className="bp-error">{error}</div>}
                            <div className="bp-nav-row">
                                <button className="bp-btn-back" onClick={prevStep}>
                                    <ChevronLeft size={18} /> Orqaga
                                </button>
                                <button
                                    className="bp-btn-confirm"
                                    onClick={handleConfirm}
                                    disabled={addingToCart}
                                >
                                    {addingToCart ? 'Qo\'shilmoqda...' : 'Savatga qo\'shish'}
                                    <ShoppingCart size={18} />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Sidebar Summary (visible on step 2) */}
                    {state.step === 2 && (
                        <div className="bp-sidebar">
                            <div className="bp-sidebar-card">
                                <h4>Tanlangan xizmat</h4>
                                <div className="bp-sidebar-row">
                                    <span>{svc?.nameUz}</span>
                                </div>
                                {selectedClinic && (
                                    <div className="bp-sidebar-row">
                                        <Building2 size={14} />
                                        <span>{selectedClinic.name || selectedClinic.nameUz}</span>
                                    </div>
                                )}
                                {state.selectedDate && (
                                    <div className="bp-sidebar-row">
                                        <Calendar size={14} />
                                        <span>{new Date(state.selectedDate).toLocaleDateString('uz-UZ')}</span>
                                    </div>
                                )}
                                <div className="bp-sidebar-price">
                                    {fmt(selectedClinic?.price || svc?.priceRecommended || 0)} so'm
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </main>
            <Footer />
        </div>
    );
}
