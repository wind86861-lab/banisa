import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
    Star, Award, Stethoscope, Building2, MapPin, Phone,
    Clock, Calendar, ChevronLeft, Loader2, AlertTriangle,
    CalendarCheck, Sparkles, MessageCircle,
} from 'lucide-react';
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

            {clinic.roomNumber && (
                <div className="docs-clinic-card__room">
                    Xona: <strong>{clinic.roomNumber}</strong>
                </div>
            )}

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

export default function DoctorProfilePage() {
    const { id } = useParams();
    const navigate = useNavigate();

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
                            <img src={data.photoUrl} alt={data.firstName} className="docs-profile-hero__avatar" />
                        ) : (
                            <div className="docs-profile-hero__avatar docs-profile-hero__avatar--initials">{initials}</div>
                        )}
                        <div className="docs-profile-hero__body">
                            <h1 className="docs-profile-hero__name">{data.firstName} {data.lastName}</h1>
                            <div className="docs-profile-hero__spec">
                                <Stethoscope size={14} /> {data.specialtyName || 'Doktor'}
                            </div>
                            <div className="docs-profile-hero__chips">
                                {data.yearsExperience != null && (
                                    <span className="docs-card__chip">
                                        <Award size={11} /> {data.yearsExperience} yil tajriba
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
        </div>
    );
}
