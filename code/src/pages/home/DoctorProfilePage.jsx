import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Star, Award, Stethoscope, Building2, MapPin, Phone,
    Clock, Calendar, ChevronLeft, Loader2, AlertTriangle,
    CalendarCheck, Sparkles, MessageCircle, X, ImageIcon,
    GraduationCap, BriefcaseMedical, Scissors,
} from 'lucide-react';

// UZ-friendly labels for the qualification grade. Matches the dropdown
// on the clinic edit form; fall back to whatever the API returned for
// future values.
const CATEGORY_LABELS = {
    OLIY: 'Oliy toifa',
    BIRINCHI: 'Birinchi toifa',
    IKKINCHI: 'Ikkinchi toifa',
    YOSH_MUTAXASSIS: 'Yosh mutaxassis',
};
const fmtCategory = (c) => CATEGORY_LABELS[c] || c || null;

const resolveSrc = (url) => {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    if (url.startsWith('/uploads')) return url; // same-origin in prod
    return url;
};
import api from '../../shared/api/axios';
import TopBar from './TopBar';
import Navigation from './Navigation';
import Footer from './Footer';
import './css/DoctorsPage.css';

const fmtPrice = (n) => (Number(n) || 0).toLocaleString('uz-UZ');
const fmtDate = (iso) => {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('uz-UZ', { day: '2-digit', month: 'short', year: 'numeric' });
};

const DAY_NAMES = ['Yakshanba', 'Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba'];

function StarRow({ rating, size = 12 }) {
    return (
        <div style={{ display: 'inline-flex', gap: 1 }}>
            {[1, 2, 3, 4, 5].map((i) => (
                <Star
                    key={i}
                    size={size}
                    fill={i <= Math.round(rating) ? '#fbbf24' : 'none'}
                    color="#fbbf24"
                />
            ))}
        </div>
    );
}

function ClinicScheduleCard({ clinic, onBook }) {
    const days = clinic.schedules.reduce((acc, s) => {
        acc[s.dayOfWeek] = s;
        return acc;
    }, {});

    return (
        <div className="docs-clinic-card">
            <div className="docs-clinic-card__head">
                <div className="docs-clinic-card__icon">
                    <Building2 size={18} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <Link
                        to={`/klinikalar/${clinic.clinicId}`}
                        className="docs-clinic-card__name"
                    >
                        {clinic.clinicName}
                    </Link>
                    <div className="docs-clinic-card__addr">
                        <MapPin size={11} />
                        {clinic.region}, {clinic.district}
                    </div>
                </div>
                <div className="docs-clinic-card__price">
                    {fmtPrice(clinic.consultationPrice)} so'm
                </div>
            </div>

            <div className="docs-sched-grid">
                {[1, 2, 3, 4, 5, 6, 0].map((di) => (
                    <div
                        key={di}
                        className={`docs-sched-cell ${days[di] ? '' : 'docs-sched-cell--off'}`}
                    >
                        <div className="docs-sched-cell__day">{DAY_NAMES[di].slice(0, 2)}</div>
                        <div className="docs-sched-cell__time">
                            {days[di] ? `${days[di].startTime}–${days[di].endTime}` : '—'}
                        </div>
                    </div>
                ))}
            </div>

            <button
                className="docs-btn docs-btn--primary"
                style={{ width: '100%', marginTop: 12 }}
                onClick={() => onBook(clinic)}
            >
                <CalendarCheck size={14} /> Band qilish
            </button>
        </div>
    );
}

function ReviewItem({ r }) {
    return (
        <motion.div
            className="docs-review"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
        >
            <div className="docs-review__head">
                <div>
                    <div className="docs-review__name">{r.patientName || 'Anonim'}</div>
                    <div className="docs-review__date">
                        {r.visitDate && `Ko'rik: ${fmtDate(r.visitDate)} · `}
                        {fmtDate(r.createdAt)}
                    </div>
                </div>
                <StarRow rating={r.rating} />
            </div>
            {r.comment && <div className="docs-review__text">{r.comment}</div>}
        </motion.div>
    );
}

function Lightbox({ images, index, onClose, onChange }) {
    if (index == null) return null;
    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                style={{
                    position: 'fixed', inset: 0, zIndex: 1500,
                    background: 'rgba(0,0,0,0.92)',
                    display: 'grid', placeItems: 'center',
                    padding: 20,
                }}
            >
                <button
                    onClick={onClose}
                    style={{
                        position: 'absolute', top: 16, right: 16,
                        background: 'rgba(255,255,255,0.15)', border: 0,
                        color: '#fff', padding: 10, borderRadius: 12, cursor: 'pointer',
                    }}
                ><X size={20} /></button>
                <motion.img
                    key={index}
                    src={resolveSrc(images[index])}
                    style={{ maxWidth: '92vw', maxHeight: '88vh', borderRadius: 14, boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    onClick={(e) => e.stopPropagation()}
                />
                {images.length > 1 && (
                    <div
                        style={{
                            position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)',
                            display: 'flex', gap: 6,
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {images.map((_, i) => (
                            <button
                                key={i}
                                onClick={() => onChange(i)}
                                style={{
                                    width: 10, height: 10, borderRadius: 999,
                                    background: i === index ? '#fff' : 'rgba(255,255,255,0.4)',
                                    border: 0, cursor: 'pointer',
                                }}
                            />
                        ))}
                    </div>
                )}
            </motion.div>
        </AnimatePresence>
    );
}

export default function DoctorProfilePage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [lightboxIdx, setLightboxIdx] = useState(null);

    const { data, isLoading, isError } = useQuery({
        queryKey: ['public', 'doctor', id],
        queryFn: async () => (await api.get(`/public/doctors/${id}`)).data?.data,
    });

    const handleBook = (clinic) => {
        navigate(`/doktorlar/${id}/band/${clinic.clinicId}`);
    };

    if (isLoading) {
        return (
            <div className="docs-page-wrap">
                <TopBar />
                <Navigation />
                <main className="docs-page">
                    <div className="docs-skel" style={{ height: 280, marginBottom: 20 }} />
                    <div className="docs-grid">
                        {[1, 2].map((i) => <div key={i} className="docs-skel" style={{ height: 240 }} />)}
                    </div>
                </main>
                <Footer />
            </div>
        );
    }

    if (isError || !data) {
        return (
            <div className="docs-page-wrap">
                <TopBar />
                <Navigation />
                <main className="docs-page">
                    <div className="docs-empty">
                        <AlertTriangle size={48} color="#cbd5e1" />
                        <h3>Doktor topilmadi</h3>
                        <Link to="/doktorlar" className="docs-btn">Doktorlar ro'yxatiga qaytish</Link>
                    </div>
                </main>
                <Footer />
            </div>
        );
    }

    const initials = `${data.firstName[0]}${data.lastName[0]}`.toUpperCase();

    return (
        <div className="docs-page-wrap">
            <TopBar />
            <Navigation />

            <main className="docs-page">
                <Link to="/doktorlar" className="docs-back">
                    <ChevronLeft size={14} /> Doktorlar ro'yxati
                </Link>

                <motion.section
                    className="docs-profile-hero"
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <div className="docs-profile-hero__bg" />
                    <div className="docs-profile-hero__inner">
                        {data.photoUrl ? (
                            <img loading="lazy" src={data.photoUrl} alt={data.firstName} className="docs-profile-hero__avatar" />
                        ) : (
                            <div className="docs-profile-hero__avatar docs-profile-hero__avatar--initials">{initials}</div>
                        )}
                        <div className="docs-profile-hero__body">
                            {/* Full name with patronymic when available — culturally the
                                expected greeting form in UZ ("Karimov Bahodir Akmalovich"). */}
                            <h1 className="docs-profile-hero__name">
                                {data.lastName} {data.firstName}{data.middleName ? ` ${data.middleName}` : ''}
                            </h1>
                            <div className="docs-profile-hero__spec">
                                <Stethoscope size={14} /> {data.specialtyName || 'Doktor'}
                            </div>
                            <div className="docs-profile-hero__chips">
                                {data.yearsExperience != null && (
                                    <span className="docs-card__chip">
                                        <Award size={11} /> {data.yearsExperience} yil tajriba
                                    </span>
                                )}
                                {fmtCategory(data.category) && (
                                    <span className="docs-card__chip docs-card__chip--accent">
                                        <Award size={11} /> {fmtCategory(data.category)}
                                    </span>
                                )}
                                {data.academicTitle && (
                                    <span className="docs-card__chip docs-card__chip--accent">
                                        <GraduationCap size={11} /> {data.academicTitle}
                                    </span>
                                )}
                                <span className="docs-card__chip">
                                    <Building2 size={11} /> {data.clinics.length} klinika
                                </span>
                                <span className="docs-card__chip">
                                    <Sparkles size={11} /> {data.reviewCount} sharh
                                </span>
                            </div>
                        </div>
                        <div className="docs-profile-hero__rating">
                            <div className="docs-profile-hero__rating-val">
                                {data.reviewCount > 0 ? data.averageRating.toFixed(1) : '—'}
                            </div>
                            <StarRow rating={data.averageRating} size={14} />
                            <div className="docs-profile-hero__rating-lbl">
                                {data.reviewCount} sharh
                            </div>
                        </div>
                    </div>
                </motion.section>

                {data.bio && (
                    <section className="docs-section">
                        <div className="docs-section__title">Haqida</div>
                        <p className="docs-bio">{data.bio}</p>
                    </section>
                )}

                {(data.academicDegree || data.academicTitle || fmtCategory(data.category)
                    || data.bachelorSpecialty || data.masterSpecialty) && (
                    <section className="docs-section">
                        <div className="docs-section__title">
                            <GraduationCap size={14} /> Ilmiy va kasbiy daraja
                        </div>
                        <div className="docs-credentials">
                            {/* Education — text only; uploaded diplomas are not shown to patients. */}
                            {data.bachelorSpecialty && (
                                <div className="docs-credential">
                                    <div className="docs-credential__label">Bakalavr</div>
                                    <div className="docs-credential__value">{data.bachelorSpecialty}</div>
                                </div>
                            )}
                            {data.masterSpecialty && (
                                <div className="docs-credential">
                                    <div className="docs-credential__label">Magistr</div>
                                    <div className="docs-credential__value">{data.masterSpecialty}</div>
                                </div>
                            )}
                            {fmtCategory(data.category) && (
                                <div className="docs-credential">
                                    <div className="docs-credential__label">Toifa</div>
                                    <div className="docs-credential__value">{fmtCategory(data.category)}</div>
                                </div>
                            )}
                            {data.academicDegree && (
                                <div className="docs-credential">
                                    <div className="docs-credential__label">Ilmiy darajasi</div>
                                    <div className="docs-credential__value">{data.academicDegree}</div>
                                </div>
                            )}
                            {data.academicTitle && (
                                <div className="docs-credential">
                                    <div className="docs-credential__label">Ilmiy unvoni</div>
                                    <div className="docs-credential__value">{data.academicTitle}</div>
                                </div>
                            )}
                        </div>
                    </section>
                )}

                {Array.isArray(data.treatedDiseases) && data.treatedDiseases.length > 0 && (
                    <section className="docs-section">
                        <div className="docs-section__title">
                            <BriefcaseMedical size={14} /> Davolanadigan kasalliklar
                        </div>
                        <div className="docs-tag-list">
                            {data.treatedDiseases.map((t, i) => (
                                <span key={`${t}-${i}`} className="docs-tag">{t}</span>
                            ))}
                        </div>
                    </section>
                )}

                {Array.isArray(data.surgicalProcedures) && data.surgicalProcedures.length > 0 && (
                    <section className="docs-section">
                        <div className="docs-section__title">
                            <Scissors size={14} /> Bajaradigan jarrohliklar
                        </div>
                        <div className="docs-tag-list">
                            {data.surgicalProcedures.map((t, i) => (
                                <span key={`${t}-${i}`} className="docs-tag docs-tag--surgery">{t}</span>
                            ))}
                        </div>
                    </section>
                )}

                {Array.isArray(data.photoUrls) && data.photoUrls.length > 0 && (
                    <section className="docs-section">
                        <div className="docs-section__title">
                            <ImageIcon size={14} /> Foto galereya
                        </div>
                        <div className="docs-gallery">
                            {data.photoUrls.map((u, i) => (
                                <button key={i} className="docs-gallery__item" onClick={() => setLightboxIdx(i)}>
                                    <img src={resolveSrc(u)} alt={`Foto ${i + 1}`} loading="lazy" />
                                </button>
                            ))}
                        </div>
                    </section>
                )}

                <section className="docs-section">
                    <div className="docs-section__title">
                        <Building2 size={14} /> Klinikalari ({data.clinics.length})
                    </div>
                    <div className="docs-clinic-list">
                        {data.clinics.map((c) => (
                            <ClinicScheduleCard key={c.doctorClinicId} clinic={c} onBook={handleBook} />
                        ))}
                    </div>
                </section>

                <section className="docs-section">
                    <div className="docs-section__title">
                        <MessageCircle size={14} /> Sharhlar ({data.reviewCount})
                    </div>
                    {data.reviews.length === 0 ? (
                        <div className="docs-empty" style={{ padding: 40 }}>
                            <MessageCircle size={36} color="#cbd5e1" />
                            <h3 style={{ fontSize: 15 }}>Hozircha sharh yo'q</h3>
                            <p style={{ fontSize: 12 }}>Birinchi bo'lib ko'rikdan keyin baho qoldiring</p>
                        </div>
                    ) : (
                        <div className="docs-reviews">
                            {data.reviews.map((r) => <ReviewItem key={r.id} r={r} />)}
                        </div>
                    )}
                </section>
            </main>

            <Footer />

            <Lightbox
                images={data.photoUrls || []}
                index={lightboxIdx}
                onClose={() => setLightboxIdx(null)}
                onChange={setLightboxIdx}
            />
        </div>
    );
}
