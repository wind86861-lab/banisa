import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft, MapPin, Phone, Mail, Globe,
    FileText, Shield, Star, Calendar,
    Activity, Edit, Ban, Clock, Loader2, AlertCircle,
    Stethoscope, UserCheck, Search, LayoutGrid,
    FlaskConical, Package,
} from 'lucide-react';
import {
    useClinicById, useClinicStats, useClinicServices,
    useClinicDoctors, useClinicReviews,
} from './hooks/useClinics';
import './ClinicDetailPage.css';

const DAY_LABELS = {
    monday: 'Dushanba', tuesday: 'Seshanba', wednesday: 'Chorshanba',
    thursday: 'Payshanba', friday: 'Juma', saturday: 'Shanba', sunday: 'Yakshanba',
};

const DAY_ORDER = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

function normalizeWorkingHours(raw) {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    const schedule = raw.schedule || raw;
    if (typeof schedule !== 'object') return [];
    return DAY_ORDER.map(day => {
        const dayData = schedule[day];
        if (!dayData || typeof dayData !== 'object') return null;
        return {
            day,
            isOpen: dayData.isDayOff !== undefined ? !dayData.isDayOff : (dayData.isOpen ?? true),
            openTime: dayData.start || dayData.openTime || '08:00',
            closeTime: dayData.end || dayData.closeTime || '18:00',
        };
    }).filter(Boolean);
}

const STATUS_MAP = {
    PENDING: { label: 'Kutilmoqda', cls: 'pending' },
    APPROVED: { label: 'Tasdiqlangan', cls: 'approved' },
    REJECTED: { label: 'Rad etilgan', cls: 'rejected' },
    BLOCKED: { label: 'Bloklangan', cls: 'blocked' },
};

export default function ClinicDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [activeTopTab, setActiveTopTab] = useState('profile');
    const [svcSearch, setSvcSearch] = useState('');

    const { data: clinic, isLoading, error } = useClinicById(id);
    const { data: stats } = useClinicStats(id);
    const { data: services } = useClinicServices(id);
    const { data: doctors } = useClinicDoctors(id);
    const { data: reviews } = useClinicReviews(id);

    const diagnosticList = services?.diagnostic || [];
    const surgicalList = services?.surgical || [];
    const checkupList = services?.checkup || [];
    const reviewsList = reviews || [];

    // ── Rating distribution for reviews tab ──
    const ratingDist = useMemo(() => {
        if (!reviewsList.length) return [0, 0, 0, 0, 0];
        const counts = [0, 0, 0, 0, 0];
        reviewsList.forEach(r => {
            const idx = Math.min(Math.max(Math.round(r.rating) - 1, 0), 4);
            counts[idx]++;
        });
        return counts;
    }, [reviewsList]);

    // ── Top tabs config ──
    const TOP_TABS = [
        { id: 'profile', label: 'Profil', icon: LayoutGrid, badge: null },
        { id: 'diagnostic', label: 'Xizmatlar', icon: FlaskConical, badge: diagnosticList.length || null },
        { id: 'surgical', label: 'Operatsiyalar', icon: Stethoscope, badge: surgicalList.length || null },
        { id: 'checkup', label: 'Checkup', icon: Package, badge: checkupList.length || null },
        { id: 'doctors', label: 'Shifokorlar', icon: UserCheck, badge: doctors?.length || null },
        { id: 'reviews', label: 'Sharhlar', icon: Star, badge: clinic?.reviewCount || null },
    ];

    // ── Loading / Error ──
    if (isLoading) return (
        <div className="cdp-loading">
            <Loader2 size={36} className="spin" />
            <span>Yuklanmoqda...</span>
        </div>
    );

    if (error || !clinic) return (
        <div className="cdp-error">
            <AlertCircle size={18} /> {error?.message || 'Klinika topilmadi'}
        </div>
    );

    const status = STATUS_MAP[clinic.status] || STATUS_MAP.PENDING;
    const phones = Array.isArray(clinic.phones) ? clinic.phones : [];
    const emails = Array.isArray(clinic.emails) ? clinic.emails : [];
    const workingHours = normalizeWorkingHours(clinic.workingHours);

    const mapSrc = clinic.latitude && clinic.longitude
        ? `https://maps.google.com/maps?q=${clinic.latitude},${clinic.longitude}&z=15&output=embed`
        : `https://maps.google.com/maps?q=${encodeURIComponent((clinic.region || '') + ' ' + (clinic.street || ''))}&z=14&output=embed`;

    // ═══════════════════════════════════════════════════════════════════════
    // TAB RENDERERS
    // ═══════════════════════════════════════════════════════════════════════

    const renderProfileTab = () => (
        <div className="clinic-detail-body">
            {/* LEFT PANEL */}
            <div className="clinic-left-panel">
                {/* Map */}
                <div className="map-card">
                    <iframe className="map-iframe" src={mapSrc} allowFullScreen loading="lazy" title="Klinika joylashuvi" />
                    <div className="map-floating-card">
                        <div className="map-floating-title">{clinic.nameUz}</div>
                        <div className="map-floating-address">
                            <MapPin size={12} color="var(--color-primary)" />
                            {[clinic.region, clinic.district, clinic.street].filter(Boolean).join(', ')}
                        </div>
                    </div>
                </div>

                {/* Contact chips */}
                {(phones.length > 0 || emails.length > 0 || clinic.website) && (
                    <div className="cdp-contact-row">
                        {phones.slice(0, 3).map((ph, i) => (
                            <div className="contact-chip" key={i}><Phone size={14} /> {ph}</div>
                        ))}
                        {emails.slice(0, 2).map((em, i) => (
                            <div className="contact-chip" key={`e-${i}`}><Mail size={14} /> {em}</div>
                        ))}
                        {clinic.website && (
                            <div className="contact-chip"><Globe size={14} /> {clinic.website}</div>
                        )}
                    </div>
                )}

                {/* About */}
                {clinic.description && (
                    <div className="cdp-section-card">
                        <div className="cdp-section-label">Tavsif</div>
                        <p className="cdp-about-text">{clinic.description}</p>
                    </div>
                )}

                {/* Documents */}
                <div className="cdp-section-card">
                    <div className="cdp-section-label">Hujjatlar</div>
                    <div className="cdp-docs-grid">
                        {[
                            { label: 'Litsenziya', value: clinic.licenseNumber, icon: <FileText size={16} /> },
                            { label: 'INN / STIR', value: clinic.taxId, icon: <Shield size={16} /> },
                            { label: "Ro'yxat raqami", value: clinic.registrationNumber, icon: <FileText size={16} /> },
                            { label: 'Litsenziya muddati', value: clinic.licenseExpiresAt ? new Date(clinic.licenseExpiresAt).toLocaleDateString('uz-UZ') : null, icon: <Clock size={16} /> },
                        ].map(({ label, value, icon }) => (
                            <div className="cdp-doc-item" key={label}>
                                <div className="cdp-doc-icon">{icon}</div>
                                <div>
                                    <div className="cdp-doc-label">{label}</div>
                                    <div className="cdp-doc-value">{value || '—'}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Staff */}
                <div className="cdp-section-card">
                    <div className="cdp-section-label">👤 Mas'ul shaxslar</div>
                    <div className="cdp-staff-row">
                        {clinic.adminFirstName ? (
                            <div className="cdp-staff-card">
                                <div className="cdp-staff-avatar">
                                    {clinic.adminFirstName?.[0]}{clinic.adminLastName?.[0]}
                                </div>
                                <div>
                                    <div className="cdp-staff-name">{clinic.adminFirstName} {clinic.adminLastName}</div>
                                    <div className="cdp-staff-position">{clinic.adminPosition || "Mas'ul shaxs"}</div>
                                    {clinic.adminPhone && <div className="cdp-staff-phone">📞 {clinic.adminPhone}</div>}
                                </div>
                            </div>
                        ) : (
                            <div className="cdp-empty" style={{ width: '100%' }}>Ma'lumot yo'q</div>
                        )}
                    </div>
                </div>
            </div>

            {/* RIGHT PANEL */}
            <div className="clinic-right-panel">
                {/* Stats 2x2 */}
                <div className="cdp-stats-grid">
                    <div className="cdp-stat-card">
                        <div className="cdp-stat-icon teal"><Calendar size={18} /></div>
                        <div className="cdp-stat-label">Jami bronlar</div>
                        <div className="cdp-stat-value">{stats?.appointments?.total?.toLocaleString() || '0'}</div>
                        <div className="cdp-stat-sub">{stats?.appointments?.completed || 0} bajarilgan</div>
                    </div>
                    <div className="cdp-stat-card">
                        <div className="cdp-stat-icon blue"><Activity size={18} /></div>
                        <div className="cdp-stat-label">Faol xizmatlar</div>
                        <div className="cdp-stat-value">{(diagnosticList.length + surgicalList.length) || '0'}</div>
                        <div className="cdp-stat-sub">Diagnostika + Operatsiya</div>
                    </div>
                    <div className="cdp-stat-card">
                        <div className="cdp-stat-icon green"><Stethoscope size={18} /></div>
                        <div className="cdp-stat-label">Shifokorlar</div>
                        <div className="cdp-stat-value">{stats?.doctors || doctors?.length || '0'}</div>
                        <div className="cdp-stat-sub">Faol</div>
                    </div>
                    <div className="cdp-stat-card">
                        <div className="cdp-stat-icon yellow"><Star size={18} /></div>
                        <div className="cdp-stat-label">Reyting</div>
                        <div className="cdp-stat-value">{clinic.averageRating?.toFixed(1) || '0.0'}</div>
                        <div className="cdp-stat-sub">{clinic.reviewCount || 0} sharh</div>
                    </div>
                </div>

                {/* Working hours */}
                <div className="cdp-section-card">
                    <div className="cdp-section-label">📅 Ish vaqti</div>
                    {workingHours.length > 0 ? (
                        <div className="cdp-wh-grid">
                            {workingHours.map((wh, i) => (
                                <div className="cdp-wh-item" key={i}>
                                    <span className="cdp-wh-day">{DAY_LABELS[wh.day] || wh.day}</span>
                                    {wh.isOpen ? (
                                        <span className="cdp-wh-time">
                                            <span style={{ color: 'var(--color-success)', marginRight: '6px' }}>●</span>
                                            {wh.openTime} – {wh.closeTime}
                                        </span>
                                    ) : (
                                        <span className="cdp-wh-closed">
                                            <span style={{ color: 'var(--color-error)', marginRight: '6px' }}>●</span>
                                            Dam olish
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : <div className="cdp-empty">Ish vaqti belgilanmagan</div>}
                </div>

                {/* Amenities */}
                <div className="cdp-section-card">
                    <div className="cdp-section-label">✨ Imkoniyatlar</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {clinic.hasEmergency && <span className="cdp-amenity-chip">🚑 Tez yordam</span>}
                        {clinic.hasAmbulance && <span className="cdp-amenity-chip">🚐 Ambulans</span>}
                        {clinic.parkingAvailable && <span className="cdp-amenity-chip">🅿️ Parking</span>}
                        {clinic.hasOnlineBooking && <span className="cdp-amenity-chip">💻 Onlayn bron</span>}
                        {clinic.bedsCount > 0 && <span className="cdp-amenity-chip">🛏️ {clinic.bedsCount} karavot</span>}
                        {!clinic.hasEmergency && !clinic.hasAmbulance && !clinic.parkingAvailable && !clinic.hasOnlineBooking && clinic.bedsCount === 0 && (
                            <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>Ma'lumot yo'q</span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );

    const renderDiagnosticTab = () => {
        const filtered = diagnosticList.filter(s =>
            !svcSearch || s.nameUz?.toLowerCase().includes(svcSearch.toLowerCase())
        );
        return (
            <div>
                <div className="cdp-tab-toolbar">
                    <div className="cdp-tab-search">
                        <Search size={16} />
                        <input placeholder="Xizmat qidirish..." value={svcSearch} onChange={e => setSvcSearch(e.target.value)} />
                    </div>
                    <span className="cdp-tab-count">Jami: {diagnosticList.length} ta xizmat</span>
                </div>
                {filtered.length === 0 ? (
                    <div className="cdp-empty">Diagnostika xizmatlari topilmadi</div>
                ) : (
                    <div className="cdp-table-wrap">
                        <table className="master-table">
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Xizmat nomi</th>
                                    <th>Kategoriya</th>
                                    <th>Narx (tavsiya)</th>
                                    <th>Min — Max</th>
                                    <th>Muddat</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((svc, i) => (
                                    <tr key={svc.id || i}>
                                        <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{i + 1}</td>
                                        <td>
                                            <div style={{ fontWeight: 600, fontSize: 13 }}>{svc.nameUz}</div>
                                            {svc.nameRu && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{svc.nameRu}</div>}
                                        </td>
                                        <td><span className="cat-badge">{svc.category?.nameUz || '—'}</span></td>
                                        <td style={{ fontWeight: 600, color: 'var(--color-primary)' }}>
                                            {svc.priceRecommended?.toLocaleString() || '—'} so'm
                                        </td>
                                        <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                            {svc.priceMin?.toLocaleString() || '—'} — {svc.priceMax?.toLocaleString() || '—'}
                                        </td>
                                        <td style={{ fontSize: 12 }}>
                                            {svc.resultTimeHours ? `${svc.resultTimeHours} soat` : '—'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        );
    };

    const renderSurgicalTab = () => {
        const filtered = surgicalList.filter(s =>
            !svcSearch || s.nameUz?.toLowerCase().includes(svcSearch.toLowerCase())
        );
        return (
            <div>
                <div className="cdp-tab-toolbar">
                    <div className="cdp-tab-search">
                        <Search size={16} />
                        <input placeholder="Operatsiya qidirish..." value={svcSearch} onChange={e => setSvcSearch(e.target.value)} />
                    </div>
                    <span className="cdp-tab-count">Jami: {surgicalList.length} ta operatsiya</span>
                </div>
                {filtered.length === 0 ? (
                    <div className="cdp-empty">Operatsiyalar topilmadi</div>
                ) : (
                    <div className="cdp-table-wrap">
                        <table className="master-table">
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Xizmat nomi</th>
                                    <th>Murakkablik</th>
                                    <th>Narx</th>
                                    <th>Anesteziya</th>
                                    <th>Tiklash</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((svc, i) => (
                                    <tr key={svc.id || i}>
                                        <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{i + 1}</td>
                                        <td>
                                            <div style={{ fontWeight: 600, fontSize: 13 }}>{svc.nameUz}</div>
                                            {svc.nameRu && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{svc.nameRu}</div>}
                                        </td>
                                        <td>
                                            <span className={`complexity-badge ${svc.complexity || ''}`}>
                                                {svc.complexity || '—'}
                                            </span>
                                        </td>
                                        <td style={{ fontWeight: 600, color: '#ef4444' }}>
                                            {svc.priceMin?.toLocaleString() || '—'} — {svc.priceMax?.toLocaleString() || '—'} so'm
                                        </td>
                                        <td style={{ fontSize: 12 }}>{svc.anesthesiaType || '—'}</td>
                                        <td style={{ fontSize: 12 }}>
                                            {svc.recoveryDays ? `${svc.recoveryDays} kun` : '—'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        );
    };

    const renderCheckupTab = () => (
        <div>
            <div className="cdp-tab-toolbar">
                <span className="cdp-tab-count">Jami: {checkupList.length} ta paket</span>
            </div>
            {checkupList.length === 0 ? (
                <div className="cdp-empty">Checkup paketlar topilmadi</div>
            ) : (
                <div className="cdp-checkup-grid">
                    {checkupList.map((pkg, i) => (
                        <div className="cdp-checkup-card" key={pkg.id || i}>
                            <div className="cdp-checkup-name">{pkg.nameUz}</div>
                            <div className="cdp-checkup-meta">
                                <span className="cdp-cat-badge">{pkg.category || 'BASIC'}</span>
                                <span className="cdp-checkup-items">{pkg.itemCount || pkg.items?.length || 0} ta xizmat</span>
                            </div>
                            {pkg.clinicPrice ? (
                                <div className="cdp-checkup-price">{pkg.clinicPrice.toLocaleString()} so'm</div>
                            ) : (
                                <div className="cdp-checkup-price">{pkg.recommendedPrice?.toLocaleString() || '—'} so'm</div>
                            )}
                            <div className="cdp-checkup-price-range">
                                Diapazon: {pkg.priceMin?.toLocaleString()} — {pkg.priceMax?.toLocaleString()} so'm
                            </div>
                            {pkg.shortDescription && (
                                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8, lineHeight: 1.5 }}>
                                    {pkg.shortDescription}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );

    const renderDoctorsTab = () => {
        const doctorsList = doctors || [];
        return (
            <div>
                <div className="cdp-tab-toolbar">
                    <span className="cdp-tab-count">Jami: {doctorsList.length} ta shifokor</span>
                </div>
                {doctorsList.length === 0 ? (
                    <div className="cdp-empty">Shifokorlar topilmadi</div>
                ) : (
                    <div className="cdp-doctors-grid">
                        {doctorsList.map((doc, i) => (
                            <div className="cdp-doctor-card" key={doc.id || i}>
                                <div className="cdp-doctor-card-avatar">
                                    {doc.firstName?.[0]}{doc.lastName?.[0]}
                                </div>
                                <div className="cdp-doctor-card-name">{doc.firstName} {doc.lastName}</div>
                                <div className="cdp-doctor-card-spec">{doc.specialty || 'Umumiy amaliyot'}</div>
                                {doc.phone && <div className="cdp-doctor-card-phone">{doc.phone}</div>}
                                <span className={`cdp-status-badge ${doc.isActive ? 'approved' : 'rejected'}`} style={{ fontSize: 11 }}>
                                    {doc.isActive ? 'Faol' : 'Nofaol'}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    const renderReviewsTab = () => {
        const total = reviewsList.length;
        const avgRating = clinic.averageRating || 0;

        return (
            <div>
                {/* Rating summary */}
                <div className="cdp-rating-summary">
                    <div className="cdp-rating-big">
                        <div className="cdp-rating-big-number">{avgRating.toFixed(1)}</div>
                        <div className="cdp-rating-big-stars">
                            {[...Array(5)].map((_, i) => (
                                <Star key={i} size={18} fill={i < Math.round(avgRating) ? '#fbbf24' : 'none'} color="#fbbf24" />
                            ))}
                        </div>
                        <div className="cdp-rating-big-count">{total} sharh</div>
                    </div>
                    <div className="cdp-rating-bars">
                        {[5, 4, 3, 2, 1].map(star => {
                            const count = ratingDist[star - 1];
                            const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                            return (
                                <div className="cdp-rating-bar-row" key={star}>
                                    <span className="cdp-rating-bar-label">{star}</span>
                                    <div className="cdp-rating-bar-track">
                                        <div className="cdp-rating-bar-fill" style={{ width: `${pct}%` }} />
                                    </div>
                                    <span className="cdp-rating-bar-pct">{pct}%</span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Reviews list */}
                {reviewsList.length === 0 ? (
                    <div className="cdp-empty">Sharhlar topilmadi</div>
                ) : (
                    <div className="cdp-reviews-list">
                        {reviewsList.map((rev, i) => (
                            <div className="cdp-review-card" key={rev.id || i}>
                                <div className="cdp-review-card-avatar">
                                    {rev.user?.firstName?.[0] || '?'}
                                </div>
                                <div className="cdp-review-card-body">
                                    <div className="cdp-review-card-header">
                                        <div>
                                            <div className="cdp-review-card-name">
                                                {rev.user?.firstName} {rev.user?.lastName}
                                            </div>
                                            <div className="cdp-review-stars">
                                                {[...Array(5)].map((_, si) => (
                                                    <Star key={si} size={12} fill={si < Math.round(rev.rating) ? '#fbbf24' : 'none'} color="#fbbf24" />
                                                ))}
                                            </div>
                                        </div>
                                        <span className="cdp-review-card-date">
                                            {new Date(rev.createdAt).toLocaleDateString('uz-UZ')}
                                        </span>
                                    </div>
                                    {rev.comment && (
                                        <div className="cdp-review-card-text">{rev.comment}</div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    // ═══════════════════════════════════════════════════════════════════════
    // RENDER
    // ═══════════════════════════════════════════════════════════════════════

    return (
        <div className="clinic-detail-page">

            {/* ══════ PAGE HEADER ══════ */}
            <div className="clinic-detail-header">
                <button className="btn-back" onClick={() => navigate('/admin/clinics')}>
                    <ArrowLeft size={16} /> Orqaga
                </button>
                <h1 className="clinic-detail-title">{clinic.nameUz}</h1>
                <span className={`cdp-status-badge ${status.cls}`}>{status.label}</span>
                <div className="clinic-detail-actions">
                    <button className="cdp-btn cdp-btn-primary" onClick={() => navigate('/admin/clinics')}>
                        <Edit size={16} /> Tahrirlash
                    </button>
                    {clinic.status !== 'BLOCKED' ? (
                        <button className="cdp-btn cdp-btn-danger"><Ban size={16} /> Bloklash</button>
                    ) : (
                        <button className="cdp-btn cdp-btn-success"><Ban size={16} /> Faollashtirish</button>
                    )}
                </div>
            </div>

            {/* ══════ TOP TAB BAR ══════ */}
            <div className="cdp-top-tabs">
                {TOP_TABS.map(tab => {
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.id}
                            className={`cdp-top-tab-btn ${activeTopTab === tab.id ? 'active' : ''}`}
                            onClick={() => { setActiveTopTab(tab.id); setSvcSearch(''); }}
                        >
                            <Icon size={15} />
                            {tab.label}
                            {tab.badge > 0 && (
                                <span className="cdp-top-tab-badge">{tab.badge}</span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* ══════ TAB CONTENT ══════ */}
            <div className="cdp-tab-page-content" key={activeTopTab}>
                {activeTopTab === 'profile' && renderProfileTab()}
                {activeTopTab === 'diagnostic' && renderDiagnosticTab()}
                {activeTopTab === 'surgical' && renderSurgicalTab()}
                {activeTopTab === 'checkup' && renderCheckupTab()}
                {activeTopTab === 'doctors' && renderDoctorsTab()}
                {activeTopTab === 'reviews' && renderReviewsTab()}
            </div>

        </div>
    );
}
