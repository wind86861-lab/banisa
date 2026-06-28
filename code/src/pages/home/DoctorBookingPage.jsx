import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Calendar, Clock, ChevronLeft, ChevronRight, Building2, MapPin,
    Stethoscope, Star, Award, Loader2, CheckCircle2, AlertTriangle,
    User, MessageSquare, GraduationCap,
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

// Mirror the labels from DoctorsPage / DoctorProfilePage so the booking
// page shows the same credential pills as the discovery surface.
const CATEGORY_LABELS = {
    OLIY: 'Oliy toifa',
    BIRINCHI: 'Birinchi toifa',
    IKKINCHI: 'Ikkinchi toifa',
    YOSH_MUTAXASSIS: 'Yosh mutaxassis',
};
const fmtCategory = (c) => CATEGORY_LABELS[c] || c || null;

// Build a Tashkent-local ISO string from a YYYY-MM-DD date + HH:MM time.
// The old code used `new Date(\`${date}T${time}:00\`).toISOString()` which
// interpreted the input as BROWSER local time — so a patient browsing
// from Moscow (UTC+3) booking the "10:00 Tashkent" slot actually
// reserved "09:00 Tashkent". Slots come from the backend already aware
// of Asia/Tashkent (UTC+5), so we serialize against that offset
// explicitly instead of letting the browser guess.
function scheduledAtTashkent(dateIso, timeHHMM) {
    return `${dateIso}T${timeHHMM}:00.000+05:00`;
}

// Format full name + patronymic ("Karimov Bahodir Akmalovich") with safe
// fallbacks. `?.` defaults to '?' so a missing field doesn't crash the
// initials helper or render "undefined undefined".
function fullName(d) {
    const parts = [d?.lastName, d?.firstName, d?.middleName].filter(Boolean);
    return parts.join(' ') || 'Doktor';
}
function initialsOf(d) {
    const f = (d?.firstName || '?').charAt(0).toUpperCase();
    const l = (d?.lastName || '?').charAt(0).toUpperCase();
    return `${f}${l}`;
}

// One 14-day window starting at `start` (chip row). Pagination buttons
// move `start` forward by 14 days so a patient can book a month or more
// ahead — the old version only ever rendered "next 14 from today".
function buildWeekStarting(start) {
    const days = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = 0; i < 14; i++) {
        const d = new Date(start);
        d.setDate(d.getDate() + i);
        d.setHours(0, 0, 0, 0);
        // Use the LOCAL YYYY-MM-DD rather than toISOString().slice(0,10)
        // — the latter shifts to UTC and would label "today" as
        // "yesterday" past 19:00 Tashkent time.
        const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        days.push({
            date: d,
            iso,
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
    // UserAuthContext exposes `user` + `isLoggedIn` (not `isAuthenticated`);
    // the old destructure of `isAuthenticated` was always undefined, so
    // every visitor — even logged-in patients — was bounced to the
    // "Avval ro'yxatdan o'ting" screen and could never book a doctor.
    const { isLoggedIn } = useUserAuth();

    const [weekStart, setWeekStart] = useState(() => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        return d;
    });
    const [selectedDate, setSelectedDate] = useState(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    });
    const [selectedSlot, setSelectedSlot] = useState(null);
    const [notes, setNotes] = useState('');

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
            // Anchor the picked slot to Asia/Tashkent regardless of where
            // the patient is browsing from — see scheduledAtTashkent().
            const scheduledAt = scheduledAtTashkent(selectedDate, selectedSlot);
            return (await api.post('/user/appointments/doctor', {
                doctorId,
                clinicId,
                scheduledAt,
                notes: notes || null,
            })).data;
        },
        onSuccess: (data) => {
            // The patient appointment route is /user/appointments/:id;
            // /profile/appointments/:id is from a never-shipped legacy
            // proposal and 404s today.
            const id = data?.data?.id;
            if (id) navigate(`/user/appointments/${id}`);
            else navigate('/user/appointments');
        },
    });

    if (doctorLoading) {
        return (
            <div className="docs-page-wrap">
                <TopBar /><Navigation />
                <main className="docs-page">
                    <div className="docs-skel book-skel-hero" />
                    <div className="docs-skel book-skel-body" />
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

    if (!isLoggedIn) {
        const redirectTo = encodeURIComponent(window.location.pathname + window.location.search);
        return (
            <div className="docs-page-wrap">
                <TopBar /><Navigation />
                <main className="docs-page">
                    <div className="docs-empty">
                        <User size={48} color="#cbd5e1" />
                        <h3>Avval ro'yxatdan o'ting</h3>
                        <p>Band qilish uchun tizimga kiring</p>
                        {/* Patient login lives at /user/login (clinic admin
                            login is the /login route). UserLoginPage reads
                            ?redirect= so the patient comes straight back to
                            this booking page after login. */}
                        <Link to={`/user/login?redirect=${redirectTo}`} className="docs-btn">
                            Kirish / Ro'yxatdan o'tish
                        </Link>
                    </div>
                </main>
                <Footer />
            </div>
        );
    }

    const initials = initialsOf(doctor);
    const finalPrice = clinic.consultationPrice;
    const availableCount = slotsData?.slots?.filter((s) => s.available).length ?? 0;
    // Disable "previous" pagination so the patient can't browse into the
    // past; "today" is always the earliest legal starting point.
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const canGoBack = weekStart.getTime() > today.getTime();
    const movewWeek = (delta) => {
        setWeekStart((cur) => {
            const next = new Date(cur);
            next.setDate(next.getDate() + delta);
            // Clamp at "today" so the back button never lands in the past.
            return next < today ? today : next;
        });
        setSelectedSlot(null);
    };

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
                                <img loading="lazy" src={doctor.photoUrl} alt="" className="book-doc-card__avatar" />
                            ) : (
                                <div className="book-doc-card__avatar book-doc-card__avatar--init">{initials}</div>
                            )}
                            <div className="book-doc-card__body">
                                {/* Use the full UZ greeting form so the patient sees the
                                    same name on this page as on the doctor profile they
                                    came from. */}
                                <div className="book-doc-card__name">{fullName(doctor)}</div>
                                <div className="book-doc-card__spec">
                                    <Stethoscope size={11} /> {doctor.specialtyName}
                                </div>
                                <div className="book-doc-card__chips">
                                    {fmtCategory(doctor.category) && (
                                        <span className="book-doc-card__chip book-doc-card__chip--accent">
                                            <Award size={10} /> {fmtCategory(doctor.category)}
                                        </span>
                                    )}
                                    {doctor.academicTitle && (
                                        <span className="book-doc-card__chip book-doc-card__chip--accent">
                                            <GraduationCap size={10} /> {doctor.academicTitle}
                                        </span>
                                    )}
                                    <span><Award size={10} /> {doctor.yearsExperience || 0} yil</span>
                                    <span><Star size={10} fill="#fbbf24" color="#fbbf24" /> {doctor.reviewCount > 0 ? doctor.averageRating.toFixed(1) : 'Yangi'}</span>
                                </div>
                            </div>
                        </motion.section>

                        <section className="book-section">
                            <div className="book-section__title">
                                <Calendar size={14} /> Sana tanlang
                                <div className="book-week-nav">
                                    <button
                                        type="button"
                                        className="book-week-nav__btn"
                                        onClick={() => movewWeek(-14)}
                                        disabled={!canGoBack}
                                        aria-label="Oldingi ikki hafta"
                                    >
                                        <ChevronLeft size={14} />
                                    </button>
                                    <button
                                        type="button"
                                        className="book-week-nav__btn"
                                        onClick={() => movewWeek(14)}
                                        aria-label="Keyingi ikki hafta"
                                    >
                                        <ChevronRight size={14} />
                                    </button>
                                </div>
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
                                    {[...Array(12)].map((_, i) => <div key={i} className="docs-skel book-slot-skel" />)}
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
                            <div className="book-summary__clinic-name">{clinic.clinicName}</div>
                            <div className="book-summary__clinic-addr">
                                <MapPin size={10} /> {clinic.region}, {clinic.district}
                            </div>
                            {clinic.roomNumber && (
                                <div className="book-summary__clinic-room">
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
                            className="docs-btn docs-btn--primary book-confirm-btn"
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
