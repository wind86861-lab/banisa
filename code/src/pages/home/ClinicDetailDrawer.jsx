import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Loader2, Phone, MapPin, Clock, Star } from 'lucide-react';
import { usePublicClinicDetail } from '../../hooks/usePublicClinics';
import { useUserAuth } from '../../shared/auth/UserAuthContext';
import UserAuthModal from './UserAuthModal';
import './css/ClinicDetailDrawer.css';

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
    monday: 'Dushanba',
    tuesday: 'Seshanba',
    wednesday: 'Chorshanba',
    thursday: 'Payshanba',
    friday: 'Juma',
    saturday: 'Shanba',
    sunday: 'Yakshanba',
};
const DAY_ORDER = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

function getTodayKey() {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return days[new Date().getDay()];
}

function computeIsOpen(workingHours) {
    if (!workingHours) return null;
    const wh = normalizeWHCDD(workingHours);
    if (Object.keys(wh).length === 0) return null;
    const now = new Date();
    const todayKey = getTodayKey();
    const day = wh[todayKey];
    if (!day) return null;
    const isDayOff = day.isDayOff !== undefined ? day.isDayOff : (day.isWorking !== undefined ? !day.isWorking : (day.isOpen !== undefined ? !day.isOpen : false));
    if (isDayOff) return false;
    const openStr = day.open ?? day.start ?? day.openTime ?? '08:00';
    const closeStr = day.close ?? day.end ?? day.closeTime ?? '18:00';
    const [oh, om] = openStr.split(':').map(Number);
    const [ch, cm] = closeStr.split(':').map(Number);
    const cur = now.getHours() * 60 + now.getMinutes();
    return cur >= oh * 60 + om && cur < ch * 60 + cm;
}

const CDD_UZ_DAYS = {
    'dushanba': 'monday', 'seshanba': 'tuesday', 'chorshanba': 'wednesday',
    'payshanba': 'thursday', 'juma': 'friday', 'shanba': 'saturday', 'yakshanba': 'sunday',
};
function normalizeWHCDD(raw) {
    if (!raw) return {};
    if (Array.isArray(raw)) {
        const r = {};
        for (const item of raw) {
            const k = CDD_UZ_DAYS[String(item.day || '').toLowerCase()];
            if (k) r[k] = { start: item.from, end: item.to, isDayOff: false };
        }
        return r;
    }
    let schedule = raw.schedule && typeof raw.schedule === 'object' ? raw.schedule : raw;
    const normalized = {};
    for (const [day, val] of Object.entries(schedule)) {
        if (!val || typeof val !== 'object') continue;
        normalized[day] = {
            start: val.start ?? val.openTime ?? '08:00',
            end: val.end ?? val.closeTime ?? '18:00',
            isDayOff: val.isDayOff !== undefined ? val.isDayOff : (val.isWorking !== undefined ? !val.isWorking : (val.isOpen !== undefined ? !val.isOpen : false)),
        };
    }
    return normalized;
}
function imgUrl(src) {
    if (!src) return null;
    if (src.startsWith('/uploads')) return `https://banisa.uz${src}`;
    return src;
}

// ── STAR ROW ────────────────────────────────────────────────────────────────
function StarRow({ rating = 0, onRate, size = 16, readonly = false }) {
    const [hover, setHover] = useState(0);
    const display = hover || rating;
    return (
        <div className="cdd-star-row">
            {[1, 2, 3, 4, 5].map(s => (
                <span
                    key={s}
                    className={s <= display ? 'cdd-star-filled' : 'cdd-star-empty'}
                    style={{ fontSize: size, cursor: readonly ? 'default' : 'pointer' }}
                    onClick={() => !readonly && onRate && onRate(s)}
                    onMouseEnter={() => !readonly && setHover(s)}
                    onMouseLeave={() => !readonly && setHover(0)}
                >
                    ★
                </span>
            ))}
        </div>
    );
}

// ── INFO TAB ────────────────────────────────────────────────────────────────
function InfoTab({ clinic }) {
    const today = getTodayKey();
    const wh = clinic.workingHours || {};

    return (
        <div>
            {/* Description */}
            <div className="cdd-section">
                <h4 className="cdd-section-title">ℹ️ Klinika haqida</h4>
                <p className="cdd-description">
                    {clinic.description || "Ma'lumot kiritilmagan"}
                </p>
            </div>

            {/* Stats */}
            <div className="cdd-section">
                <h4 className="cdd-section-title">📊 Asosiy ko'rsatkichlar</h4>
                <div className="cdd-stat-grid">
                    <div className="cdd-stat-card">
                        <div className="cdd-stat-icon">⭐</div>
                        <div className="cdd-stat-num">{(clinic.averageRating || 0).toFixed(1)}</div>
                        <div className="cdd-stat-label">Reyting</div>
                    </div>
                    <div className="cdd-stat-card">
                        <div className="cdd-stat-icon">📋</div>
                        <div className="cdd-stat-num">{clinic.reviewCount || 0}</div>
                        <div className="cdd-stat-label">Sharhlar</div>
                    </div>
                    <div className="cdd-stat-card">
                        <div className="cdd-stat-icon">🏥</div>
                        <div className="cdd-stat-num">{clinic.serviceCounts?.total || 0}</div>
                        <div className="cdd-stat-label">Xizmatlar</div>
                    </div>
                    <div className="cdd-stat-card">
                        <div className="cdd-stat-icon">👥</div>
                        <div className="cdd-stat-num">{clinic.confirmedAppointments || 0}+</div>
                        <div className="cdd-stat-label">Bemorlar</div>
                    </div>
                </div>
            </div>

            {/* Working hours */}
            {Object.keys(wh).length > 0 && (
                <div className="cdd-section">
                    <h4 className="cdd-section-title">🕐 Ish vaqti</h4>
                    <div className="cdd-hours-table">
                        {DAY_ORDER.map(day => {
                            const normalized = normalizeWHCDD(wh);
                            const hours = normalized[day];
                            const isToday = day === today;
                            const isDayOffVal = hours?.isDayOff ?? true;
                            const working = !isDayOffVal;
                            const openT = hours?.start ?? '';
                            const closeT = hours?.end ?? '';
                            return (
                                <div key={day} className={`cdd-hours-row ${isToday ? 'today' : ''}`}>
                                    <span className="cdd-hours-day">{DAYS_UZ[day]}</span>
                                    <span className="cdd-hours-time">
                                        {working && openT ? `${openT} – ${closeT}` : 'Dam olish'}
                                    </span>
                                    <span className={`cdd-hours-dot ${working ? 'open' : 'closed'}`}>
                                        {working ? '● Ochiq' : '● Yopiq'}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Amenities */}
            <div className="cdd-section">
                <h4 className="cdd-section-title">✨ Imkoniyatlar</h4>
                <div className="cdd-amenity-chips">
                    {clinic.parkingAvailable && <span className="cdd-amenity">🅿 Parking</span>}
                    {clinic.hasEmergency && <span className="cdd-amenity">🚑 Tez yordam</span>}
                    {clinic.hasAmbulance && <span className="cdd-amenity">🚐 Ambulance</span>}
                    {clinic.hasOnlineBooking && <span className="cdd-amenity">🌐 Onlayn bron</span>}
                    {clinic.bedsCount > 0 && <span className="cdd-amenity">🛏 {clinic.bedsCount} karavot</span>}
                    {!clinic.parkingAvailable && !clinic.hasEmergency && !clinic.hasAmbulance && !clinic.hasOnlineBooking && (
                        <span style={{ fontSize: 13, color: '#9ca3af' }}>Ma'lumot yo'q</span>
                    )}
                </div>
            </div>

            {/* Payment methods */}
            {clinic.paymentMethods && (
                <div className="cdd-section">
                    <h4 className="cdd-section-title">💳 To'lov usullari</h4>
                    <div className="cdd-amenity-chips">
                        {(Array.isArray(clinic.paymentMethods)
                            ? clinic.paymentMethods
                            : Object.keys(clinic.paymentMethods)
                        ).map((m, i) => (
                            <span key={i} className="cdd-amenity">{m}</span>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

// ── SERVICES TAB ─────────────────────────────────────────────────────────────
function ServicesTab({ clinic, onBook }) {
    const subTabs = [
        clinic.serviceCounts?.diagnostic > 0 && { id: 'diagnostic', label: 'Diagnostika', count: clinic.serviceCounts.diagnostic, services: clinic.diagnosticServices, icon: '🔬' },
        clinic.serviceCounts?.surgical > 0 && { id: 'surgical', label: 'Jarrohlik', count: clinic.serviceCounts.surgical, services: clinic.surgicalServices, icon: '⚕️' },
        clinic.serviceCounts?.checkup > 0 && { id: 'checkup', label: 'Checkup', count: clinic.serviceCounts.checkup, services: clinic.checkupPackages, icon: '📋' },
        clinic.serviceCounts?.sanatorium > 0 && { id: 'sanatorium', label: 'Sanatoriya', count: clinic.serviceCounts.sanatorium, services: clinic.sanatoriumServices, icon: '🌿' },
    ].filter(Boolean);

    const [activeSubTab, setActiveSubTab] = useState(subTabs[0]?.id || null);
    const currentTab = subTabs.find(t => t.id === activeSubTab);

    if (subTabs.length === 0) {
        return (
            <div className="cdd-empty">
                <span>🏥</span>
                <p>Hali xizmatlar qo'shilmagan</p>
            </div>
        );
    }

    return (
        <div>
            <div className="cdd-service-subtabs">
                {subTabs.map(tab => (
                    <button
                        key={tab.id}
                        className={`cdd-service-subtab ${activeSubTab === tab.id ? 'active' : ''}`}
                        onClick={() => setActiveSubTab(tab.id)}
                    >
                        {tab.icon} {tab.label}
                        <span className="cdd-subtab-count">{tab.count}</span>
                    </button>
                ))}
            </div>
            <div className="cdd-services-list">
                {currentTab?.services.slice(0, 10).map(service => (
                    <div key={service.id} className="cdd-service-card">
                        <div className="cdd-service-info">
                            <div className="cdd-service-name">{service.nameUz}</div>
                            <div className="cdd-service-category">{service.category}</div>
                            {service.duration && (
                                <div className="cdd-service-duration">⏱ {service.duration} daqiqa</div>
                            )}
                        </div>
                        <div className="cdd-service-right">
                            <div className="cdd-service-price">
                                {service.originalPrice && (
                                    <span className="cdd-price-old">
                                        {service.originalPrice.toLocaleString('uz-UZ')} so'm
                                    </span>
                                )}
                                <span className="cdd-price-current">
                                    {(service.price || 0).toLocaleString('uz-UZ')} so'm
                                </span>
                                {service.discountPercent && (
                                    <span className="cdd-price-discount">-{service.discountPercent}%</span>
                                )}
                            </div>
                            <button
                                className="cdd-service-book-btn"
                                onClick={() => onBook(service, activeSubTab)}
                            >
                                Bron qilish →
                            </button>
                        </div>
                    </div>
                ))}
                {currentTab?.services.length > 10 && (
                    <div className="cdd-services-more">
                        +{currentTab.services.length - 10} ta xizmat bor
                    </div>
                )}
            </div>
        </div>
    );
}

// ── REVIEWS TAB ───────────────────────────────────────────────────────────────
function ReviewsTab({ clinic }) {
    const { user } = useUserAuth();
    const navigate = useNavigate();
    const [showForm, setShowForm] = useState(false);
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState('');

    const { averageRating, reviewCount, ratingDistribution, reviews } = clinic;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (rating === 0) return;
        setSubmitting(true);
        setSubmitError('');
        try {
            const { default: api } = await import('../../shared/api/axios');
            await api.post('/user/reviews', {
                clinicId: clinic.id,
                rating,
                comment: comment.trim() || undefined,
            });
            setShowForm(false);
            setRating(0);
            setComment('');
        } catch (err) {
            setSubmitError(err.response?.data?.message ?? 'Xatolik yuz berdi');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div>
            {/* Rating summary */}
            <div className="cdd-rating-summary">
                <div className="cdd-rating-big">
                    <div className="cdd-rating-number">{(averageRating || 0).toFixed(1)}</div>
                    <StarRow rating={averageRating || 0} readonly size={18} />
                    <div className="cdd-rating-total">{reviewCount} sharh</div>
                </div>
                <div className="cdd-rating-bars">
                    {[5, 4, 3, 2, 1].map(star => {
                        const count = ratingDistribution?.[star] ?? 0;
                        const pct = reviewCount > 0 ? (count / reviewCount) * 100 : 0;
                        return (
                            <div key={star} className="cdd-rating-bar-row">
                                <span className="cdd-bar-label">{star}★</span>
                                <div className="cdd-rating-bar">
                                    <div className="cdd-rating-bar-fill" style={{ width: `${pct}%` }} />
                                </div>
                                <span className="cdd-bar-count">{count}</span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Write review */}
            {user ? (
                showForm ? (
                    <form className="cdd-review-form" onSubmit={handleSubmit}>
                        <h4>Sharh qoldiring</h4>
                        <StarRow rating={rating} onRate={setRating} size={28} />
                        <textarea
                            value={comment}
                            onChange={e => setComment(e.target.value)}
                            placeholder="Klinika haqida fikringizni yozing..."
                            rows={3}
                            maxLength={500}
                        />
                        {submitError && <p style={{ color: '#dc2626', fontSize: 13, margin: '8px 0 0' }}>{submitError}</p>}
                        <div className="cdd-form-actions">
                            <button type="button" onClick={() => setShowForm(false)}>Bekor</button>
                            <button type="submit" disabled={rating === 0 || submitting}>
                                {submitting ? 'Yuborilmoqda...' : 'Yuborish'}
                            </button>
                        </div>
                    </form>
                ) : (
                    <button className="cdd-write-review-btn" onClick={() => setShowForm(true)}>
                        ✏️ Sharh qoldirish
                    </button>
                )
            ) : (
                <div className="cdd-review-login-prompt">
                    <p>Sharh qoldirish uchun tizimga kiring</p>
                    <button onClick={() => navigate('/user/login')}>Kirish</button>
                </div>
            )}

            {/* Reviews list */}
            <div className="cdd-reviews-list">
                {reviews.length === 0 ? (
                    <div className="cdd-empty">
                        <span>💬</span>
                        <p>Hali sharhlar yo'q. Birinchi bo'ling!</p>
                    </div>
                ) : (
                    reviews.map(review => (
                        <div key={review.id} className="cdd-review-card">
                            <div className="cdd-review-header">
                                <div className="cdd-reviewer-avatar">{review.user.initial}</div>
                                <div>
                                    <div className="cdd-reviewer-name">{review.user.name}</div>
                                    <div className="cdd-review-meta">
                                        <span className="cdd-review-stars">
                                            {'★'.repeat(Math.round(review.rating))}{'☆'.repeat(5 - Math.round(review.rating))}
                                        </span>
                                        <span className="cdd-review-date">
                                            {new Date(review.createdAt).toLocaleDateString('uz-UZ', {
                                                year: 'numeric', month: 'short', day: 'numeric',
                                            })}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            {review.comment && (
                                <p className="cdd-review-comment">{review.comment}</p>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

// ── CONTACT TAB ───────────────────────────────────────────────────────────────
function ContactTab({ clinic }) {
    const openGoogleMaps = () => {
        if (clinic.latitude && clinic.longitude) {
            window.open(`https://www.google.com/maps?q=${clinic.latitude},${clinic.longitude}`, '_blank');
        } else {
            window.open(`https://www.google.com/maps/search/${encodeURIComponent(clinic.fullAddress)}`, '_blank');
        }
    };

    return (
        <div className="cdd-contact-tab">
            {/* Address */}
            <div className="cdd-contact-section">
                <h4 className="cdd-section-title">📍 Manzil</h4>
                <p className="cdd-full-address">{clinic.fullAddress}</p>
                {clinic.landmark && <p className="cdd-landmark">🏢 Orientir: {clinic.landmark}</p>}

                {clinic.latitude && clinic.longitude ? (
                    <iframe
                        className="cdd-map-iframe"
                        src={`https://maps.google.com/maps?q=${clinic.latitude},${clinic.longitude}&z=15&output=embed`}
                        allowFullScreen
                        loading="lazy"
                        title="Klinika xaritasi"
                    />
                ) : (
                    <div className="cdd-map-placeholder">🗺 Xarita mavjud emas</div>
                )}

                <div className="cdd-map-btns">
                    <button onClick={openGoogleMaps} className="cdd-map-btn">🗺 Google Maps</button>
                    <button
                        onClick={() => window.open(`https://yandex.com/maps/?text=${encodeURIComponent(clinic.fullAddress)}`, '_blank')}
                        className="cdd-map-btn"
                    >
                        🗺 Yandex Maps
                    </button>
                </div>
            </div>

            {/* Phones */}
            {clinic.phones?.length > 0 && (
                <div className="cdd-contact-section">
                    <h4 className="cdd-section-title">📞 Telefon raqamlar</h4>
                    {clinic.phones.map((phone, i) => (
                        <div key={i} className="cdd-phone-row">
                            <span className="cdd-phone-number">{phone}</span>
                            <a href={`tel:${phone.replace(/\s/g, '')}`} className="cdd-call-btn">
                                Qo'ng'iroq
                            </a>
                        </div>
                    ))}
                </div>
            )}

            {/* Other contacts */}
            {(clinic.website || (Array.isArray(clinic.emails) && clinic.emails.length > 0)) && (
                <div className="cdd-contact-section">
                    <h4 className="cdd-section-title">🌐 Boshqa aloqa</h4>
                    {clinic.website && (
                        <a href={clinic.website} target="_blank" rel="noreferrer" className="cdd-website-link">
                            🌐 {clinic.website}
                        </a>
                    )}
                    {Array.isArray(clinic.emails) && clinic.emails.map((email, i) => (
                        <a key={i} href={`mailto:${email}`} className="cdd-email-link">
                            📧 {email}
                        </a>
                    ))}
                </div>
            )}

            {/* Social Media */}
            {clinic.socialMedia && Object.keys(clinic.socialMedia).length > 0 && (
                <div className="cdd-contact-section">
                    <h4 className="cdd-section-title">📱 Ijtimoiy tarmoqlar</h4>
                    {clinic.socialMedia.telegram && (
                        <a href={clinic.socialMedia.telegram} target="_blank" rel="noreferrer" className="cdd-social-link">
                            📱 Telegram
                        </a>
                    )}
                    {clinic.socialMedia.instagram && (
                        <a href={clinic.socialMedia.instagram} target="_blank" rel="noreferrer" className="cdd-social-link">
                            📸 Instagram
                        </a>
                    )}
                </div>
            )}
        </div>
    );
}

// ── MAIN DRAWER ───────────────────────────────────────────────────────────────
const TABS = [
    { id: 'info', label: "Ma'lumot", icon: 'ℹ️' },
    { id: 'services', label: 'Xizmatlar', icon: '🏥' },
    { id: 'reviews', label: 'Sharhlar', icon: '⭐' },
    { id: 'contact', label: 'Aloqa', icon: '📍' },
];

export default function ClinicDetailDrawer({ clinicId, onClose }) {
    const { data: clinic, isLoading } = usePublicClinicDetail(clinicId);
    const { user } = useUserAuth();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('info');
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [pendingBooking, setPendingBooking] = useState(null);

    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = ''; };
    }, []);

    useEffect(() => {
        const handler = (e) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [onClose]);

    const handleBookService = (service, serviceType) => {
        if (!user) {
            setPendingBooking({ service, serviceType });
            setShowAuthModal(true);
            return;
        }
        navigate(`/user/book/${service.id}`, {
            state: {
                clinicId: clinic.id,
                serviceType: serviceType.toUpperCase(),
                serviceData: service,
            },
        });
        onClose();
    };

    return (
        <>
            <div className="cdd-overlay" onClick={onClose} />

            <div className="cdd-drawer open">
                {isLoading ? (
                    <div className="cdd-loading">
                        <Loader2 size={32} className="spinning" />
                        <p>Yuklanmoqda...</p>
                    </div>
                ) : !clinic ? (
                    <div className="cdd-error">
                        <p>Ma'lumot topilmadi</p>
                        <button onClick={onClose} style={{ marginTop: 12, padding: '8px 20px', background: '#00BDE0', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
                            Yopish
                        </button>
                    </div>
                ) : (
                    <>
                        {/* Header */}
                        <div className="cdd-header">
                            <button className="cdd-close-btn" onClick={onClose}>
                                <X size={18} />
                            </button>
                            <div className="cdd-header-main">
                                {imgUrl(clinic.logo) ? (
                                    <img src={imgUrl(clinic.logo)} alt={clinic.nameUz} className="cdd-logo" />
                                ) : (
                                    <div className="cdd-logo-placeholder">{clinic.nameUz?.[0]}</div>
                                )}
                                <div className="cdd-header-info">
                                    <h2 className="cdd-name">{clinic.nameUz}</h2>
                                    <div className="cdd-rating-row">
                                        <span className="cdd-star">★</span>
                                        <span className="cdd-rating-val">{(clinic.averageRating || 0).toFixed(1)}</span>
                                        <span className="cdd-review-count">({clinic.reviewCount} sharh)</span>
                                    </div>
                                    <div className="cdd-address-row">
                                        <MapPin size={13} style={{ display: 'inline', marginRight: 4 }} />
                                        {clinic.fullAddress}
                                    </div>
                                    <div className="cdd-badge-row">
                                        <span className="cdd-type-badge">{CLINIC_TYPE_LABELS[clinic.type] || clinic.type}</span>
                                        {(() => {
                                            const open = computeIsOpen(clinic.workingHours) ?? clinic.isOpen;
                                            return (
                                                <span className={open ? 'cdd-open-badge' : 'cdd-closed-badge'}>
                                                    {open ? '● Hozir ochiq' : '● Yopiq'}
                                                </span>
                                            );
                                        })()}
                                        {clinic.hasEmergency && (
                                            <span className="cdd-emergency-badge">🚑 Tez yordam</span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="cdd-action-row">
                                <button className="cdd-action-primary" onClick={() => setActiveTab('services')}>
                                    🏥 Xizmatlarni ko'rish
                                </button>
                                {clinic.phones?.[0] && (
                                    <a href={`tel:${clinic.phones[0].replace(/\s/g, '')}`} className="cdd-action-outline">
                                        <Phone size={15} /> Qo'ng'iroq
                                    </a>
                                )}
                                <button className="cdd-action-ghost" onClick={() => setActiveTab('contact')}>
                                    🗺 Xarita
                                </button>
                            </div>
                        </div>

                        {/* Tabs */}
                        <div className="cdd-tabs">
                            {TABS.map(tab => (
                                <button
                                    key={tab.id}
                                    className={`cdd-tab ${activeTab === tab.id ? 'active' : ''}`}
                                    onClick={() => setActiveTab(tab.id)}
                                >
                                    {tab.icon} {tab.label}
                                    {tab.id === 'services' && clinic.serviceCounts?.total > 0 && (
                                        <span className="cdd-tab-count">{clinic.serviceCounts.total}</span>
                                    )}
                                    {tab.id === 'reviews' && clinic.reviewCount > 0 && (
                                        <span className="cdd-tab-count">{clinic.reviewCount}</span>
                                    )}
                                </button>
                            ))}
                        </div>

                        {/* Tab content */}
                        <div className="cdd-tab-content">
                            {activeTab === 'info' && <InfoTab clinic={clinic} />}
                            {activeTab === 'services' && (
                                <ServicesTab clinic={clinic} onBook={handleBookService} />
                            )}
                            {activeTab === 'reviews' && <ReviewsTab clinic={clinic} />}
                            {activeTab === 'contact' && <ContactTab clinic={clinic} />}
                        </div>
                    </>
                )}
            </div>

            {showAuthModal && (
                <UserAuthModal
                    isOpen={showAuthModal}
                    onClose={() => setShowAuthModal(false)}
                    onSuccess={() => {
                        setShowAuthModal(false);
                        if (pendingBooking && clinic) {
                            navigate(`/user/book/${pendingBooking.service.id}`, {
                                state: {
                                    clinicId: clinic.id,
                                    serviceType: pendingBooking.serviceType.toUpperCase(),
                                    serviceData: pendingBooking.service,
                                },
                            });
                            onClose();
                        }
                    }}
                />
            )}
        </>
    );
}
