import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
    Calendar, Clock, ChevronRight, ArrowRight, Search,
    Building2, CreditCard, Banknote, CheckCircle2, AlertCircle, Hourglass,
    ChevronLeft, Camera, X, Loader2
} from 'lucide-react';
import api from '../../shared/api/axios';
import { statusLabel, canCheckIn, awaitingCashier, isReadyForService } from '../../shared/utils/appointmentStatus';
import { fmtSum, shortBookingNo } from '../../shared/utils/format';
import TopBar from '../../pages/home/TopBar';
import Navigation from '../../pages/home/Navigation';
import Footer from '../../pages/home/Footer';
import BanisaLoader from '../../shared/components/BanisaLoader';
import './css/UserAppointments.css';

const ACTIVE_STATUSES = ['PENDING', 'PENDING_ARRIVAL', 'OPERATOR_CONFIRMED', 'SENT_TO_CLINIC', 'CLINIC_ACCEPTED', 'CHECKED_IN', 'IN_PROGRESS', 'PAID'];
const PAST_STATUSES = ['COMPLETED', 'CANCELLED', 'NO_SHOW'];

const UZ_WEEKDAYS_SHORT = ['Yak', 'Du', 'Se', 'Cho', 'Pay', 'Ju', 'Sha'];
const UZ_MONTHS_SHORT = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyun', 'Iyul', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek'];

function serviceNameOf(a) {
    if (a.services && Array.isArray(a.services) && a.services.length > 0) {
        if (a.services.length === 1) return a.services[0].serviceName;
        return a.services.map(s => s.serviceName).join(', ');
    }
    return a.diagnosticService?.nameUz ||
        a.surgicalService?.nameUz ||
        a.checkupPackage?.nameUz ||
        a.serviceName ||
        'Xizmat';
}

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

    const { data, isLoading } = useQuery({
        queryKey: ['user', 'appointments', statusFilter, page],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (statusFilter !== 'all' && !['active', 'past', 'action'].includes(statusFilter)) {
                params.set('status', statusFilter);
            }
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

    const filtered = useMemo(() => {
        let list = appointments;
        if (statusFilter === 'active') list = list.filter(a => ACTIVE_STATUSES.includes(a.status));
        else if (statusFilter === 'past') list = list.filter(a => PAST_STATUSES.includes(a.status));
        else if (statusFilter === 'action') list = list.filter(a => canCheckIn(a) || awaitingCashier(a));
        if (search.trim()) {
            const q = search.toLowerCase();
            list = list.filter(a =>
                (a.clinic?.nameUz || '').toLowerCase().includes(q) ||
                serviceNameOf(a).toLowerCase().includes(q) ||
                (a.bookingNumber || '').toLowerCase().includes(q)
            );
        }
        return list;
    }, [appointments, statusFilter, search]);

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

    const groups = useMemo(() => {
        const g = { today: [], tomorrow: [], upcoming: [], past: [] };
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const tmr = new Date(now);
        tmr.setDate(tmr.getDate() + 1);
        for (const a of filtered) {
            const d = new Date(a.scheduledAt);
            d.setHours(0, 0, 0, 0);
            if (PAST_STATUSES.includes(a.status) || d < now) {
                g.past.push(a);
            } else if (d.getTime() === now.getTime()) {
                g.today.push(a);
            } else if (d.getTime() === tmr.getTime()) {
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
