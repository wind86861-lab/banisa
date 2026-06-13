import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Calendar, Clock, ChevronLeft, ChevronRight, Building2, MapPin,
    Stethoscope, Star, Award, Loader2, CheckCircle2, AlertTriangle,
    User, MessageSquare, CreditCard,
} from 'lucide-react';
import api from '../../shared/api/axios';
import { friendlyApiError } from '../../shared/utils/apiError';
import TopBar from './TopBar';
import Navigation from './Navigation';
import Footer from './Footer';
import { useUserAuth } from '../../shared/auth/UserAuthContext';
import './css/DoctorsPage.css';
import './css/DoctorBooking.css';

const fmtPrice = (n) => (Number(n) || 0).toLocaleString('uz-UZ');
const DAY_NAMES = ['Yak', 'Du', 'Se', 'Cho', 'Pa', 'Ju', 'Sha'];
const MONTH_NAMES = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyun', 'Iyul', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek'];

function buildWeekStarting(start) {
    const days = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = 0; i < 14; i++) {
        const d = new Date(start);
        d.setDate(d.getDate() + i);
        d.setHours(0, 0, 0, 0);
        days.push({
            date: d,
            iso: d.toISOString().slice(0, 10),
            isToday: d.getTime() === today.getTime(),
            isPast: d < today,
        });
    }
    return days;
}

function DayChip({ day, active, onClick }) {
    return (
        <button
            className={`book-day ${active ? 'book-day--on' : ''} ${day.isPast ? 'book-day--off' : ''}`}
            onClick={onClick}
            disabled={day.isPast}
        >
            <div className="book-day__name">{DAY_NAMES[day.date.getDay()]}</div>
            <div className="book-day__num">{day.date.getDate()}</div>
            <div className="book-day__mon">{MONTH_NAMES[day.date.getMonth()]}</div>
            {day.isToday && <div className="book-day__pill">Bugun</div>}
        </button>
    );
}

function SlotButton({ slot, active, onClick }) {
    const reasonLabel = {
        'past': 'O\'tib bo\'ldi',
        'booked-here': 'Band',
        'booked-elsewhere': 'Boshqa klinikada band',
        'time-off': 'Dam olish',
    };
    return (
        <button
            className={`book-slot ${active ? 'book-slot--on' : ''} ${!slot.available ? 'book-slot--off' : ''}`}
            onClick={onClick}
            disabled={!slot.available}
            title={slot.reason ? reasonLabel[slot.reason] : ''}
        >
            <Clock size={11} /> {slot.time}
        </button>
    );
}

export default function DoctorBookingPage() {
    const { id: doctorId, clinicId } = useParams();
    const navigate = useNavigate();
    const [params] = useSearchParams();
    const { isAuthenticated } = useUserAuth();

    const [weekStart, setWeekStart] = useState(() => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        return d;
    });
    const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));
    const [selectedSlot, setSelectedSlot] = useState(null);
    const [notes, setNotes] = useState('');
    const [confirmed, setConfirmed] = useState(false);

    const { data: doctor, isLoading: doctorLoading } = useQuery({
        queryKey: ['public', 'doctor', doctorId],
        queryFn: async () => (await api.get(`/public/doctors/${doctorId}`)).data?.data,
    });

    const clinic = doctor?.clinics.find((c) => c.clinicId === clinicId);

    const { data: slotsData, isLoading: slotsLoading } = useQuery({
        queryKey: ['public', 'doctor', doctorId, 'slots', clinicId, selectedDate],
        queryFn: async () => (await api.get(`/public/doctors/${doctorId}/slots`, {
            params: { clinicId, date: selectedDate },
        })).data?.data,
        enabled: !!doctor && !!clinic,
    });

    const days = useMemo(() => buildWeekStarting(weekStart), [weekStart]);

    const book = useMutation({
        mutationFn: async () => {
            const scheduledAt = new Date(`${selectedDate}T${selectedSlot}:00`).toISOString();
            return (await api.post('/user/appointments/doctor', {
                doctorId,
                clinicId,
                scheduledAt,
                notes: notes || null,
            })).data;
        },
        onSuccess: (data) => {
            const id = data?.data?.id;
            if (id) navigate(`/profile/appointments/${id}`);
            else setConfirmed(true);
        },
    });

    if (doctorLoading) {
        return (
            <div className="docs-page-wrap">
                <TopBar /><Navigation />
                <main className="docs-page">
                    <div className="docs-skel" style={{ height: 280, marginBottom: 20 }} />
                    <div className="docs-skel" style={{ height: 400 }} />
                </main>
                <Footer />
            </div>
        );
    }

    if (!doctor || !clinic) {
        return (
            <div className="docs-page-wrap">
                <TopBar /><Navigation />
                <main className="docs-page">
                    <div className="docs-empty">
                        <AlertTriangle size={48} color="#cbd5e1" />
                        <h3>Topilmadi</h3>
                        <p>Doktor yoki klinika faol emas</p>
                        <Link to="/doktorlar" className="docs-btn">Doktorlar ro'yxati</Link>
                    </div>
                </main>
                <Footer />
            </div>
        );
    }

    if (!isAuthenticated) {
        return (
            <div className="docs-page-wrap">
                <TopBar /><Navigation />
                <main className="docs-page">
                    <div className="docs-empty">
                        <User size={48} color="#cbd5e1" />
                        <h3>Avval ro'yxatdan o'ting</h3>
                        <p>Band qilish uchun tizimga kiring</p>
                        <Link to={`/login?return=${encodeURIComponent(window.location.pathname + window.location.search)}`} className="docs-btn">
                            Kirish / Ro'yxatdan o'tish
                        </Link>
                    </div>
                </main>
                <Footer />
            </div>
        );
    }

    const initials = `${doctor.firstName[0]}${doctor.lastName[0]}`.toUpperCase();
    const finalPrice = clinic.consultationPrice;
    const availableCount = slotsData?.slots.filter((s) => s.available).length ?? 0;

    return (
        <div className="docs-page-wrap">
            <TopBar />
            <Navigation />

            <main className="docs-page">
                <Link to={`/doktorlar/${doctorId}`} className="docs-back">
                    <ChevronLeft size={14} /> Doktor sahifasi
                </Link>

                <div className="book-grid">
                    <div className="book-main">
                        <motion.section
                            className="book-doc-card"
                            initial={{ opacity: 0, y: -6 }}
                            animate={{ opacity: 1, y: 0 }}
                        >
                            {doctor.photoUrl ? (
                                <img src={doctor.photoUrl} alt="" className="book-doc-card__avatar" />
                            ) : (
                                <div className="book-doc-card__avatar book-doc-card__avatar--init">{initials}</div>
                            )}
                            <div className="book-doc-card__body">
                                <div className="book-doc-card__name">{doctor.firstName} {doctor.lastName}</div>
                                <div className="book-doc-card__spec">
                                    <Stethoscope size={11} /> {doctor.specialtyName}
                                </div>
                                <div className="book-doc-card__chips">
                                    <span><Award size={10} /> {doctor.yearsExperience || 0} yil</span>
                                    <span><Star size={10} fill="#fbbf24" color="#fbbf24" /> {doctor.reviewCount > 0 ? doctor.averageRating.toFixed(1) : 'Yangi'}</span>
                                </div>
                            </div>
                        </motion.section>

                        <section className="book-section">
                            <div className="book-section__title">
                                <Calendar size={14} /> Sana tanlang
                            </div>
                            <div className="book-week-row">
                                {days.map((d) => (
                                    <DayChip
                                        key={d.iso}
                                        day={d}
                                        active={d.iso === selectedDate}
                                        onClick={() => { setSelectedDate(d.iso); setSelectedSlot(null); }}
                                    />
                                ))}
                            </div>
                        </section>

                        <section className="book-section">
                            <div className="book-section__title">
                                <Clock size={14} /> Vaqt tanlang
                                {availableCount > 0 && (
                                    <span className="book-avail-badge">{availableCount} ta bo'sh</span>
                                )}
                            </div>

                            {slotsLoading ? (
                                <div className="book-slot-grid">
                                    {[...Array(12)].map((_, i) => <div key={i} className="docs-skel" style={{ height: 36 }} />)}
                                </div>
                            ) : !slotsData?.slots || slotsData.slots.length === 0 ? (
                                <div className="book-empty">
                                    <Calendar size={32} color="#cbd5e1" />
                                    <div>Bu kunda doktor qabul qilmaydi</div>
                                </div>
                            ) : (
                                <div className="book-slot-grid">
                                    {slotsData.slots.map((s) => (
                                        <SlotButton
                                            key={s.time}
                                            slot={s}
                                            active={s.time === selectedSlot}
                                            onClick={() => setSelectedSlot(s.time)}
                                        />
                                    ))}
                                </div>
                            )}

                            <div className="book-legend">
                                <span><span className="book-dot book-dot--avail" /> Bo'sh</span>
                                <span><span className="book-dot book-dot--here" /> Band</span>
                                <span><span className="book-dot book-dot--global" /> Boshqa klinikada</span>
                                <span><span className="book-dot book-dot--past" /> O'tib bo'ldi</span>
                            </div>
                        </section>

                        <section className="book-section">
                            <div className="book-section__title">
                                <MessageSquare size={14} /> Izoh (ixtiyoriy)
                            </div>
                            <textarea
                                className="book-notes"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                rows={3}
                                placeholder="Doktor uchun qo'shimcha ma'lumot — shikoyatlar, oldingi tashxis va h.k."
                            />
                        </section>
                    </div>

                    <aside className="book-summary">
                        <div className="book-summary__title">
                            <Building2 size={14} /> Klinika
                        </div>
                        <div className="book-summary__clinic">
                            <div style={{ fontWeight: 800, fontSize: 14, color: '#0f172a' }}>{clinic.clinicName}</div>
                            <div style={{ fontSize: 11, color: '#64748b', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                                <MapPin size={10} /> {clinic.region}, {clinic.district}
                            </div>
                            {clinic.roomNumber && (
                                <div style={{ fontSize: 12, marginTop: 6 }}>
                                    Xona: <strong>{clinic.roomNumber}</strong>
                                </div>
                            )}
                        </div>

                        <div className="book-summary__divider" />

                        <div className="book-summary__row">
                            <span>Konsultatsiya</span>
                            <strong>{fmtPrice(clinic.consultationPrice)} so'm</strong>
                        </div>
                        <div className="book-summary__row book-summary__row--total">
                            <span>Jami</span>
                            <strong>{fmtPrice(finalPrice)} so'm</strong>
                        </div>

                        {selectedSlot && (
                            <div className="book-summary__chosen">
                                <Calendar size={12} />
                                <span>
                                    {new Date(selectedDate).toLocaleDateString('uz-UZ', { day: '2-digit', month: 'short' })}
                                    {' '}<strong>{selectedSlot}</strong>
                                </span>
                            </div>
                        )}

                        {book.isError && (
                            <div className="book-error">
                                <AlertTriangle size={12} />
                                {friendlyApiError(book.error, 'Band qilishda xato')}
                            </div>
                        )}

                        <button
                            className="docs-btn docs-btn--primary"
                            style={{ width: '100%', justifyContent: 'center', marginTop: 16 }}
                            disabled={!selectedSlot || book.isPending}
                            onClick={() => book.mutate()}
                        >
                            {book.isPending ? <Loader2 size={14} className="docs-spin" /> : <CheckCircle2 size={14} />}
                            Band qilishni tasdiqlash
                        </button>

                        <div className="book-summary__note">
                            Band qilingach klinika tasdiqlaydi. To'lov klinikada — Payme yoki naqd.
                        </div>
                    </aside>
                </div>
            </main>

            <Footer />
        </div>
    );
}
