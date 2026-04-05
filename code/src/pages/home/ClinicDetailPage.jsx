import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
    ChevronRight, MapPin, Phone, Globe, Mail, Clock, Star,
    Calendar, Award, Users, Building2, Loader2, ArrowLeft,
    CheckCircle, Bed, Car, Wifi, AlertCircle, MessageSquare,
    PhoneCall, ExternalLink, ChevronDown
} from 'lucide-react';
import { usePublicClinicDetail } from '../../hooks/usePublicClinics';
import { useUserAuth } from '../../shared/auth/UserAuthContext';
import UserAuthModal from './UserAuthModal';
import TopBar from './TopBar';
import Navigation from './Navigation';
import Footer from './Footer';
import './css/ClinicDetailPage.css';

const CLINIC_TYPE_LABELS = {
    GENERAL: 'Umumiy klinika',
    SPECIALIZED: 'Ixtisoslashgan markaz',
    DIAGNOSTIC: 'Diagnostika markazi',
    DENTAL: 'Tish klinikasi',
    MATERNITY: "Tug'ruqxona",
    REHABILITATION: 'Reabilitatsiya markazi',
    PHARMACY: 'Dorixona',
    OTHER: 'Boshqa',
};

const DAYS_UZ = {
    monday: 'Dushanba', tuesday: 'Seshanba', wednesday: 'Chorshanba',
    thursday: 'Payshanba', friday: 'Juma', saturday: 'Shanba', sunday: 'Yakshanba',
};
const DAY_ORDER = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

function getTodayKey() {
    return ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][new Date().getDay()];
}

// Handles both { schedule: { monday:... } } nested format and flat format
function computeIsOpen(workingHours) {
    if (!workingHours) return null;
    const wh = workingHours.schedule ?? workingHours;
    if (Object.keys(wh).length === 0) return null;
    const now = new Date();
    const todayKey = getTodayKey();
    const day = wh[todayKey];
    if (!day) return null;
    const isDayOff = day.isDayOff !== undefined ? day.isDayOff : (day.isWorking !== undefined ? !day.isWorking : false);
    if (isDayOff) return false;
    const openStr = day.open ?? day.start ?? '08:00';
    const closeStr = day.close ?? day.end ?? '18:00';
    const [oh, om] = openStr.split(':').map(Number);
    const [ch, cm] = closeStr.split(':').map(Number);
    const cur = now.getHours() * 60 + now.getMinutes();
    return cur >= oh * 60 + om && cur < ch * 60 + cm;
}

function getTodayHours(workingHours) {
    if (!workingHours) return null;
    const todayKey = getTodayKey();
    const day = workingHours[todayKey];
    if (!day) return null;
    const isDayOff = day.isDayOff ?? !day.isWorking;
    if (isDayOff) return { isDayOff: true };
    return {
        isDayOff: false,
        open: day.open ?? day.start ?? '08:00',
        close: day.close ?? day.end ?? '18:00',
    };
}

function imgUrl(src) {
    if (!src) return null;
    if (src.startsWith('/uploads')) return `https://banisa.uz${src}`;
    return src;
}

function Stars({ rating = 0, size = 14 }) {
    return (
        <span className="cdp-stars" style={{ fontSize: size }}>
            {[1, 2, 3, 4, 5].map(s => (
                <span key={s} style={{ color: s <= Math.round(rating) ? '#f59e0b' : '#d1d5db' }}>★</span>
            ))}
        </span>
    );
}

function StarPicker({ rating, onRate, size = 28 }) {
    const [hover, setHover] = useState(0);
    return (
        <span className="cdp-star-picker">
            {[1, 2, 3, 4, 5].map(s => (
                <span
                    key={s}
                    style={{ fontSize: size, cursor: 'pointer', color: s <= (hover || rating) ? '#f59e0b' : '#d1d5db' }}
                    onClick={() => onRate(s)}
                    onMouseEnter={() => setHover(s)}
                    onMouseLeave={() => setHover(0)}
                >★</span>
            ))}
        </span>
    );
}

export default function ClinicDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useUserAuth();
    const { data: clinic, isLoading, error } = usePublicClinicDetail(id);
    const [activeTab, setActiveTab] = useState('overview');
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [pendingBooking, setPendingBooking] = useState(null);
    const [activeServiceTab, setActiveServiceTab] = useState(null);
    const [showReviewForm, setShowReviewForm] = useState(false);
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleBook = (service, serviceType) => {
        if (!user) { setPendingBooking({ service, serviceType }); setShowAuthModal(true); return; }
        navigate(`/user/book/${service.id}`, {
            state: { clinicId: clinic.id, serviceType: serviceType.toUpperCase(), serviceData: service },
        });
    };

    const handleReviewSubmit = async (e) => {
        e.preventDefault();
        if (!rating) return;
        setSubmitting(true);
        try {
            const { default: api } = await import('../../shared/api/axios');
            await api.post('/user/reviews', { clinicId: clinic.id, rating, comment: comment.trim() || undefined });
            setShowReviewForm(false); setRating(0); setComment('');
        } catch (err) { console.error(err); }
        finally { setSubmitting(false); }
    };

    if (isLoading) return (
        <div className="home-page">
            <TopBar /><Navigation />
            <div className="cdp-state-screen">
                <Loader2 size={40} className="cdp-spin" />
                <p>Yuklanmoqda...</p>
            </div>
            <Footer />
        </div>
    );

    if (error || !clinic) return (
        <div className="home-page">
            <TopBar /><Navigation />
            <div className="cdp-state-screen">
                <AlertCircle size={40} color="#ef4444" />
                <h3>Klinika topilmadi</h3>
                <p>Ushbu klinika mavjud emas yoki o'chirilgan</p>
                <button className="cdp-back-btn" onClick={() => navigate('/klinikalar')}>← Klinikalarga qaytish</button>
            </div>
            <Footer />
        </div>
    );

    const today = getTodayKey();
    const wh = clinic.workingHours || {};
    const logo = imgUrl(clinic.logo);
    const cover = imgUrl(clinic.coverImage);

    const serviceTabs = [
        clinic.serviceCounts?.diagnostic > 0 && { id: 'diagnostic', label: 'Diagnostika', count: clinic.serviceCounts.diagnostic, services: clinic.diagnosticServices, icon: '🔬' },
        clinic.serviceCounts?.surgical > 0 && { id: 'surgical', label: 'Jarrohlik', count: clinic.serviceCounts.surgical, services: clinic.surgicalServices, icon: '⚕️' },
        clinic.serviceCounts?.checkup > 0 && { id: 'checkup', label: 'Checkup', count: clinic.serviceCounts.checkup, services: clinic.checkupPackages, icon: '📋' },
        clinic.serviceCounts?.sanatorium > 0 && { id: 'sanatorium', label: 'Sanatoriya', count: clinic.serviceCounts.sanatorium, services: clinic.sanatoriumServices, icon: '🌿' },
    ].filter(Boolean);

    if (!activeServiceTab && serviceTabs.length > 0) setActiveServiceTab(serviceTabs[0].id);
    const currentServiceTab = serviceTabs.find(t => t.id === activeServiceTab);

    return (
        <div className="home-page">
            <TopBar />
            <Navigation />

            {/* ── HERO BANNER ── */}
            <div className="cdp-hero" style={cover ? { backgroundImage: `url(${cover})` } : {}}>
                <div className="cdp-hero-overlay" />
                <div className="home-container">
                    <nav className="cdp-breadcrumb">
                        <Link to="/">Bosh sahifa</Link>
                        <ChevronRight size={13} />
                        <Link to="/klinikalar">Klinikalar</Link>
                        <ChevronRight size={13} />
                        <span>{clinic.nameUz}</span>
                    </nav>
                </div>
            </div>

            {/* ── PAGE BODY ── */}
            <div className="cdp-page">
                <div className="home-container">

                    {/* ── CLINIC IDENTITY CARD ── */}
                    <div className="cdp-identity">
                        <div className="cdp-identity-left">
                            <button className="cdp-back" onClick={() => navigate('/klinikalar')}>
                                <ArrowLeft size={16} /> Orqaga
                            </button>
                            <div className="cdp-identity-logo">
                                {logo
                                    ? <img src={logo} alt={clinic.nameUz} />
                                    : <span>{clinic.nameUz?.[0]}</span>}
                            </div>
                            <div className="cdp-identity-info">
                                <div className="cdp-identity-badges">
                                    <span className="cdp-badge cdp-badge-type">{CLINIC_TYPE_LABELS[clinic.type]}</span>
                                    <span className={`cdp-badge ${clinic.isOpen ? 'cdp-badge-open' : 'cdp-badge-closed'}`}>
                                        <span className="cdp-badge-dot" /> {clinic.isOpen ? 'Hozir ochiq' : 'Yopiq'}
                                    </span>
                                    {clinic.hasEmergency && <span className="cdp-badge cdp-badge-emergency">🚑 Tez yordam</span>}
                                </div>
                                <h1 className="cdp-name">{clinic.nameUz}</h1>
                                <div className="cdp-rating-row">
                                    <Stars rating={clinic.averageRating || 0} size={16} />
                                    <strong>{(clinic.averageRating || 0).toFixed(1)}</strong>
                                    <span className="cdp-rating-sep">·</span>
                                    <span>{clinic.reviewCount} sharh</span>
                                </div>
                                <div className="cdp-address-row">
                                    <MapPin size={14} />
                                    <span>{clinic.fullAddress}</span>
                                </div>
                            </div>
                        </div>
                        <div className="cdp-identity-actions">
                            {clinic.phones?.[0] && (
                                <a href={`tel:${clinic.phones[0].replace(/\s/g, '')}`} className="cdp-btn-call">
                                    <PhoneCall size={18} /> Qo'ng'iroq
                                </a>
                            )}
                            <button className="cdp-btn-map" onClick={() => setActiveTab('contact')}>
                                <MapPin size={18} /> Xarita
                            </button>
                        </div>
                    </div>

                    {/* ── STATS ROW ── */}
                    <div className="cdp-stats">
                        <div className="cdp-stat">
                            <div className="cdp-stat-ico" style={{ '--c': '#f59e0b', '--bg': '#fef3c7' }}><Award size={20} /></div>
                            <div><div className="cdp-stat-val">{(clinic.averageRating || 0).toFixed(1)}</div><div className="cdp-stat-lbl">Reyting</div></div>
                        </div>
                        <div className="cdp-stat">
                            <div className="cdp-stat-ico" style={{ '--c': '#3b82f6', '--bg': '#dbeafe' }}><Building2 size={20} /></div>
                            <div><div className="cdp-stat-val">{clinic.serviceCounts?.total || 0}</div><div className="cdp-stat-lbl">Xizmatlar</div></div>
                        </div>
                        <div className="cdp-stat">
                            <div className="cdp-stat-ico" style={{ '--c': '#10b981', '--bg': '#d1fae5' }}><Users size={20} /></div>
                            <div><div className="cdp-stat-val">{clinic.confirmedAppointments || 0}+</div><div className="cdp-stat-lbl">Bemorlar</div></div>
                        </div>
                        <div className="cdp-stat">
                            <div className="cdp-stat-ico" style={{ '--c': '#8b5cf6', '--bg': '#ede9fe' }}><MessageSquare size={20} /></div>
                            <div><div className="cdp-stat-val">{clinic.reviewCount || 0}</div><div className="cdp-stat-lbl">Sharhlar</div></div>
                        </div>
                    </div>

                    {/* ── MAIN GRID ── */}
                    <div className="cdp-grid">

                        {/* LEFT — Tabs */}
                        <div className="cdp-col-main">

                            {/* Tab nav */}
                            <div className="cdp-tab-nav">
                                {[
                                    { id: 'overview', label: "Umumiy ma'lumot" },
                                    { id: 'services', label: 'Xizmatlar', count: clinic.serviceCounts?.total },
                                    { id: 'reviews', label: 'Sharhlar', count: clinic.reviewCount },
                                    { id: 'contact', label: 'Aloqa' },
                                ].map(t => (
                                    <button
                                        key={t.id}
                                        className={`cdp-tab-btn ${activeTab === t.id ? 'active' : ''}`}
                                        onClick={() => setActiveTab(t.id)}
                                    >
                                        {t.label}
                                        {t.count > 0 && <span className="cdp-tab-badge">{t.count}</span>}
                                    </button>
                                ))}
                            </div>

                            {/* ── OVERVIEW ── */}
                            {activeTab === 'overview' && (
                                <div className="cdp-panel">
                                    {clinic.description && (
                                        <div className="cdp-section">
                                            <h3 className="cdp-sec-title">Klinika haqida</h3>
                                            <p className="cdp-desc">{clinic.description}</p>
                                        </div>
                                    )}

                                    {Object.keys(wh).length > 0 && (
                                        <div className="cdp-section">
                                            <h3 className="cdp-sec-title"><Clock size={17} /> Ish vaqti</h3>
                                            <div className="cdp-hours">
                                                {DAY_ORDER.map(day => {
                                                    const h = wh[day];
                                                    const isToday = day === today;
                                                    const working = h ? !(h.isDayOff ?? !h.isWorking) : false;
                                                    const openT = h?.open ?? h?.start ?? '';
                                                    const closeT = h?.close ?? h?.end ?? '';
                                                    return (
                                                        <div key={day} className={`cdp-hour-row${isToday ? ' today' : ''}`}>
                                                            <span className="cdp-hour-day">{DAYS_UZ[day]}</span>
                                                            <span className="cdp-hour-time">
                                                                {working && openT ? `${openT} – ${closeT}` : 'Dam olish'}
                                                            </span>
                                                            <span className={`cdp-hour-status ${working ? 'open' : 'closed'}`}>
                                                                {working ? 'Ochiq' : 'Yopiq'}
                                                            </span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {(clinic.parkingAvailable || clinic.hasEmergency || clinic.hasAmbulance || clinic.hasOnlineBooking || clinic.bedsCount > 0) && (
                                        <div className="cdp-section">
                                            <h3 className="cdp-sec-title">Imkoniyatlar</h3>
                                            <div className="cdp-amenities">
                                                {clinic.parkingAvailable && <div className="cdp-amenity"><Car size={18} /><span>Parking</span></div>}
                                                {clinic.hasEmergency && <div className="cdp-amenity"><AlertCircle size={18} /><span>Tez yordam</span></div>}
                                                {clinic.hasAmbulance && <div className="cdp-amenity"><span style={{ fontSize: 18 }}>🚐</span><span>Ambulance</span></div>}
                                                {clinic.hasOnlineBooking && <div className="cdp-amenity"><Wifi size={18} /><span>Onlayn bron</span></div>}
                                                {clinic.bedsCount > 0 && <div className="cdp-amenity"><Bed size={18} /><span>{clinic.bedsCount} karavot</span></div>}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* ── SERVICES ── */}
                            {activeTab === 'services' && (
                                <div className="cdp-panel">
                                    {serviceTabs.length === 0 ? (
                                        <div className="cdp-empty-state">
                                            <Building2 size={40} />
                                            <p>Hali xizmatlar qo'shilmagan</p>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="cdp-svc-nav">
                                                {serviceTabs.map(t => (
                                                    <button
                                                        key={t.id}
                                                        className={`cdp-svc-tab ${activeServiceTab === t.id ? 'active' : ''}`}
                                                        onClick={() => setActiveServiceTab(t.id)}
                                                    >
                                                        {t.icon} {t.label}
                                                        <span className="cdp-svc-count">{t.count}</span>
                                                    </button>
                                                ))}
                                            </div>
                                            <div className="cdp-svc-list">
                                                {currentServiceTab?.services.map(svc => (
                                                    <div key={svc.id} className="cdp-svc-item">
                                                        <div className="cdp-svc-info">
                                                            <div className="cdp-svc-name">{svc.nameUz}</div>
                                                            <div className="cdp-svc-cat">{svc.category}</div>
                                                        </div>
                                                        <div className="cdp-svc-right">
                                                            <div className="cdp-svc-price">
                                                                {svc.originalPrice && (
                                                                    <span className="cdp-price-old">{svc.originalPrice.toLocaleString('uz-UZ')} so'm</span>
                                                                )}
                                                                <span className="cdp-price-now">{(svc.price || 0).toLocaleString('uz-UZ')} so'm</span>
                                                                {svc.discountPercent && <span className="cdp-price-off">-{svc.discountPercent}%</span>}
                                                            </div>
                                                            <button className="cdp-book-btn" onClick={() => handleBook(svc, activeServiceTab)}>
                                                                Bron qilish
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}

                            {/* ── REVIEWS ── */}
                            {activeTab === 'reviews' && (
                                <div className="cdp-panel">
                                    <div className="cdp-rating-box">
                                        <div className="cdp-rating-big">
                                            <div className="cdp-rating-num">{(clinic.averageRating || 0).toFixed(1)}</div>
                                            <Stars rating={clinic.averageRating || 0} size={20} />
                                            <div className="cdp-rating-cnt">{clinic.reviewCount} sharh</div>
                                        </div>
                                        <div className="cdp-rating-bars">
                                            {[5, 4, 3, 2, 1].map(star => {
                                                const cnt = clinic.ratingDistribution?.[star] ?? 0;
                                                const pct = clinic.reviewCount > 0 ? (cnt / clinic.reviewCount) * 100 : 0;
                                                return (
                                                    <div key={star} className="cdp-bar-row">
                                                        <span className="cdp-bar-lbl">{star} ★</span>
                                                        <div className="cdp-bar"><div className="cdp-bar-fill" style={{ width: `${pct}%` }} /></div>
                                                        <span className="cdp-bar-cnt">{cnt}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {user ? (
                                        showReviewForm ? (
                                            <form className="cdp-review-form" onSubmit={handleReviewSubmit}>
                                                <h4>Sharh qoldiring</h4>
                                                <StarPicker rating={rating} onRate={setRating} />
                                                <textarea
                                                    value={comment}
                                                    onChange={e => setComment(e.target.value)}
                                                    placeholder="Fikringizni yozing..."
                                                    rows={4} maxLength={500}
                                                />
                                                <div className="cdp-form-actions">
                                                    <button type="button" className="cdp-form-cancel" onClick={() => setShowReviewForm(false)}>Bekor</button>
                                                    <button type="submit" className="cdp-form-submit" disabled={!rating || submitting}>
                                                        {submitting ? 'Yuborilmoqda...' : 'Yuborish'}
                                                    </button>
                                                </div>
                                            </form>
                                        ) : (
                                            <button className="cdp-write-review" onClick={() => setShowReviewForm(true)}>
                                                <MessageSquare size={16} /> Sharh qoldirish
                                            </button>
                                        )
                                    ) : (
                                        <div className="cdp-login-prompt">
                                            <p>Sharh qoldirish uchun tizimga kiring</p>
                                            <button onClick={() => navigate('/user/login')}>Kirish</button>
                                        </div>
                                    )}

                                    <div className="cdp-reviews-list">
                                        {clinic.reviews?.length === 0 ? (
                                            <div className="cdp-empty-state">
                                                <MessageSquare size={36} />
                                                <p>Hali sharhlar yo'q</p>
                                            </div>
                                        ) : (
                                            clinic.reviews?.map(rv => (
                                                <div key={rv.id} className="cdp-review">
                                                    <div className="cdp-review-top">
                                                        <div className="cdp-reviewer-ava">{rv.user?.initial || '?'}</div>
                                                        <div className="cdp-reviewer-meta">
                                                            <div className="cdp-reviewer-name">{rv.user?.name}</div>
                                                            <div className="cdp-reviewer-sub">
                                                                <Stars rating={rv.rating} size={13} />
                                                                <span>{new Date(rv.createdAt).toLocaleDateString('uz-UZ', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    {rv.comment && <p className="cdp-review-text">{rv.comment}</p>}
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* ── CONTACT ── */}
                            {activeTab === 'contact' && (
                                <div className="cdp-panel">
                                    <div className="cdp-section">
                                        <h3 className="cdp-sec-title"><MapPin size={17} /> Manzil</h3>
                                        <p className="cdp-addr-full">{clinic.fullAddress}</p>
                                        {clinic.landmark && <p className="cdp-landmark">🏢 {clinic.landmark}</p>}
                                        {clinic.latitude && clinic.longitude ? (
                                            <iframe
                                                className="cdp-map"
                                                src={`https://maps.google.com/maps?q=${clinic.latitude},${clinic.longitude}&z=15&output=embed`}
                                                allowFullScreen loading="lazy" title="Xarita"
                                            />
                                        ) : (
                                            <div className="cdp-map-empty">Xarita mavjud emas</div>
                                        )}
                                    </div>

                                    {clinic.phones?.length > 0 && (
                                        <div className="cdp-section">
                                            <h3 className="cdp-sec-title"><Phone size={17} /> Telefon raqamlar</h3>
                                            <div className="cdp-phones">
                                                {clinic.phones.map((p, i) => (
                                                    <a key={i} href={`tel:${p.replace(/\s/g, '')}`} className="cdp-phone">
                                                        <PhoneCall size={18} /><span>{p}</span>
                                                    </a>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {(clinic.website || clinic.emails?.length > 0) && (
                                        <div className="cdp-section">
                                            <h3 className="cdp-sec-title"><Globe size={17} /> Boshqa aloqa</h3>
                                            <div className="cdp-contact-links">
                                                {clinic.website && (
                                                    <a href={clinic.website} target="_blank" rel="noreferrer" className="cdp-contact-link">
                                                        <Globe size={16} /><span>{clinic.website}</span><ExternalLink size={14} />
                                                    </a>
                                                )}
                                                {clinic.emails?.map((em, i) => (
                                                    <a key={i} href={`mailto:${em}`} className="cdp-contact-link">
                                                        <Mail size={16} /><span>{em}</span>
                                                    </a>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* RIGHT — Sidebar */}
                        <aside className="cdp-col-side">
                            {/* Quick call */}
                            {clinic.phones?.[0] && (
                                <div className="cdp-side-card cdp-side-cta">
                                    <a href={`tel:${clinic.phones[0].replace(/\s/g, '')}`} className="cdp-cta-btn">
                                        <PhoneCall size={18} /> Qo'ng'iroq qilish
                                    </a>
                                    <button className="cdp-cta-map" onClick={() => setActiveTab('contact')}>
                                        <MapPin size={18} /> Xaritada ko'rish
                                    </button>
                                </div>
                            )}

                            {/* Info card */}
                            <div className="cdp-side-card">
                                <div className="cdp-side-title">Klinika ma'lumoti</div>
                                <div className="cdp-side-rows">
                                    <div className="cdp-side-row">
                                        <span>Turi</span>
                                        <span>{CLINIC_TYPE_LABELS[clinic.type]}</span>
                                    </div>
                                    <div className="cdp-side-row">
                                        <span>Holati</span>
                                        {(() => {
                                            const open = computeIsOpen(wh) ?? clinic.isOpen;
                                            return (
                                                <span className={`cdp-side-status ${open ? 'open' : 'closed'}`}>
                                                    <span className="cdp-badge-dot" />
                                                    {open ? 'Ochiq' : 'Yopiq'}
                                                </span>
                                            );
                                        })()}
                                    </div>
                                    {clinic.bedsCount > 0 && (
                                        <div className="cdp-side-row">
                                            <span>Karavatlar</span>
                                            <span>{clinic.bedsCount}</span>
                                        </div>
                                    )}
                                    <div className="cdp-side-row">
                                        <span>Tasdiqlangan</span>
                                        <span className="cdp-side-verified"><CheckCircle size={14} /> Ha</span>
                                    </div>
                                </div>
                            </div>

                            {/* Today's hours */}
                            {Object.keys(wh).length > 0 && (() => {
                                const todayHrs = getTodayHours(wh);
                                if (!todayHrs) return null;
                                return (
                                    <div className="cdp-side-card">
                                        <div className="cdp-side-title"><Clock size={15} /> Bugungi ish vaqti</div>
                                        <div className="cdp-today-hours">
                                            {todayHrs.isDayOff
                                                ? <span className="cdp-today-closed">Bugun dam olish kuni</span>
                                                : <><span className="cdp-today-time">{todayHrs.open} – {todayHrs.close}</span><span className="cdp-today-open">Ochiq</span></>
                                            }
                                        </div>
                                    </div>
                                );
                            })()}
                        </aside>
                    </div>
                </div>
            </div>

            <Footer />

            {showAuthModal && (
                <UserAuthModal
                    isOpen={showAuthModal}
                    onClose={() => setShowAuthModal(false)}
                    onSuccess={() => {
                        setShowAuthModal(false);
                        if (pendingBooking && clinic) {
                            navigate(`/user/book/${pendingBooking.service.id}`, {
                                state: { clinicId: clinic.id, serviceType: pendingBooking.serviceType.toUpperCase(), serviceData: pendingBooking.service },
                            });
                        }
                    }}
                />
            )}
        </div>
    );
}
