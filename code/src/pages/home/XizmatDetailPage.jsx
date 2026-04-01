import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useUserAuth } from '../../shared/auth/UserAuthContext';
import UserAuthModal from './UserAuthModal';
import {
    ArrowLeft, Clock, Star, Phone, MapPin, Calendar, Building2, Share2,
    Heart, Award, Shield, Users, Zap, TrendingUp, Activity, Beaker,
    FileText, AlertTriangle, CheckCircle2, XCircle, Info, Droplets,
    Timer, ClipboardList, Stethoscope, BadgeCheck, Gauge, FlaskConical,
    ChevronRight, Tag
} from 'lucide-react';
import axios from 'axios';
import TopBar from './TopBar';
import Navigation from './Navigation';
import Footer from './Footer';
import ReviewSection from '../../components/ReviewSection';
import './css/base.css';
import './css/XizmatDetailPage.css';

const fmt = (n) => n ? Number(n).toLocaleString('uz-UZ') : '0';

export default function XizmatDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useUserAuth();
    const [svc, setSvc] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [liked, setLiked] = useState(false);
    const [galleryIdx, setGalleryIdx] = useState(0);
    const [lightbox, setLightbox] = useState(false);
    const [showAuthModal, setShowAuthModal] = useState(false);

    const handleBooking = (clinic = null) => {
        // Prevent event object from being passed as clinic parameter
        const selectedClinic = (clinic && typeof clinic === 'object' && clinic.id) ? clinic : activeClinic;

        if (!user) {
            setShowAuthModal(true);
        } else {
            navigate(`/user/book/${id}`, {
                state: {
                    serviceType: 'DIAGNOSTIC',
                    serviceData: svc,
                    selectedClinic: selectedClinic,
                },
            });
        }
    };

    useEffect(() => {
        setLoading(true);
        setError(null);
        axios.get(`/api/public/services/${id}`)
            .then(res => setSvc(res.data.data))
            .catch(() => setError('Xizmat topilmadi'))
            .finally(() => setLoading(false));
    }, [id]);

    if (loading) {
        return (
            <div className="xd-loading">
                <div className="xd-spinner" />
                <p>Yuklanmoqda...</p>
            </div>
        );
    }

    if (error || !svc) {
        return (
            <div className="xd-not-found">
                <TopBar />
                <Navigation />
                <div className="xd-not-found-content">
                    <h1>Xizmat topilmadi</h1>
                    <p>Kechirasiz, siz qidirayotgan xizmat mavjud emas.</p>
                    <Link to="/xizmatlar" className="xd-btn-primary"><ArrowLeft size={18} /> Xizmatlarga qaytish</Link>
                </div>
                <Footer />
            </div>
        );
    }

    const clinics = svc.clinics || [];
    const related = svc.relatedServices || [];
    // Fix image URLs - prepend backend URL if they start with /uploads
    const images = (svc.images || []).map(img =>
        img.startsWith('/uploads') ? `http://localhost:5000${img}` : img
    );
    const catName = svc.category?.nameUz || 'Diagnostika';
    const parentCat = svc.category?.parent?.nameUz || '';

    // Use clinic-customized data when a clinic has activated this service
    const activeClinic = clinics[0] || null;
    const activeDescription = activeClinic?.fullDescription || activeClinic?.shortDescription || svc.fullDescription || svc.shortDescription;
    const activeProcess = activeClinic?.processDescription || svc.processDescription;
    const activePreparationText = activeClinic?.preparation || svc.preparation;
    const activeBenefits = activeClinic?.benefits || [];

    const prep = activeClinic?.preparationJson || svc.preparationJson || {};
    const booking = activeClinic?.bookingPolicy || svc.bookingPolicy || {};
    const ind = svc.indicationsJson || {};
    const contra = svc.contraindicationsJson || {};
    const extra = activeClinic?.additionalInfo || svc.additionalInfo || {};
    const params = svc.resultParameters || [];

    const hasPrep = activePreparationText || Object.keys(prep).some(k => prep[k] !== null && prep[k] !== '');
    const hasInd = ind.symptoms?.length > 0 || ind.diseases?.length > 0 || ind.preventive || ind.mandatoryFor?.length > 0;
    const hasContra = contra.absolute?.length > 0 || contra.relative?.length > 0 || contra.temporary?.length > 0 || svc.contraindications;

    return (
        <div className="xd-page">
            <TopBar />
            <Navigation />

            {/* ── PAGE HEADER (breadcrumb + title) ── */}
            <section className="xd-header">
                <div className="xd-container">
                    <h1 className="xd-title">{svc.nameUz}</h1>
                    <div className="xd-header-meta">
                        <Link to="/xizmatlar" className="xd-meta-link"><Beaker size={14} /> Xizmatlar</Link>
                        {parentCat && <><ChevronRight size={14} /><span>{parentCat}</span></>}
                        <ChevronRight size={14} />
                        <span className="xd-meta-cat">{catName}</span>
                        <span className="xd-meta-sep">|</span>
                        <span><Clock size={14} /> {svc.durationMinutes} daqiqa</span>
                        <span className="xd-meta-sep">|</span>
                        <span><Building2 size={14} /> {svc.activeClinicsCount || clinics.length} klinika</span>
                    </div>
                </div>
            </section>

            {/* ── MAIN 2-COLUMN LAYOUT ── */}
            <div className="xd-container">
                <div className="xd-layout">

                    {/* ═══ LEFT: CONTENT COLUMN ═══ */}
                    <main className="xd-main">

                        {/* Featured Image Gallery */}
                        {images.length > 0 && (
                            <div className="xd-gallery">
                                <div className="xd-gallery-main" onClick={() => setLightbox(true)}>
                                    <img src={images[galleryIdx]} alt={svc.nameUz} />
                                    {images.length > 1 && (
                                        <>
                                            <button className="xd-gal-nav xd-gal-prev" onClick={e => { e.stopPropagation(); setGalleryIdx(i => (i - 1 + images.length) % images.length); }}>
                                                <ArrowLeft size={18} />
                                            </button>
                                            <button className="xd-gal-nav xd-gal-next" onClick={e => { e.stopPropagation(); setGalleryIdx(i => (i + 1) % images.length); }}>
                                                <ArrowLeft size={18} style={{ transform: 'rotate(180deg)' }} />
                                            </button>
                                            <span className="xd-gal-counter">{galleryIdx + 1} / {images.length}</span>
                                        </>
                                    )}
                                </div>
                                {images.length > 1 && (
                                    <div className="xd-gal-thumbs">
                                        {images.map((img, i) => (
                                            <img key={i} src={img} alt="" className={i === galleryIdx ? 'active' : ''} onClick={() => setGalleryIdx(i)} />
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Service Description */}
                        {activeDescription && (
                            <div className="xd-content-block">
                                <p className="xd-text">{activeDescription}</p>
                            </div>
                        )}

                        {/* Blockquote - Process Description */}
                        {activeProcess && (
                            <blockquote className="xd-blockquote">
                                <FlaskConical size={20} />
                                <div>
                                    <strong>Jarayon — qanday o'tadi</strong>
                                    <p>{activeProcess}</p>
                                </div>
                            </blockquote>
                        )}

                        {/* Preparation Section */}
                        {hasPrep && (
                            <div className="xd-content-block">
                                <h2 className="xd-section-title"><ClipboardList size={22} /> Tayyorgarlik</h2>
                                {activePreparationText && <p className="xd-text">{activePreparationText}</p>}
                                {Object.keys(prep).length > 0 && (
                                    <div className="xd-prep-grid">
                                        {prep.fastingHours != null && (
                                            <div className="xd-prep-item">
                                                <div className="xd-prep-icon warn"><AlertTriangle size={20} /></div>
                                                <div><p className="xd-prep-label">Och qorin</p><p className="xd-prep-value">{prep.fastingHours} soat ovqatlanmaslik</p></div>
                                            </div>
                                        )}
                                        {prep.bestTime && (
                                            <div className="xd-prep-item">
                                                <div className="xd-prep-icon ok"><Clock size={20} /></div>
                                                <div><p className="xd-prep-label">Eng yaxshi vaqt</p><p className="xd-prep-value">{prep.bestTime}</p></div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Technical Details Section */}
                        {(activeClinic?.equipment || activeClinic?.accuracy || activeClinic?.sampleVolume || activeClinic?.resultFormat || activeClinic?.certifications?.length > 0) && (
                            <div className="xd-content-block">
                                <h2 className="xd-section-title"><Beaker size={22} /> Texnik ma'lumotlar</h2>
                                <div className="xd-prep-grid">
                                    {activeClinic.sampleVolume && (
                                        <div className="xd-prep-item">
                                            <div className="xd-prep-icon ok"><Beaker size={20} /></div>
                                            <div><p className="xd-prep-label">Namuna hajmi</p><p className="xd-prep-value">{activeClinic.sampleVolume}</p></div>
                                        </div>
                                    )}
                                    {activeClinic.resultFormat && (
                                        <div className="xd-prep-item">
                                            <div className="xd-prep-icon ok"><FileText size={20} /></div>
                                            <div><p className="xd-prep-label">Natija formati</p><p className="xd-prep-value">{activeClinic.resultFormat}</p></div>
                                        </div>
                                    )}
                                    {activeClinic.equipment && (
                                        <div className="xd-prep-item">
                                            <div className="xd-prep-icon ok"><Gauge size={20} /></div>
                                            <div><p className="xd-prep-label">Uskunalar</p><p className="xd-prep-value">{activeClinic.equipment}</p></div>
                                        </div>
                                    )}
                                    {activeClinic.accuracy && (
                                        <div className="xd-prep-item">
                                            <div className="xd-prep-icon ok"><Shield size={20} /></div>
                                            <div><p className="xd-prep-label">Aniqlik</p><p className="xd-prep-value">{activeClinic.accuracy}</p></div>
                                        </div>
                                    )}
                                </div>
                                {activeClinic.certifications?.length > 0 && (
                                    <div className="xd-cert-list">
                                        {activeClinic.certifications.map((cert, i) => (
                                            <span key={i} className="xd-cert-badge"><Award size={13} /> {cert}</span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Results Section */}
                        {params.length > 0 && (
                            <div className="xd-content-block">
                                <h2 className="xd-section-title"><Activity size={22} /> Natija parametrlari</h2>
                                <div className="xd-params-table">
                                    <div className="xd-params-header"><span>Parametr</span><span>Normal diapazon</span></div>
                                    {params.map((p, i) => (
                                        <div key={i} className="xd-params-row">
                                            <div className="xd-param-name"><strong>{p.name}</strong>{p.description && <span>{p.description}</span>}</div>
                                            <div className="xd-param-range">{p.normalRange || '—'}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Indications */}
                        {hasInd && (
                            <div className="xd-content-block">
                                <h2 className="xd-section-title"><CheckCircle2 size={22} /> Qachon kerak (Indikatsiya)</h2>
                                {ind.symptoms?.length > 0 && (
                                    <div className="xd-ind-section"><h4>Belgilar:</h4><div className="xd-tag-list">{ind.symptoms.map((s, i) => <span key={i} className="xd-ind-tag green">{s}</span>)}</div></div>
                                )}
                                {ind.diseases?.length > 0 && (
                                    <div className="xd-ind-section"><h4>Kasalliklar:</h4><div className="xd-tag-list">{ind.diseases.map((d, i) => <span key={i} className="xd-ind-tag blue">{d}</span>)}</div></div>
                                )}
                                {ind.mandatoryFor?.length > 0 && (
                                    <div className="xd-ind-section"><h4>Majburiy:</h4><div className="xd-tag-list">{ind.mandatoryFor.map((m, i) => <span key={i} className="xd-ind-tag orange">{m}</span>)}</div></div>
                                )}
                                {ind.preventive && <div className="xd-ind-section"><h4>Profilaktika:</h4><p className="xd-text">{ind.preventive}</p></div>}
                            </div>
                        )}

                        {/* Contraindications */}
                        {hasContra && (
                            <div className="xd-content-block xd-block-warn">
                                <h2 className="xd-section-title"><XCircle size={22} /> Kontraindikatsiya</h2>
                                {svc.contraindications && <p className="xd-text">{svc.contraindications}</p>}
                                {contra.absolute?.length > 0 && (
                                    <div className="xd-ind-section"><h4 className="red">Absolyut (mumkin emas):</h4><div className="xd-tag-list">{contra.absolute.map((a, i) => <span key={i} className="xd-ind-tag red">{a}</span>)}</div></div>
                                )}
                                {contra.relative?.length > 0 && (
                                    <div className="xd-ind-section"><h4 className="orange">Nisbiy (ehtiyotkorlik):</h4><div className="xd-tag-list">{contra.relative.map((r, i) => <span key={i} className="xd-ind-tag orange">{r}</span>)}</div></div>
                                )}
                                {contra.temporary?.length > 0 && (
                                    <div className="xd-ind-section"><h4 className="yellow">Vaqtinchalik:</h4><div className="xd-tag-list">{contra.temporary.map((t, i) => <span key={i} className="xd-ind-tag yellow">{t}</span>)}</div></div>
                                )}
                            </div>
                        )}

                        {/* Schedule Section — custom schedule or fallback to clinic workingHours */}
                        {activeClinic && (() => {
                            const dayNames = { monday: 'Dushanba', tuesday: 'Seshanba', wednesday: 'Chorshanba', thursday: 'Payshanba', friday: 'Juma', saturday: 'Shanba', sunday: 'Yakshanba' };
                            const hasCustomSchedule = activeClinic.availableDays?.length > 0 || activeClinic.availableTimeSlots;
                            const wh = activeClinic.workingHours?.schedule || activeClinic.workingHours;
                            const hasClinicHours = wh && typeof wh === 'object' && !Array.isArray(wh) && Object.keys(wh).length > 0;

                            if (!hasCustomSchedule && !hasClinicHours) return null;

                            return (
                                <div className="xd-content-block">
                                    <h2 className="xd-section-title"><Calendar size={22} /> Ish vaqti</h2>

                                    {hasCustomSchedule ? (
                                        <>
                                            {activeClinic.availableDays?.length > 0 && (
                                                <div style={{ marginBottom: '16px' }}>
                                                    <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#555' }}>Mavjud kunlar:</h4>
                                                    <div className="xd-tag-list">
                                                        {activeClinic.availableDays.map((day, i) => (
                                                            <span key={i} className="xd-ind-tag blue">{dayNames[day] || day}</span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                            {activeClinic.availableTimeSlots && Object.keys(activeClinic.availableTimeSlots).length > 0 && (
                                                <div>
                                                    <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', color: '#555' }}>Vaqt oraliklari:</h4>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                                        {Object.entries(activeClinic.availableTimeSlots).map(([day, slots]) => (
                                                            <div key={day} style={{ padding: '12px', background: '#f8f9fa', borderRadius: '8px', border: '1px solid #e9ecef' }}>
                                                                <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '6px', color: '#333' }}>{dayNames[day] || day}</div>
                                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                                                    {slots.map((slot, i) => (
                                                                        <span key={i} style={{ padding: '4px 10px', background: '#e7f5ff', color: '#1971c2', borderRadius: '6px', fontSize: '12px', fontWeight: 500, border: '1px solid #a5d8ff' }}>
                                                                            {slot.start} — {slot.end}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            {Object.entries(wh).map(([day, info]) => (
                                                <div key={day} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: info.isDayOff ? '#fff5f5' : '#f8f9fa', borderRadius: '8px', border: `1px solid ${info.isDayOff ? '#ffe3e3' : '#e9ecef'}` }}>
                                                    <span style={{ fontWeight: 600, fontSize: '13px', color: info.isDayOff ? '#c92a2a' : '#333' }}>{dayNames[day] || day}</span>
                                                    {info.isDayOff ? (
                                                        <span style={{ fontSize: '12px', color: '#c92a2a', fontWeight: 500 }}>Dam olish kuni</span>
                                                    ) : (
                                                        <span style={{ padding: '4px 10px', background: '#e7f5ff', color: '#1971c2', borderRadius: '6px', fontSize: '12px', fontWeight: 500, border: '1px solid #a5d8ff' }}>
                                                            {info.start} — {info.end}
                                                        </span>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })()}

                        {/* Tags + Share row */}
                        <div className="xd-tags-share">
                            <div className="xd-tags-row">
                                <Tag size={16} />
                                <span className="xd-tag-chip">{catName}</span>
                                {parentCat && <span className="xd-tag-chip">{parentCat}</span>}
                                {svc.sampleType && <span className="xd-tag-chip">{svc.sampleType}</span>}
                            </div>
                            <div className="xd-share-row">
                                <button className="xd-share-btn" onClick={() => navigator.clipboard?.writeText(window.location.href)}><Share2 size={16} /></button>
                            </div>
                        </div>

                        {/* Clinic Profile Section */}
                        {clinics.length > 0 && (
                            <div className="xd-content-block">
                                <h2 className="xd-section-title"><Building2 size={22} /> Klinika haqida</h2>
                                <div className="xd-clinic-profile">
                                    <div className="xd-cp-header">
                                        {clinics[0].logo && (
                                            <img
                                                src={clinics[0].logo.startsWith('http') ? clinics[0].logo : `${clinics[0].logo}`}
                                                alt={clinics[0].name}
                                                className="xd-cp-logo"
                                            />
                                        )}
                                        <div className="xd-cp-title-section">
                                            <Link to={`/klinikalar/${clinics[0].id}`} className="xd-cp-name">
                                                {clinics[0].name}
                                            </Link>
                                            <div className="xd-cp-meta">
                                                {clinics[0].rating > 0 && (
                                                    <div className="xd-cp-rating">
                                                        <Star size={16} fill="#f39c12" stroke="#f39c12" />
                                                        <span>{clinics[0].rating.toFixed(1)}</span>
                                                        <span className="xd-cp-reviews">({clinics[0].reviewCount || 0} sharh)</span>
                                                    </div>
                                                )}
                                                {clinics[0].type && (
                                                    <>
                                                        <span className="xd-cp-separator">•</span>
                                                        <span className="xd-cp-type">
                                                            {clinics[0].type === 'GENERAL' && 'Umumiy klinika'}
                                                            {clinics[0].type === 'SPECIALIZED' && 'Ixtisoslashgan'}
                                                            {clinics[0].type === 'DIAGNOSTIC' && 'Diagnostika markazi'}
                                                            {clinics[0].type === 'DENTAL' && 'Stomatologiya'}
                                                            {clinics[0].type === 'MATERNITY' && 'Tug\'ruqxona'}
                                                            {clinics[0].type === 'REHABILITATION' && 'Reabilitatsiya'}
                                                            {clinics[0].type === 'OTHER' && 'Boshqa'}
                                                        </span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                        <div className="xd-cp-price-box">
                                            <span className="xd-cp-price-label">Narx</span>
                                            {clinics[0].discountPercent > 0 ? (
                                                <>
                                                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                                                        <span className="xd-cp-price">{fmt(clinics[0].price)} so'm</span>
                                                        <span className="xd-cp-original-price">{fmt(clinics[0].originalPrice)} so'm</span>
                                                    </div>
                                                    <span className="xd-cp-discount">-{clinics[0].discountPercent}% chegirmada</span>
                                                </>
                                            ) : (
                                                <span className="xd-cp-price">{fmt(clinics[0].price)} so'm</span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="xd-cp-stats">
                                        <div className="xd-cp-stat">
                                            <MapPin size={20} />
                                            <div>
                                                <span className="xd-cp-stat-label">Manzil</span>
                                                <span className="xd-cp-stat-value">{clinics[0].address}</span>
                                            </div>
                                        </div>
                                        {clinics[0].phones?.length > 0 && (
                                            <div className="xd-cp-stat">
                                                <Phone size={20} />
                                                <div>
                                                    <span className="xd-cp-stat-label">Telefon</span>
                                                    <span className="xd-cp-stat-value">
                                                        {clinics[0].phones.map((phone, i) => (
                                                            <a key={i} href={`tel:${phone}`} className="xd-cp-phone">
                                                                {phone}
                                                            </a>
                                                        ))}
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                        <div className="xd-cp-stat">
                                            <Stethoscope size={20} />
                                            <div>
                                                <span className="xd-cp-stat-label">Xizmatlar</span>
                                                <span className="xd-cp-stat-value">Diagnostika xizmatlari</span>
                                            </div>
                                        </div>
                                        {(clinics[0].hasEmergency || clinics[0].hasAmbulance || clinics[0].parkingAvailable || clinics[0].bedsCount) && (
                                            <div className="xd-cp-stat">
                                                <Award size={20} />
                                                <div>
                                                    <span className="xd-cp-stat-label">Imkoniyatlar</span>
                                                    <span className="xd-cp-stat-value">
                                                        {clinics[0].hasEmergency && 'Tez yordam • '}
                                                        {clinics[0].hasAmbulance && 'Ambulatoriya • '}
                                                        {clinics[0].parkingAvailable && 'Avtoturargoh • '}
                                                        {clinics[0].bedsCount && `${clinics[0].bedsCount} ta o\'rindiq`}
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                        {clinics[0].hasOnlineBooking && (
                                            <div className="xd-cp-stat">
                                                <CheckCircle2 size={20} />
                                                <div>
                                                    <span className="xd-cp-stat-label">Online yozilish</span>
                                                    <span className="xd-cp-stat-value">Mavjud</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Benefits from clinic customization */}
                                    {activeBenefits.length > 0 && (
                                        <div className="xd-cp-benefits">
                                            <h4 className="xd-cp-benefits-title"><BadgeCheck size={16} /> Ushbu klinikaning afzalliklari</h4>
                                            <div className="xd-cp-benefits-grid">
                                                {activeBenefits.map((b, i) => (
                                                    <div key={i} className="xd-cp-benefit-item">
                                                        <CheckCircle2 size={15} />
                                                        <span>{b.uz}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <div className="xd-cp-actions">
                                        <Link to={`/klinikalar/${clinics[0].id}`} className="xd-btn-secondary xd-btn-large">
                                            <Info size={18} /> Klinika haqida batafsil
                                        </Link>
                                        <button className="xd-btn-primary xd-btn-large" onClick={handleBooking}>
                                            <Calendar size={18} /> Bron qilish
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Related Blog-style Cards - Only on mobile */}
                        {related.length > 0 && (
                            <div className="xd-content-block xd-mobile-only">
                                <h2 className="xd-section-title"><TrendingUp size={22} /> O'xshash xizmatlar</h2>
                                <div className="xd-related-grid">
                                    {related.slice(0, 2).map(rel => (
                                        <Link key={rel.id} to={`/xizmatlar/${rel.id}`} className="xd-rel-card">
                                            {rel.imageUrl && <img src={rel.imageUrl.startsWith('http') ? rel.imageUrl : `${rel.imageUrl}`} alt="" className="xd-rel-img" />}
                                            <div className="xd-rel-body">
                                                <span className="xd-rel-cat">{catName}</span>
                                                <h4>{rel.nameUz}</h4>
                                                {rel.shortDescription && <p>{rel.shortDescription}</p>}
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        )}
                    </main>

                    {/* ═══ RIGHT: SIDEBAR ═══ */}
                    <aside className="xd-sidebar">

                        {/* Payment / Booking Card */}
                        <div className="xd-sidebar-booking">
                            <div className="xd-sb-header">
                                <span className="xd-sb-label">Narxi</span>
                                {activeClinic?.discountPercent > 0 ? (
                                    <>
                                        <div className="xd-sb-discount-badge">-{activeClinic.discountPercent}% chegirma</div>
                                        <div className="xd-sb-price">{fmt(activeClinic.price)} so'm</div>
                                        <div className="xd-sb-original-price">{fmt(activeClinic.originalPrice)} so'm</div>
                                    </>
                                ) : (
                                    <div className="xd-sb-price">{clinics.length > 0 ? `${fmt(clinics[0].price)} so'm` : `${fmt(svc.priceRecommended || svc.priceMin)} so'm`}</div>
                                )}
                                {clinics.length > 1 && (
                                    <span className="xd-sb-range" style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Boshqa klinikalar: {fmt(Math.min(...clinics.map(c => c.price)))} — {fmt(Math.max(...clinics.map(c => c.price)))} so'm</span>
                                )}
                            </div>
                            <div className="xd-sb-body">
                                <button className="xd-sb-book-btn" onClick={handleBooking}>
                                    <Calendar size={20} /> Bron qilish
                                </button>
                                <div className="xd-sb-actions">
                                    <button className={`xd-sb-action ${liked ? 'liked' : ''}`} onClick={() => setLiked(!liked)}>
                                        <Heart size={18} fill={liked ? '#e74c3c' : 'none'} />
                                    </button>
                                    <button className="xd-sb-action" onClick={() => navigator.clipboard?.writeText(window.location.href)}>
                                        <Share2 size={18} />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* General Information Box */}
                        <div className="xd-sidebar-box">
                            <h3 className="xd-sb-title">Umumiy ma'lumot</h3>
                            <ul className="xd-sb-info-list">
                                <li><Clock size={16} /><span>Davomiyligi</span><strong>{svc.durationMinutes} daqiqa</strong></li>
                                <li><Timer size={16} /><span>Natija vaqti</span><strong>{svc.resultTimeHours >= 24 ? `${Math.round(svc.resultTimeHours / 24)} kun` : `${svc.resultTimeHours} soat`}</strong></li>
                                {svc.sampleType && <li><Droplets size={16} /><span>Namuna turi</span><strong>{svc.sampleType}</strong></li>}
                                {svc.sampleVolume && <li><Beaker size={16} /><span>Namuna miqdori</span><strong>{svc.sampleVolume}</strong></li>}
                                {svc.resultFormat && <li><FileText size={16} /><span>Natija formati</span><strong>{svc.resultFormat}</strong></li>}
                                {clinics.length > 0 ? (
                                    <li><Building2 size={16} /><span>Klinika</span><strong><Link to={`/klinikalar/${clinics[0].id}`} style={{ color: 'var(--color-primary)', textDecoration: 'none' }}>{clinics[0].name}</Link></strong></li>
                                ) : (
                                    <li><Building2 size={16} /><span>Klinikalar</span><strong>{svc.activeClinicsCount || 0} ta</strong></li>
                                )}
                                {extra.accuracy && <li><Gauge size={16} /><span>Aniqlik</span><strong>{extra.accuracy}</strong></li>}
                                {extra.equipment && <li><Zap size={16} /><span>Uskunalar</span><strong>{extra.equipment}</strong></li>}
                            </ul>
                            {extra.certifications?.length > 0 && (
                                <div className="xd-sb-certs">
                                    <Shield size={14} /> {extra.certifications.join(', ')}
                                </div>
                            )}
                        </div>

                        {/* Booking Policy */}
                        {(booking.cancellationPolicy || booking.modificationPolicy || booking.prepaymentRequired !== undefined) && (
                            <div className="xd-sidebar-box">
                                <h3 className="xd-sb-title">Buyurtma siyosati</h3>
                                <ul className="xd-sb-policy">
                                    <li>
                                        <span className="xd-dot" style={{ background: booking.prepaymentRequired ? '#e74c3c' : '#27ae60' }} />
                                        Oldindan to'lov: <strong>{booking.prepaymentRequired ? 'Kerak' : 'Kerak emas'}</strong>
                                    </li>
                                    {booking.cancellationPolicy && <li><span className="xd-dot" style={{ background: '#f39c12' }} />Bekor qilish: <strong>{booking.cancellationPolicy}</strong></li>}
                                    {booking.modificationPolicy && <li><span className="xd-dot" style={{ background: '#00BDE0' }} />O'zgartirish: <strong>{booking.modificationPolicy}</strong></li>}
                                </ul>
                            </div>
                        )}

                        {/* Tags */}
                        <div className="xd-sidebar-box">
                            <h3 className="xd-sb-title">Teglar</h3>
                            <div className="xd-sb-tags">
                                <span className="xd-stag">{catName}</span>
                                {parentCat && <span className="xd-stag">{parentCat}</span>}
                                {svc.sampleType && <span className="xd-stag">{svc.sampleType}</span>}
                                <span className="xd-stag">Diagnostika</span>
                                <span className="xd-stag">Tahlil</span>
                            </div>
                        </div>

                        {/* Related Services sidebar (like "Latest Post") */}
                        {related.length > 0 && (
                            <div className="xd-sidebar-box">
                                <h3 className="xd-sb-title">O'xshash xizmatlar</h3>
                                <div className="xd-sb-related">
                                    {related.slice(0, 4).map(rel => (
                                        <Link key={rel.id} to={`/xizmatlar/${rel.id}`} className="xd-sbr-item">
                                            {rel.imageUrl ? (
                                                <img src={rel.imageUrl.startsWith('http') ? rel.imageUrl : `${rel.imageUrl}`} alt="" className="xd-sbr-img" />
                                            ) : (
                                                <div className="xd-sbr-img xd-sbr-placeholder"><Beaker size={20} /></div>
                                            )}
                                            <div className="xd-sbr-text">
                                                <h5>{rel.nameUz}</h5>
                                                <span>{fmt(rel.priceMin)} so'm</span>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        )}
                    </aside>
                </div>
            </div>

            {/* ── REVIEWS SECTION ── */}
            <ReviewSection
                serviceId={id}
                serviceType={svc.category?.slug === 'operations' ? 'surgical' : svc.category?.slug === 'sanatorium' ? 'sanatorium' : 'diagnostic'}
            />

            <Footer />

            {showAuthModal && (
                <UserAuthModal
                    isOpen={showAuthModal}
                    onClose={() => setShowAuthModal(false)}
                    onSuccess={() => {
                        setShowAuthModal(false);
                        navigate(`/user/book/${id}`, {
                            state: {
                                serviceType: 'DIAGNOSTIC',
                                serviceData: svc,
                                selectedClinic: activeClinic,
                            },
                        });
                    }}
                />
            )}

            {/* ── LIGHTBOX ── */}
            {lightbox && images.length > 0 && (
                <div className="xd-lightbox" onClick={() => setLightbox(false)}>
                    <img src={images[galleryIdx]} alt="" onClick={e => e.stopPropagation()} />
                    <button className="xd-lightbox-close" onClick={() => setLightbox(false)}>✕</button>
                    {images.length > 1 && (
                        <>
                            <button className="xd-lightbox-nav xd-lightbox-prev" onClick={e => { e.stopPropagation(); setGalleryIdx(i => (i - 1 + images.length) % images.length); }}>
                                <ArrowLeft size={24} />
                            </button>
                            <button className="xd-lightbox-nav xd-lightbox-next" onClick={e => { e.stopPropagation(); setGalleryIdx(i => (i + 1) % images.length); }}>
                                <ArrowLeft size={24} style={{ transform: 'rotate(180deg)' }} />
                            </button>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
