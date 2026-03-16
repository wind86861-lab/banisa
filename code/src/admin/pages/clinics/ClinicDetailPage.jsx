import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft, MapPin, Phone, Mail, Globe,
    FileText, Shield, Users, Star, Calendar,
    Activity, Edit, Ban, Clock, Loader2, AlertCircle,
    Stethoscope, UserCheck,
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

const STATUS_MAP = {
    PENDING:  { label: 'Kutilmoqda',   cls: 'pending' },
    APPROVED: { label: 'Tasdiqlangan', cls: 'approved' },
    REJECTED: { label: 'Rad etilgan',  cls: 'rejected' },
    BLOCKED:  { label: 'Bloklangan',   cls: 'blocked' },
};

const TABS = ['Xizmatlar', 'Operatsiyalar', 'Ish vaqti'];

export default function ClinicDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState(0);

    const { data: clinic, isLoading, error } = useClinicById(id);
    const { data: stats } = useClinicStats(id);
    const { data: services } = useClinicServices(id);
    const { data: doctors } = useClinicDoctors(id);
    const { data: reviews } = useClinicReviews(id);

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
    const workingHours = Array.isArray(clinic.workingHours) ? clinic.workingHours : [];
    const diagnosticList = services?.diagnostic || [];
    const surgicalList = services?.surgical || [];

    const mapSrc = clinic.latitude && clinic.longitude
        ? `https://maps.google.com/maps?q=${clinic.latitude},${clinic.longitude}&z=15&output=embed`
        : `https://maps.google.com/maps?q=${encodeURIComponent((clinic.region || '') + ' ' + (clinic.street || ''))}&z=14&output=embed`;

    // ── Tab content renderer ──
    const renderTabContent = () => {
        switch (activeTab) {
            case 0:
                return diagnosticList.length > 0 ? diagnosticList.map((svc, i) => (
                    <div className="cdp-svc-item" key={svc.id || i}>
                        <div className="cdp-svc-left">
                            <div className="cdp-svc-dot" />
                            <div>
                                <div className="cdp-svc-name">{svc.nameUz}</div>
                                <div className="cdp-svc-category">{svc.category?.nameUz || '—'}</div>
                            </div>
                        </div>
                        <div className="cdp-svc-price">
                            {svc.priceRecommended?.toLocaleString() || svc.priceMin?.toLocaleString() || '—'} so'm
                        </div>
                    </div>
                )) : <div className="cdp-empty">Diagnostika xizmatlari topilmadi</div>;

            case 1:
                return surgicalList.length > 0 ? surgicalList.map((svc, i) => (
                    <div className="cdp-svc-item" key={svc.id || i}>
                        <div className="cdp-svc-left">
                            <div className="cdp-svc-dot" style={{ background: '#ef4444' }} />
                            <div>
                                <div className="cdp-svc-name">{svc.nameUz}</div>
                                <div className="cdp-svc-category">{svc.complexity || '—'}</div>
                            </div>
                        </div>
                        <div className="cdp-svc-price" style={{ color: '#ef4444' }}>
                            {svc.priceMin?.toLocaleString() || '—'} so'm
                        </div>
                    </div>
                )) : <div className="cdp-empty">Operatsiyalar topilmadi</div>;

            case 2: {
                return workingHours.length > 0 ? (
                    <div className="cdp-wh-grid">
                        {workingHours.map((wh, i) => (
                            <div className="cdp-wh-item" key={i}>
                                <span className="cdp-wh-day">{DAY_LABELS[wh.day] || wh.day}</span>
                                {wh.isOpen
                                    ? <span className="cdp-wh-time">{wh.openTime} – {wh.closeTime}</span>
                                    : <span className="cdp-wh-closed">Dam olish</span>
                                }
                            </div>
                        ))}
                    </div>
                ) : <div className="cdp-empty">Ish vaqti belgilanmagan</div>;
            }
            default: return null;
        }
    };

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
                    <button className="cdp-btn cdp-btn-primary" onClick={() => navigate(`/admin/clinics`)}>
                        <Edit size={16} /> Tahrirlash
                    </button>
                    {clinic.status !== 'BLOCKED' ? (
                        <button className="cdp-btn cdp-btn-danger">
                            <Ban size={16} /> Bloklash
                        </button>
                    ) : (
                        <button className="cdp-btn cdp-btn-success">
                            <Ban size={16} /> Faollashtirish
                        </button>
                    )}
                </div>
            </div>

            {/* ══════ TWO-COLUMN BODY ══════ */}
            <div className="clinic-detail-body">

                {/* ═══ LEFT PANEL ═══ */}
                <div className="clinic-left-panel">

                    {/* Map */}
                    <div className="map-card">
                        <iframe
                            className="map-iframe"
                            src={mapSrc}
                            allowFullScreen
                            loading="lazy"
                            title="Klinika joylashuvi"
                        />
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
                                <div className="contact-chip" key={i}>
                                    <Phone size={14} /> {ph}
                                </div>
                            ))}
                            {emails.slice(0, 2).map((em, i) => (
                                <div className="contact-chip" key={`e-${i}`}>
                                    <Mail size={14} /> {em}
                                </div>
                            ))}
                            {clinic.website && (
                                <div className="contact-chip">
                                    <Globe size={14} /> {clinic.website}
                                </div>
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

                    {/* Staff / Admin */}
                    <div className="cdp-section-card">
                        <div className="cdp-section-label">Mas'ul shaxslar</div>
                        <div className="cdp-staff-row">
                            {clinic.adminFirstName ? (
                                <div className="cdp-staff-card">
                                    <div className="cdp-staff-avatar">
                                        {clinic.adminFirstName?.[0]}{clinic.adminLastName?.[0]}
                                    </div>
                                    <div className="cdp-staff-name">
                                        {clinic.adminFirstName} {clinic.adminLastName}
                                    </div>
                                    <div className="cdp-staff-position">
                                        {clinic.adminPosition || "Mas'ul shaxs"}
                                    </div>
                                    {clinic.adminPhone && (
                                        <div className="cdp-staff-phone">{clinic.adminPhone}</div>
                                    )}
                                </div>
                            ) : (
                                <div className="cdp-empty" style={{ width: '100%' }}>Ma'lumot yo'q</div>
                            )}
                        </div>
                    </div>
                </div>

                {/* ═══ RIGHT PANEL ═══ */}
                <div className="clinic-right-panel">

                    {/* Stats 2x2 */}
                    <div className="cdp-stats-grid">
                        <div className="cdp-stat-card">
                            <div className="cdp-stat-icon teal"><Calendar size={18} /></div>
                            <div className="cdp-stat-label">Jami bronlar</div>
                            <div className="cdp-stat-value">
                                {stats?.appointments?.total?.toLocaleString() || '0'}
                            </div>
                            <div className="cdp-stat-sub">
                                {stats?.appointments?.completed || 0} bajarilgan
                            </div>
                        </div>
                        <div className="cdp-stat-card">
                            <div className="cdp-stat-icon blue"><Activity size={18} /></div>
                            <div className="cdp-stat-label">Faol xizmatlar</div>
                            <div className="cdp-stat-value">
                                {(diagnosticList.length + surgicalList.length) || '0'}
                            </div>
                            <div className="cdp-stat-sub">Diagnostika + Operatsiya</div>
                        </div>
                        <div className="cdp-stat-card">
                            <div className="cdp-stat-icon green"><Stethoscope size={18} /></div>
                            <div className="cdp-stat-label">Shifokorlar</div>
                            <div className="cdp-stat-value">
                                {stats?.doctors || doctors?.length || '0'}
                            </div>
                            <div className="cdp-stat-sub">Faol</div>
                        </div>
                        <div className="cdp-stat-card">
                            <div className="cdp-stat-icon yellow"><Star size={18} /></div>
                            <div className="cdp-stat-label">Reyting</div>
                            <div className="cdp-stat-value">
                                {clinic.averageRating?.toFixed(1) || '0.0'}
                            </div>
                            <div className="cdp-stat-sub">{clinic.reviewCount || 0} sharh</div>
                        </div>
                    </div>

                    {/* Services tabs */}
                    <div className="cdp-tabs-card">
                        <div className="cdp-tabs-header">
                            {TABS.map((tab, i) => (
                                <button
                                    key={tab}
                                    className={`cdp-tab-btn ${activeTab === i ? 'active' : ''}`}
                                    onClick={() => setActiveTab(i)}
                                >
                                    {tab}
                                    {i === 0 && diagnosticList.length > 0 && (
                                        <span className="cdp-tab-count">{diagnosticList.length}</span>
                                    )}
                                    {i === 1 && surgicalList.length > 0 && (
                                        <span className="cdp-tab-count">{surgicalList.length}</span>
                                    )}
                                </button>
                            ))}
                        </div>
                        <div className="cdp-tab-content">
                            {renderTabContent()}
                        </div>
                    </div>

                    {/* Doctors */}
                    <div className="cdp-doctors-card">
                        <div className="cdp-section-label" style={{ marginBottom: 8 }}>Shifokorlar</div>
                        {doctors && doctors.length > 0 ? doctors.slice(0, 5).map((doc, i) => (
                            <div className="cdp-doctor-item" key={doc.id || i}>
                                <div className="cdp-doctor-avatar">
                                    {doc.firstName?.[0]}{doc.lastName?.[0]}
                                </div>
                                <div>
                                    <div className="cdp-doctor-name">{doc.firstName} {doc.lastName}</div>
                                    <div className="cdp-doctor-spec">{doc.specialty || 'Umumiy'}</div>
                                </div>
                                {doc.phone && <div className="cdp-doctor-phone">{doc.phone}</div>}
                            </div>
                        )) : (
                            <div className="cdp-empty">Shifokorlar topilmadi</div>
                        )}
                    </div>

                    {/* Reviews */}
                    <div className="cdp-reviews-card">
                        <div className="cdp-section-label" style={{ marginBottom: 8 }}>
                            So'nggi sharhlar
                        </div>
                        {reviews && reviews.length > 0 ? reviews.slice(0, 5).map((rev, i) => (
                            <div className="cdp-review-item" key={rev.id || i}>
                                <div className="cdp-review-avatar">
                                    {rev.user?.firstName?.[0] || '?'}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div className="cdp-review-name">
                                        {rev.user?.firstName} {rev.user?.lastName}
                                    </div>
                                    <div className="cdp-review-stars">
                                        {[...Array(5)].map((_, si) => (
                                            <Star
                                                key={si}
                                                size={12}
                                                fill={si < Math.round(rev.rating) ? '#fbbf24' : 'none'}
                                                color="#fbbf24"
                                            />
                                        ))}
                                    </div>
                                    {rev.comment && (
                                        <div className="cdp-review-comment">{rev.comment}</div>
                                    )}
                                </div>
                                <div className="cdp-review-date">
                                    {new Date(rev.createdAt).toLocaleDateString('uz-UZ')}
                                </div>
                            </div>
                        )) : (
                            <div className="cdp-empty">Sharhlar topilmadi</div>
                        )}
                    </div>

                </div>
            </div>
        </div>
    );
}
