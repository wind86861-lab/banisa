import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Html5Qrcode } from 'html5-qrcode';
import {
    Calendar, Clock, ChevronRight, ArrowRight, Search,
    Building2, CreditCard, Banknote, CheckCircle2, AlertCircle, Hourglass,
    Stethoscope, ChevronLeft, Camera, X, Loader2
} from 'lucide-react';
import api from '../../shared/api/axios';
import { statusLabel, needsCheckIn, awaitingCashier, isReadyForService } from '../../shared/utils/appointmentStatus';
import { fmtSum, shortBookingNo } from '../../shared/utils/format';
import TopBar from '../../pages/home/TopBar';
import Navigation from '../../pages/home/Navigation';
import Footer from '../../pages/home/Footer';
import Confetti from '../components/Confetti';
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
    const qc = useQueryClient();
    const [statusFilter, setStatusFilter] = useState('all');
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);

    const [scannerOpen, setScannerOpen] = useState(false);
    const [scanError, setScanError] = useState('');
    const [checkinResult, setCheckinResult] = useState(null);
    const [filterSheetOpen, setFilterSheetOpen] = useState(false);
    const [showConfetti, setShowConfetti] = useState(false);
    const html5Ref = useRef(null);
    const pollRef = useRef(null);
    const secretRef = useRef(null);

    const stopScanner = useCallback(async () => {
        if (html5Ref.current) {
            try { await html5Ref.current.stop(); } catch { }
            try { html5Ref.current.clear(); } catch { }
            html5Ref.current = null;
        }
    }, []);

    const closeScanner = useCallback(async () => {
        await stopScanner();
        setScannerOpen(false);
        setScanError('');
    }, [stopScanner]);

    const handleScanSuccess = useCallback(async (text) => {
        let secret = text.trim();
        const match = secret.match(/\/checkin\/([A-Za-z0-9_-]+)/);
        if (match) secret = match[1];
        if (!/^[A-Za-z0-9_-]{8,}$/.test(secret)) {
            setScanError("Noto'g'ri QR kod.");
            return;
        }
        await stopScanner();
        setScannerOpen(false);
        setCheckinResult({ step: 'loading' });
        try {
            const res = await api.post('/user/appointments/scan-checkin', { secret });
            const data = res.data?.data;
            if (!data) { setCheckinResult({ step: 'error', msg: 'Javob topilmadi' }); return; }
            if (data.kind === 'none') {
                setCheckinResult({ step: 'error', msg: `${data.clinic?.nameUz || 'Bu klinika'}da bugun siz uchun bron topilmadi.` });
            } else if (data.kind === 'checked_in' || data.kind === 'already') {
                secretRef.current = null;
                const isPaid = data.appointment?.paymentStatus === 'PAID';
                setCheckinResult({ step: isPaid ? 'paid' : 'success', appointment: data.appointment });
                playSuccessChime();
                if (navigator.vibrate) { try { navigator.vibrate([60, 40, 60]); } catch { } }
                qc.invalidateQueries({ queryKey: ['user', 'appointments'] });
            } else {
                setCheckinResult({ step: 'error', msg: 'Noma\'lum javob turi' });
            }
        } catch (e) {
            setCheckinResult({ step: 'error', msg: e.response?.data?.error?.message || e.response?.data?.message || 'Check-in xatoligi' });
        }
    }, [stopScanner, qc]);

    const pickAppointment = useCallback(async (appt) => {
        setCheckinResult({ step: 'loading' });
        try {
            const secret = secretRef.current;
            const res = await api.post(`/user/appointments/${appt.id}/patient-checkin`, { clinicSecret: secret });
            const isPaid = res.data?.data?.paymentStatus === 'PAID';
            setCheckinResult({ step: isPaid ? 'paid' : 'success', appointment: res.data?.data });
            playSuccessChime();
            qc.invalidateQueries({ queryKey: ['user', 'appointments'] });
        } catch (e) {
            setCheckinResult({ step: 'error', msg: e.response?.data?.error?.message || e.response?.data?.message || 'Check-in xatoligi' });
        }
    }, [qc]);

    useEffect(() => {
        if (!scannerOpen) return;
        let cancelled = false;
        (async () => {
            try {
                const scanner = new Html5Qrcode('ua-qr-reader');
                html5Ref.current = scanner;
                await scanner.start(
                    { facingMode: 'environment' },
                    { fps: 10, qrbox: { width: 260, height: 260 } },
                    (text) => { if (!cancelled) handleScanSuccess(text); },
                    () => { }
                );
            } catch (e) {
                setScanError('Kamerani ochib bo\'lmadi: ' + (e?.message || e));
            }
        })();
        return () => { cancelled = true; stopScanner(); };
    }, [scannerOpen, handleScanSuccess, stopScanner]);

    useEffect(() => {
        if (checkinResult?.step !== 'success' || !checkinResult?.appointment?.id) return;
        const tick = async () => {
            try {
                const res = await api.get(`/user/appointments/${checkinResult.appointment.id}`);
                const a = res.data?.data;
                if (a && (a.status === 'COMPLETED' || a.paymentStatus === 'PAID')) {
                    setCheckinResult(prev => ({ ...prev, step: 'paid', appointment: { ...prev.appointment, ...a } }));
                    setShowConfetti(true);
                    qc.invalidateQueries({ queryKey: ['user', 'appointments'] });
                }
            } catch { }
        };
        pollRef.current = setInterval(tick, 5000);
        return () => { if (pollRef.current) clearInterval(pollRef.current); };
    }, [checkinResult?.step, checkinResult?.appointment?.id, qc]);

    const dismissCheckin = () => setCheckinResult(null);

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
        else if (statusFilter === 'action') list = list.filter(a => needsCheckIn(a) || awaitingCashier(a));
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
        const needAction = appointments.filter(a => needsCheckIn(a) || awaitingCashier(a)).length;
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

    const openScanner = useCallback((e) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        setScanError('');
        setScannerOpen(true);
    }, []);

    return (
        <div className="home-page">
            <TopBar />
            <Navigation />
            <main className="home-container ua-main">
                {/* ─── Inline Check-in Result ─── */}
                {checkinResult && checkinResult.step === 'loading' && (
                    <div className="ua-checkin-result ua-checkin-result--loading">
                        <Loader2 size={28} className="ua-spin" />
                        <span>Tasdiqlanmoqda...</span>
                    </div>
                )}
                {checkinResult && checkinResult.step === 'error' && (
                    <div className="ua-checkin-result ua-checkin-result--error">
                        <AlertCircle size={22} />
                        <div>
                            <strong>Xatolik</strong>
                            <p>{checkinResult.msg}</p>
                        </div>
                        <button onClick={dismissCheckin}><X size={16} /></button>
                    </div>
                )}
                {checkinResult && checkinResult.step === 'success' && checkinResult.appointment && (
                    <div className="ua-checkin-result ua-checkin-result--success">
                        <button className="ua-checkin-dismiss" onClick={dismissCheckin}><X size={16} /></button>
                        <div className="ua-checkin-success-icon">&#10003;</div>
                        <h3>Kelishingiz tasdiqlandi!</h3>
                        <p className="ua-checkin-sub">Klinika to'lovingizni tasdiqlashi kutilmoqda.</p>
                        <div className="ua-checkin-service-name">
                            <Stethoscope size={16} />
                            <span>{serviceNameOf(checkinResult.appointment)}</span>
                        </div>
                        <div className="ua-checkin-price">
                            <span>To'lov summasi</span>
                            <strong>{fmtSum(checkinResult.appointment.finalPrice || checkinResult.appointment.price)} so'm</strong>
                        </div>
                        <div className="ua-checkin-info">
                            <div><span>Bron</span><strong>{shortBookingNo(checkinResult.appointment.bookingNumber)}</strong></div>
                            <div><span>Klinika</span><strong>{checkinResult.appointment.clinic?.nameUz}</strong></div>
                            <div><span>To'lov</span><strong style={{ color: '#f59e0b' }}>Kutilmoqda</strong></div>
                        </div>
                        <div className="ua-checkin-polling">
                            <span className="ua-checkin-polling-dot" />
                            <span>Klinika tasdiqlashi kutilmoqda...</span>
                        </div>
                    </div>
                )}
                {checkinResult && checkinResult.step === 'paid' && checkinResult.appointment && (
                    <div className="ua-checkin-result ua-checkin-result--paid">
                        <button className="ua-checkin-dismiss" onClick={dismissCheckin}><X size={16} /></button>
                        <div className="ua-checkin-success-icon" style={{ background: '#10b981' }}>&#10003;</div>
                        <h3>To'lovingiz muvaffaqiyatli qabul qilindi!</h3>
                        <p className="ua-checkin-sub">Xizmat xonasiga o'ting — sizni shifokor kutmoqda.</p>
                        <div className="ua-checkin-service-name">
                            <Stethoscope size={16} />
                            <span>{serviceNameOf(checkinResult.appointment)}</span>
                        </div>
                        <div className="ua-checkin-price" style={{ borderColor: '#10b981' }}>
                            <span>To'langan</span>
                            <strong style={{ color: '#10b981' }}>{fmtSum(checkinResult.appointment.finalPrice || checkinResult.appointment.price)} so'm</strong>
                        </div>
                        <div className="ua-checkin-info">
                            <div><span>Bron</span><strong>{shortBookingNo(checkinResult.appointment.bookingNumber)}</strong></div>
                            <div><span>Klinika</span><strong>{checkinResult.appointment.clinic?.nameUz}</strong></div>
                            <div><span>To'lov</span><strong style={{ color: '#10b981' }}>Tasdiqlandi</strong></div>
                        </div>
                        <button className="ua-checkin-detail-btn" onClick={() => navigate(`/user/appointments/${checkinResult.appointment.id}`)}>
                            Bron tafsilotlari <ChevronRight size={14} />
                        </button>
                    </div>
                )}

                {/* ─── Page Header ─── */}
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

                {/* ─── Search + Filters ─── */}
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

                {/* ─── List ─── */}
                {isLoading ? (
                    <div className="ua-loading">
                        <div className="ua-skeleton" />
                        <div className="ua-skeleton" />
                        <div className="ua-skeleton" />
                    </div>
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
                                    <AppointmentCard key={a.id} a={a} onCheckIn={openScanner} groupType="today" />
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
                                    <AppointmentCard key={a.id} a={a} onCheckIn={openScanner} groupType="tomorrow" />
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
                                    <AppointmentCard key={a.id} a={a} onCheckIn={openScanner} groupType="upcoming" />
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
                                    <AppointmentCard key={a.id} a={a} onCheckIn={openScanner} groupType="past" />
                                ))}
                            </>
                        )}
                    </div>
                )}

                {/* ─── Pagination ─── */}
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

            {/* ─── QR Scanner Modal ─── */}
            {scannerOpen && (
                <div className="ua-scan-overlay" onClick={closeScanner}>
                    <div className="ua-scan-modal" onClick={e => e.stopPropagation()}>
                        <div className="ua-scan-header">
                            <h3><Camera size={18} /> Check-in</h3>
                            <button onClick={closeScanner}><X size={20} /></button>
                        </div>
                        <div id="ua-qr-reader" className="ua-qr-reader" />
                        {scanError && <p className="ua-scan-error">{scanError}</p>}
                        <p className="ua-scan-hint">Klinikadagi QR kodga kamerani yo'naltiring</p>
                    </div>
                </div>
            )}

            {/* ─── Confetti Celebration ─── */}
            {showConfetti && <Confetti duration={3000} onComplete={() => setShowConfetti(false)} />}

            {/* ─── Bottom Sheet Filter (Mobile) ─── */}
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
    const [swipeOffset, setSwipeOffset] = useState(0);
    const [isSwiping, setIsSwiping] = useState(false);
    const touchStartX = useRef(0);
    const touchStartY = useRef(0);

    const badge = statusLabel(a.status);
    const dateRaw = a.scheduledAt ? new Date(a.scheduledAt) : null;
    const pay = paymentBadge(a);
    const needs = needsCheckIn(a);
    const awaits = awaitingCashier(a);
    const ready = isReadyForService(a);

    const getTimeContext = () => {
        if (!dateRaw || !needs) return null;
        const now = new Date();
        const diff = dateRaw - now;
        const hours = diff / (1000 * 60 * 60);

        if (hours < 0) {
            return { type: 'late', msg: 'Kechikdingiz — klinikaga qo\'ng\'iroq qiling', showPhone: true };
        } else if (hours < 1) {
            return { type: 'urgent', msg: 'Check-in vaqti!', pulse: true };
        } else if (hours < 2) {
            return { type: 'soon', msg: `${Math.floor(hours * 60)} daqiqadan keyin check-in qiling` };
        }
        return null;
    };

    const timeContext = getTimeContext();

    const handleCardClick = (e) => {
        if (isSwiping) return;
        if (e.target.closest('.ua-card-action') || e.target.closest('.ua-card-action button')) {
            return;
        }
        navigate(`/user/appointments/${a.id}`);
    };

    const handleTouchStart = (e) => {
        touchStartX.current = e.touches[0].clientX;
        touchStartY.current = e.touches[0].clientY;
    };

    const handleTouchMove = (e) => {
        if (!touchStartX.current) return;
        const deltaX = e.touches[0].clientX - touchStartX.current;
        const deltaY = e.touches[0].clientY - touchStartY.current;

        if (Math.abs(deltaY) > Math.abs(deltaX)) {
            return;
        }

        e.preventDefault();
        setIsSwiping(true);

        if (needs && deltaX > 0 && deltaX < 120) {
            setSwipeOffset(deltaX);
        } else if (deltaX < 0 && deltaX > -120) {
            setSwipeOffset(deltaX);
        }
    };

    const handleTouchEnd = () => {
        if (swipeOffset > 80 && needs) {
            onCheckIn();
        }
        setSwipeOffset(0);
        touchStartX.current = 0;
        touchStartY.current = 0;
        setTimeout(() => setIsSwiping(false), 100);
    };

    return (
        <div
            onClick={handleCardClick}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className={`ua-card ua-card--${groupType} ${needs || awaits ? 'ua-card--urgent' : ''} ${timeContext?.pulse ? 'ua-card--pulse' : ''} ${isSwiping ? 'ua-card--swiping' : ''}`}
            style={{ transform: `translateX(${swipeOffset}px)` }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleCardClick(e); }}
        >
            {swipeOffset > 40 && needs && (
                <div className="ua-swipe-action ua-swipe-action--checkin" style={{ opacity: Math.min(swipeOffset / 80, 1) }}>
                    <Camera size={20} />
                    <span>Check-in</span>
                </div>
            )}
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
                {timeContext && (
                    <div className={`ua-card-action ua-card-action--${timeContext.type}`}>
                        <div className="ua-card-action-body">
                            {timeContext.type === 'urgent' && <Camera size={13} className="ua-pulse-icon" />}
                            {timeContext.type === 'late' && <AlertCircle size={13} />}
                            {timeContext.type === 'soon' && <Clock size={13} />}
                            <span>{timeContext.msg}</span>
                        </div>
                        {timeContext.showPhone && a.clinic?.phone && (
                            <a href={`tel:${a.clinic.phone}`} className="ua-action-phone-btn" onClick={(e) => e.stopPropagation()}>
                                Qo'ng'iroq
                            </a>
                        )}
                        {timeContext.type === 'urgent' && (
                            <button onClick={(e) => { e.stopPropagation(); onCheckIn(e); }} className="ua-action-checkin-pulse">
                                Check-in
                            </button>
                        )}
                    </div>
                )}
                {!timeContext && needs && (
                    <div className="ua-card-action ua-card-action--warn">
                        <div className="ua-card-action-body">
                            <Camera size={13} />
                            <span>Klinikaga boring va check-in qiling</span>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); onCheckIn(e); }}>Check-in</button>
                    </div>
                )}
                {awaits && (
                    <div className="ua-card-action ua-card-action--info">
                        <Loader2 size={13} className="ua-spin" />
                        <span>Kassir tasdiqlashini kuting</span>
                    </div>
                )}
                {ready && a.status !== 'COMPLETED' && (
                    <div className="ua-card-action ua-card-action--ok">
                        <CheckCircle2 size={13} />
                        <span>To'langan — xizmat xonasiga o'ting</span>
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

function playSuccessChime() {
    try {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        const ctx = new AC();
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(1320, now + 0.18);
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.25, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
        osc.connect(gain).connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.4);
    } catch { }
}
