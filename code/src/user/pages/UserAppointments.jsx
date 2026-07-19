import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
    Calendar, Clock, ChevronRight, ArrowRight, Search,
    Building2, CreditCard, Banknote, CheckCircle2, AlertCircle, Hourglass,
    ChevronLeft, Camera, X, Loader2, Ambulance
} from 'lucide-react';
import api from '../../shared/api/axios';
import { statusLabel, canCheckIn, awaitingCashier, isReadyForService, serviceNameOf } from '../../shared/utils/appointmentStatus';
import { fmtSum, shortBookingNo } from '../../shared/utils/format';
import TopBar from '../../pages/home/TopBar';
import Navigation from '../../pages/home/Navigation';
import Footer from '../../pages/home/Footer';
import BanisaLoader from '../../shared/components/BanisaLoader';
import './css/UserAppointments.css';

const ACTIVE_STATUSES = ['PENDING', 'CONFIRMED', 'CHECKED_IN', 'IN_PROGRESS'];
const PAST_STATUSES = ['COMPLETED', 'CANCELLED', 'NO_SHOW'];

const UZ_WEEKDAYS_SHORT = ['Yak', 'Du', 'Se', 'Cho', 'Pay', 'Ju', 'Sha'];
const UZ_MONTHS_SHORT = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyun', 'Iyul', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek'];

function paymentBadge(a) {
    if (a.paymentStatus === 'PAID') return { icon: <CheckCircle2 size={11} />, text: 'To\'langan', cls: 'paid' };
    if (a.paymentMethod === 'CASH') return { icon: <Banknote size={11} />, text: 'Naqd', cls: 'cash' };
    if (a.paymentMethod) return { icon: <CreditCard size={11} />, text: a.paymentMethod, cls: 'online' };
    return { icon: <Hourglass size={11} />, text: 'To\'lov kutilmoqda', cls: 'pending' };
}

export default function UserAppointments() {
    const navigate = useNavigate();
    const [statusFilter, setStatusFilter] = useState('all');
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [filterSheetOpen, setFilterSheetOpen] = useState(false);

    // Debounce search so each keystroke doesn't fire a request. 300 ms is
    // the same window we use elsewhere (XizmatlarPage facet inputs).
    const [debouncedSearch, setDebouncedSearch] = useState(search);
    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
        return () => clearTimeout(t);
    }, [search]);

    const { data, isLoading } = useQuery({
        queryKey: ['user', 'appointments', statusFilter, page, debouncedSearch],
        queryFn: async () => {
            const params = new URLSearchParams();
            // "active" / "past" / "action" → multi-status filter handled
            // server-side via ?statuses=. Single statuses still go through
            // ?status= for back-compat with bookmarked links.
            if (statusFilter === 'active') {
                params.set('statuses', ACTIVE_STATUSES.join(','));
            } else if (statusFilter === 'past') {
                params.set('statuses', PAST_STATUSES.join(','));
            } else if (statusFilter !== 'all' && statusFilter !== 'action') {
                params.set('status', statusFilter);
            }
            if (debouncedSearch) params.set('search', debouncedSearch);
            params.set('page', page.toString());
            params.set('limit', '20');
            const res = await api.get(`/user/appointments?${params}`);
            return res.data;
        },
        refetchInterval: (q) => {
            const items = q.state.data?.data || [];
            return items.some(a => ACTIVE_STATUSES.includes(a.status)) ? 15000 : false;
        },
    });

    const appointments = data?.data || [];
    const meta = data?.meta || {};

    // "Harakat kerak" can't be expressed as a single status query (it's a
    // derived predicate on top of status + paymentStatus + payment method),
    // so this preset still filters client-side. Otherwise the list is
    // authoritative from the server.
    const filtered = useMemo(() => {
        if (statusFilter === 'action') {
            return appointments.filter(a => canCheckIn(a) || awaitingCashier(a));
        }
        return appointments;
    }, [appointments, statusFilter]);

    const stats = useMemo(() => {
        const total = appointments.length;
        const active = appointments.filter(a => ACTIVE_STATUSES.includes(a.status)).length;
        const needAction = appointments.filter(a => canCheckIn(a) || awaitingCashier(a)).length;
        const completed = appointments.filter(a => a.status === 'COMPLETED').length;
        return { total, active, needAction, completed };
    }, [appointments]);

    const filters = [
        { value: 'all', label: 'Barchasi', count: appointments.length },
        { value: 'action', label: 'Harakat kerak', count: stats.needAction, highlight: stats.needAction > 0 },
        { value: 'active', label: 'Faol', count: stats.active },
        { value: 'past', label: 'Yakunlangan', count: appointments.filter(a => PAST_STATUSES.includes(a.status)).length },
    ];

    // "Today" / "Tomorrow" are anchored to Asia/Tashkent — clinic working
    // hours and check-in QRs are all keyed to that timezone, and a patient
    // browsing from a different TZ would otherwise see the morning slot
    // in Tashkent labelled "Tomorrow" (or vice versa). We project both
    // sides into Tashkent local YYYY-MM-DD strings and compare those.
    const groups = useMemo(() => {
        const g = { today: [], tomorrow: [], upcoming: [], past: [] };
        const TZ = 'Asia/Tashkent';
        const ymdInTashkent = (d) => d.toLocaleDateString('en-CA', { timeZone: TZ });
        const today = ymdInTashkent(new Date());
        const tomorrowDate = new Date();
        tomorrowDate.setDate(tomorrowDate.getDate() + 1);
        const tomorrow = ymdInTashkent(tomorrowDate);
        for (const a of filtered) {
            const dStr = ymdInTashkent(new Date(a.scheduledAt));
            if (PAST_STATUSES.includes(a.status) || dStr < today) {
                g.past.push(a);
            } else if (dStr === today) {
                g.today.push(a);
            } else if (dStr === tomorrow) {
                g.tomorrow.push(a);
            } else {
                g.upcoming.push(a);
            }
        }
        const byTime = (a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt);
        g.today.sort(byTime);
        g.tomorrow.sort(byTime);
        g.upcoming.sort(byTime);
        g.past.sort((a, b) => new Date(b.scheduledAt) - new Date(a.scheduledAt));
        return g;
    }, [filtered]);

    const hasAny = groups.today.length + groups.tomorrow.length + groups.upcoming.length + groups.past.length > 0;
    const totalFiltered = filtered.length;

    const goScan = () => navigate('/user/scan-checkin');

    return (
        <div className="home-page">
            <TopBar />
            <Navigation />
            <main className="home-container ua-main">
                <div className="ua-page-header">
                    <div className="ua-page-header-left">
                        <div className="ua-greeting">
                            <span className="ua-greeting-emoji">👋</span>
                            <span className="ua-greeting-text">Salom!</span>
                        </div>
                        <h1>Bronlarim</h1>
                        <div className="ua-stats">
                            <div className="ua-stat">
                                <span className="ua-stat-value">{meta.total || 0}</span>
                                <span className="ua-stat-label">Jami</span>
                            </div>
                            <div className="ua-stat-divider" />
                            <div className="ua-stat">
                                <span className="ua-stat-value">{groups.today.length + groups.tomorrow.length}</span>
                                <span className="ua-stat-label">Yaqinda</span>
                            </div>
                            <div className="ua-stat-divider" />
                            <div className="ua-stat">
                                <span className="ua-stat-value">{groups.past.length}</span>
                                <span className="ua-stat-label">Yakunlangan</span>
                            </div>
                        </div>
                    </div>
                    <Link to="/xizmatlar" className="ua-new-btn">
                        Yangi bron <ArrowRight size={16} />
                    </Link>
                </div>

                <SkorySection />

                <div className="ua-toolbar">
                    <div className="ua-search-wrap">
                        <Search size={18} className="ua-search-icon" />
                        <input
                            type="text"
                            placeholder="Klinika, xizmat yoki bron raqami..."
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                        />
                        {search && <button className="ua-search-clear" onClick={() => setSearch('')}><X size={16} /></button>}
                    </div>
                    <div className="ua-filters ua-filters--desktop">
                        {filters.map(filter => (
                            <button
                                key={filter.value}
                                onClick={() => { setStatusFilter(filter.value); setPage(1); }}
                                className={`ua-filter-btn ${statusFilter === filter.value ? 'active' : ''} ${filter.highlight ? 'highlight' : ''}`}
                            >
                                {filter.label}
                                {filter.count > 0 && <span className="ua-filter-count">{filter.count}</span>}
                            </button>
                        ))}
                    </div>
                    <button className="ua-filter-mobile-btn" onClick={() => setFilterSheetOpen(true)}>
                        Filter ({filters.find(f => f.value === statusFilter)?.label})
                    </button>
                </div>

                {isLoading ? (
                    <BanisaLoader message="Bronlar yuklanmoqda..." />
                ) : !hasAny ? (
                    <div className="ua-empty">
                        <Calendar size={48} className="ua-empty-icon" />
                        <h3>{search ? 'Hech narsa topilmadi' : 'Hali bronlar yo\'q'}</h3>
                        <p>{search ? 'Boshqa kalit so\'z bilan qidirib ko\'ring' : 'Birinchi bronni yaratish uchun xizmatlarni ko\'ring'}</p>
                        {!search && (
                            <Link to="/xizmatlar" className="ua-empty-btn">
                                Xizmatlarni ko'rish <ArrowRight size={16} />
                            </Link>
                        )}
                    </div>
                ) : (
                    <div className="ua-list">
                        {search.trim() && totalFiltered > 0 && (
                            <div className="ua-found-count">{totalFiltered} ta bron topildi</div>
                        )}
                        {groups.today.length > 0 && (
                            <>
                                <div className="ua-group-header ua-group-header--today">
                                    <span className="ua-group-icon">🔥</span>
                                    Bugun
                                    <span className="ua-group-count">{groups.today.length}</span>
                                </div>
                                {groups.today.map(a => (
                                    <AppointmentCard key={a.id} a={a} onCheckIn={goScan} groupType="today" />
                                ))}
                            </>
                        )}
                        {groups.tomorrow.length > 0 && (
                            <>
                                <div className="ua-group-header ua-group-header--tomorrow">
                                    <span className="ua-group-icon">⏰</span>
                                    Ertaga
                                    <span className="ua-group-count">{groups.tomorrow.length}</span>
                                </div>
                                {groups.tomorrow.map(a => (
                                    <AppointmentCard key={a.id} a={a} onCheckIn={goScan} groupType="tomorrow" />
                                ))}
                            </>
                        )}
                        {groups.upcoming.length > 0 && (
                            <>
                                <div className="ua-group-header ua-group-header--upcoming">
                                    <span className="ua-group-icon">📅</span>
                                    Kelajak
                                    <span className="ua-group-count">{groups.upcoming.length}</span>
                                </div>
                                {groups.upcoming.map(a => (
                                    <AppointmentCard key={a.id} a={a} onCheckIn={goScan} groupType="upcoming" />
                                ))}
                            </>
                        )}
                        {groups.past.length > 0 && (
                            <>
                                <div className="ua-group-header ua-group-header--past">
                                    <span className="ua-group-icon">✓</span>
                                    Yakunlangan
                                    <span className="ua-group-count">{groups.past.length}</span>
                                </div>
                                {groups.past.map(a => (
                                    <AppointmentCard key={a.id} a={a} onCheckIn={goScan} groupType="past" />
                                ))}
                            </>
                        )}
                    </div>
                )}

                {meta.totalPages > 1 && (
                    <div className="ua-pagination">
                        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="ua-page-btn">
                            <ChevronLeft size={16} /> Oldingi
                        </button>
                        <span className="ua-page-info">{page} / {meta.totalPages}</span>
                        <button onClick={() => setPage(p => Math.min(meta.totalPages, p + 1))} disabled={page === meta.totalPages} className="ua-page-btn">
                            Keyingi <ChevronRight size={16} />
                        </button>
                    </div>
                )}
            </main>

            {filterSheetOpen && (
                <div className="ua-bottom-sheet-overlay" onClick={() => setFilterSheetOpen(false)}>
                    <div className="ua-bottom-sheet" onClick={e => e.stopPropagation()}>
                        <div className="ua-bottom-sheet-handle" />
                        <div className="ua-bottom-sheet-header">
                            <h3>Filter</h3>
                            <button onClick={() => setFilterSheetOpen(false)}><X size={20} /></button>
                        </div>
                        <div className="ua-bottom-sheet-content">
                            {filters.map(filter => (
                                <button
                                    key={filter.value}
                                    onClick={() => {
                                        setStatusFilter(filter.value);
                                        setPage(1);
                                        setFilterSheetOpen(false);
                                    }}
                                    className={`ua-bottom-sheet-option ${statusFilter === filter.value ? 'active' : ''} ${filter.highlight ? 'highlight' : ''}`}
                                >
                                    <span>{filter.label}</span>
                                    {filter.count > 0 && <span className="ua-bottom-sheet-count">{filter.count}</span>}
                                    {statusFilter === filter.value && <CheckCircle2 size={18} />}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            <Footer />
        </div>
    );
}

function AppointmentCard({ a, onCheckIn, groupType = 'upcoming' }) {
    const navigate = useNavigate();
    const badge = statusLabel(a.status);
    const dateRaw = a.scheduledAt ? new Date(a.scheduledAt) : null;
    const pay = paymentBadge(a);
    const needs = canCheckIn(a);
    const awaits = awaitingCashier(a);
    const ready = isReadyForService(a);
    const isCash = a.paymentMethod === 'CASH';

    const handleCardClick = (e) => {
        if (e.target.closest('.ua-card-action button')) return;
        navigate(`/user/appointments/${a.id}`);
    };

    return (
        <div
            onClick={handleCardClick}
            className={`ua-card ua-card--${groupType} ${needs || awaits ? 'ua-card--urgent' : ''}`}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleCardClick(e); }}
        >
            <div className="ua-card-left">
                <div className="ua-card-date">
                    <div className="ua-card-date-num">{dateRaw ? dateRaw.getDate() : '--'}</div>
                    <div className="ua-card-date-mon">{dateRaw ? UZ_MONTHS_SHORT[dateRaw.getMonth()] : '--'}</div>
                    <div className="ua-card-date-wd">{dateRaw ? UZ_WEEKDAYS_SHORT[dateRaw.getDay()] : '--'}</div>
                </div>
                <div className="ua-card-time">
                    <Clock size={12} />
                    {dateRaw
                        ? dateRaw.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })
                        : '--:--'}
                </div>
            </div>
            <div className="ua-card-main">
                <div className="ua-card-top">
                    <div className="ua-card-clinic-wrap">
                        <Building2 size={13} />
                        <span className="ua-card-clinic">{a.clinic?.nameUz || 'Klinika'}</span>
                    </div>
                    <span className="ua-card-status" style={{ backgroundColor: badge.bg, color: badge.color }}>
                        {badge.text}
                    </span>
                </div>
                <div className="ua-card-service">{serviceNameOf(a)}</div>
                <div className="ua-card-meta-row">
                    <span className={`ua-chip ua-chip--${pay.cls}`}>{pay.icon} {pay.text}</span>
                    {a.bookingNumber && <span className="ua-chip ua-chip--bron">{shortBookingNo(a.bookingNumber)}</span>}
                </div>
                {needs && (
                    <div className="ua-card-action ua-card-action--warn">
                        <div className="ua-card-action-body">
                            <Camera size={13} />
                            <span>{isCash ? 'Klinikaga keldingizmi? QR skanerlang' : 'Klinikaga yetib bordingizmi? Kelishingizni bildiring'}</span>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); onCheckIn(); }}>Skanerlash</button>
                    </div>
                )}
                {awaits && (
                    <div className="ua-card-action ua-card-action--info">
                        <Loader2 size={13} className="ua-spin" />
                        <span>Kassada to'lang — kassir tasdiqlashini kuting</span>
                    </div>
                )}
                {ready && a.status !== 'COMPLETED' && (
                    <div className="ua-card-action ua-card-action--ok">
                        <CheckCircle2 size={13} />
                        <span>Xizmat xonasiga o'ting</span>
                    </div>
                )}
            </div>
            <div className="ua-card-right">
                <div className="ua-card-price">{fmtSum(a.finalPrice || a.price)} <span>so'm</span></div>
                <ChevronRight size={18} className="ua-card-chevron" />
            </div>
        </div>
    );
}

// ─── Tez yordam (skory) trips in the patient's bookings ─────────────────────
const SKORY_TYPE_LABEL = { BASIC: 'Oddiy transport', INTENSIVE_CARE: 'Reanimatsion' };
const SKORY_STATUS_LABEL = {
    DISPATCHED: 'Yo\'lda', ON_ROUTE: 'Yo\'lda', ARRIVED: 'Yetib keldi',
    PICKED_UP: 'Yo\'lda', DELIVERED: 'To\'lov kutilmoqda', COMPLETED: 'Yakunlandi',
};

function SkorySection() {
    const navigate = useNavigate();
    const { data } = useQuery({
        queryKey: ['skory', 'history'],
        queryFn: async () => (await api.get('/skory/history')).data?.data?.items ?? [],
        // Only keep polling while a trip is still running / awaiting payment —
        // patients who never used skory shouldn't poll at all.
        refetchInterval: (q) => {
            const items = q.state.data || [];
            return items.some((s) => s.status !== 'COMPLETED' || s.paymentStatus !== 'PAID') ? 8000 : false;
        },
    });
    const items = data || [];
    if (items.length === 0) return null;

    return (
        <div className="ua-skory-section">
            <div className="ua-skory-head"><Ambulance size={16} /> Tez yordam chaqiruvlari</div>
            <div className="ua-skory-list">
                {items.map((s) => {
                    const unpaid = s.status === 'DELIVERED' && s.paymentStatus !== 'PAID';
                    const paid = s.paymentStatus === 'PAID';
                    return (
                        <button
                            key={s.id}
                            className="ua-skory-card"
                            onClick={() => navigate(`/skory/pay/${s.id}`)}
                        >
                            <div className="ua-skory-card__icon"><Ambulance size={18} /></div>
                            <div className="ua-skory-card__body">
                                <div className="ua-skory-card__top">
                                    <span className="ua-skory-card__clinic">{s.acceptedAmbulance?.clinic?.nameUz || 'Tez yordam'}</span>
                                    <span className={`ua-skory-card__badge ${unpaid ? 'is-unpaid' : paid ? 'is-paid' : ''}`}>
                                        {SKORY_STATUS_LABEL[s.status] || s.status}
                                    </span>
                                </div>
                                <div className="ua-skory-card__sub">
                                    {SKORY_TYPE_LABEL[s.type] || 'Transport'}
                                    {s.totalPrice > 0 && <> · {(s.paidAmount || s.totalPrice).toLocaleString('uz-UZ')} so'm</>}
                                    {s.destAddress && <> · {s.destAddress}</>}
                                </div>
                            </div>
                            {unpaid
                                ? <span className="ua-skory-card__pay">To'lash</span>
                                : <ChevronRight size={16} className="ua-card-chevron" />}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
