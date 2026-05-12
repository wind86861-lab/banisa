import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Html5Qrcode } from 'html5-qrcode';
import {
    Calendar, Clock, ChevronRight, ArrowRight, Search,
    Building2, CreditCard, Banknote, CheckCircle2, AlertCircle, Hourglass,
    Stethoscope, ChevronLeft, Camera, X, Loader2, MapPin, Phone
} from 'lucide-react';
import api from '../../shared/api/axios';
import { statusLabel, needsCheckIn, awaitingCashier, isReadyForService } from '../../shared/utils/appointmentStatus';
import { fmtSum, shortBookingNo, fmtDateTimeUz, mapsDirectionsUrl, fmtPhone } from '../../shared/utils/format';
import TopBar from '../../pages/home/TopBar';
import Navigation from '../../pages/home/Navigation';
import Footer from '../../pages/home/Footer';
import './css/UserAppointments.css';

const ACTIVE_STATUSES = ['PENDING', 'PENDING_ARRIVAL', 'OPERATOR_CONFIRMED', 'SENT_TO_CLINIC', 'CLINIC_ACCEPTED', 'CHECKED_IN', 'IN_PROGRESS', 'PAID'];
const PAST_STATUSES = ['COMPLETED', 'CANCELLED', 'NO_SHOW'];

const UZ_WEEKDAYS_SHORT = ['Yak', 'Du', 'Se', 'Cho', 'Pay', 'Ju', 'Sha'];

function serviceNameOf(a) {
    return a.diagnosticService?.nameUz ||
        a.surgicalService?.nameUz ||
        a.checkupPackage?.nameUz ||
        a.serviceName ||
        'Xizmat';
}

function paymentBadge(a) {
    if (a.paymentStatus === 'PAID') return { icon: <CheckCircle2 size={12} />, text: 'To\'langan', cls: 'paid' };
    if (a.paymentMethod === 'CASH') return { icon: <Banknote size={12} />, text: 'Naqd', cls: 'cash' };
    if (a.paymentMethod) return { icon: <CreditCard size={12} />, text: a.paymentMethod, cls: 'online' };
    return { icon: <Hourglass size={12} />, text: 'To\'lov kutilmoqda', cls: 'pending' };
}

export default function UserAppointments() {
    const navigate = useNavigate();
    const qc = useQueryClient();
    const [statusFilter, setStatusFilter] = useState('all');
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);

    // ─── Inline QR Check-in state ───
    const [scannerOpen, setScannerOpen] = useState(false);
    const [scanError, setScanError] = useState('');
    const [checkinResult, setCheckinResult] = useState(null); // { step, appointment, clinic, pickList }
    const html5Ref = useRef(null);
    const pollRef = useRef(null);

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
            } else if (data.kind === 'multiple') {
                setCheckinResult({ step: 'select', clinic: data.clinic, pickList: data.appointments || [], secret });
            } else if (data.kind === 'checked_in' || data.kind === 'already') {
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
            const secret = checkinResult?.secret;
            const res = await api.post(`/user/appointments/${appt.id}/patient-checkin`, { clinicSecret: secret });
            const isPaid = res.data?.data?.paymentStatus === 'PAID';
            setCheckinResult({ step: isPaid ? 'paid' : 'success', appointment: res.data?.data });
            playSuccessChime();
            qc.invalidateQueries({ queryKey: ['user', 'appointments'] });
        } catch (e) {
            setCheckinResult({ step: 'error', msg: e.response?.data?.error?.message || 'Check-in xatoligi' });
        }
    }, [qc, checkinResult]);

    // QR scanner lifecycle
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

    // Poll for cash payment confirmation
    useEffect(() => {
        if (checkinResult?.step !== 'success' || !checkinResult?.appointment?.id) return;
        const tick = async () => {
            try {
                const res = await api.get(`/user/appointments/${checkinResult.appointment.id}`);
                const a = res.data?.data;
                if (a && (a.status === 'COMPLETED' || a.paymentStatus === 'PAID')) {
                    setCheckinResult(prev => ({ ...prev, step: 'paid', appointment: { ...prev.appointment, ...a } }));
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
            // Backend filter takes single status; for "active"/"past" we filter client-side.
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

    // Client-side filter + search
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
        { value: 'action', label: '⚡ Harakat kerak', count: stats.needAction, highlight: stats.needAction > 0 },
        { value: 'active', label: 'Faol', count: stats.active },
        { value: 'past', label: 'Yakunlangan', count: appointments.filter(a => PAST_STATUSES.includes(a.status)).length },
    ];

    return (
        <div className="home-page">
            <TopBar />
            <Navigation />
            <main className="home-container ua-main">
                <div className="ua-breadcrumb">
                    <Link to="/user/dashboard">Dashboard</Link>
                    <ChevronRight size={14} />
                    <span>Bronlarim</span>
                </div>

                {/* Hero */}
                <div className="ua-hero">
                    <div className="ua-hero-text">
                        <h1>Bronlarim</h1>
                        <p>Barcha bronlaringizni bir joydan boshqaring</p>
                    </div>
                    <Link to="/xizmatlar" className="ua-hero-cta">
                        Yangi bron qilish <ArrowRight size={16} />
                    </Link>
                </div>

                {/* ─── Check-in Result (inline) ─── */}
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
                {checkinResult && checkinResult.step === 'select' && (
                    <div className="ua-checkin-result ua-checkin-result--select">
                        <div className="ua-checkin-select-header">
                            <CheckCircle2 size={20} />
                            <div>
                                <strong>Bronni tanlang</strong>
                                {checkinResult.clinic && <span>{checkinResult.clinic.nameUz}</span>}
                            </div>
                            <button onClick={dismissCheckin}><X size={16} /></button>
                        </div>
                        <div className="ua-checkin-pick-list">
                            {checkinResult.pickList.map(a => (
                                <button key={a.id} className="ua-checkin-pick-item" onClick={() => pickAppointment(a)}>
                                    <div>
                                        <strong>{serviceNameOf(a)}</strong>
                                        <span>{fmtSum(a.finalPrice || a.price)} so'm</span>
                                    </div>
                                    <ChevronRight size={16} />
                                </button>
                            ))}
                        </div>
                    </div>
                )}
                {checkinResult && checkinResult.step === 'success' && checkinResult.appointment && (
                    <div className="ua-checkin-result ua-checkin-result--success">
                        <button className="ua-checkin-dismiss" onClick={dismissCheckin}><X size={16} /></button>
                        <div className="ua-checkin-success-icon">✓</div>
                        <h3>Kelishingiz tasdiqlandi!</h3>
                        <p className="ua-checkin-sub">Klinika to'lovingizni tasdiqlashi kutilmoqda.</p>
                        <div className="ua-checkin-price">
                            <span>To'lov summasi</span>
                            <strong>{fmtSum(checkinResult.appointment.finalPrice || checkinResult.appointment.price)} so'm</strong>
                        </div>
                        <div className="ua-checkin-info">
                            <div><span>Bron</span><strong>{shortBookingNo(checkinResult.appointment.bookingNumber)}</strong></div>
                            <div><span>Klinika</span><strong>{checkinResult.appointment.clinic?.nameUz}</strong></div>
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
                        <div className="ua-checkin-success-icon" style={{ background: '#10b981' }}>✓</div>
                        <h3>To'lovingiz muvaffaqiyatli qabul qilindi!</h3>
                        <p className="ua-checkin-sub">Xizmat xonasiga o'ting — sizni shifokor kutmoqda.</p>
                        <div className="ua-checkin-price" style={{ borderColor: '#10b981' }}>
                            <span>To'langan</span>
                            <strong style={{ color: '#10b981' }}>{fmtSum(checkinResult.appointment.finalPrice || checkinResult.appointment.price)} so'm</strong>
                        </div>
                        <div className="ua-checkin-info">
                            <div><span>Bron</span><strong>{shortBookingNo(checkinResult.appointment.bookingNumber)}</strong></div>
                            <div><span>Klinika</span><strong>{checkinResult.appointment.clinic?.nameUz}</strong></div>
                        </div>
                        <button className="ua-checkin-detail-btn" onClick={() => navigate(`/user/appointments/${checkinResult.appointment.id}`)}>
                            Bron tafsilotlari <ChevronRight size={14} />
                        </button>
                    </div>
                )}

                {/* ─── Check-in Section (for PENDING_ARRIVAL bookings) ─── */}
                {!checkinResult && appointments.filter(needsCheckIn).length > 0 && (
                    <div className="ua-checkin-section">
                        <div className="ua-checkin-section-header">
                            <div>
                                <h2>Check-in</h2>
                                <p>Klinikaga yetib borgach, check-in tugmasini bosing</p>
                            </div>
                        </div>
                        <div className="ua-checkin-cards">
                            {appointments.filter(needsCheckIn).map(a => (
                                <div key={a.id} className="ua-checkin-card">
                                    <div className="ua-checkin-card-info">
                                        <div className="ua-checkin-card-clinic">
                                            <Building2 size={14} />
                                            {a.clinic?.nameUz || 'Klinika'}
                                        </div>
                                        <div className="ua-checkin-card-service">
                                            <Stethoscope size={14} />
                                            {serviceNameOf(a)}
                                        </div>
                                        <div className="ua-checkin-card-meta">
                                            <span><Banknote size={12} /> {fmtSum(a.finalPrice || a.price)} so'm</span>
                                            <span>{shortBookingNo(a.bookingNumber)}</span>
                                        </div>
                                    </div>
                                    <button
                                        className="ua-checkin-btn"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            setScanError('');
                                            setScannerOpen(true);
                                        }}
                                    >
                                        <Camera size={16} />
                                        Check-in
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ─── Awaiting Cashier Section ─── */}
                {!checkinResult && appointments.filter(awaitingCashier).length > 0 && (
                    <div className="ua-checkin-section ua-checkin-section--info">
                        <div className="ua-checkin-section-header">
                            <div>
                                <h2>To'lov kutilmoqda</h2>
                                <p>Klinika to'lovingizni tasdiqlashi kutilmoqda</p>
                            </div>
                        </div>
                        <div className="ua-checkin-cards">
                            {appointments.filter(awaitingCashier).map(a => (
                                <div key={a.id} className="ua-checkin-card ua-checkin-card--waiting">
                                    <div className="ua-checkin-card-info">
                                        <div className="ua-checkin-card-clinic">
                                            <Building2 size={14} />
                                            {a.clinic?.nameUz || 'Klinika'}
                                        </div>
                                        <div className="ua-checkin-card-service">
                                            <Stethoscope size={14} />
                                            {serviceNameOf(a)}
                                        </div>
                                        <div className="ua-checkin-card-meta">
                                            <span><Banknote size={12} /> {fmtSum(a.finalPrice || a.price)} so'm</span>
                                        </div>
                                    </div>
                                    <div className="ua-checkin-waiting">
                                        <Loader2 size={16} className="ua-spin" />
                                        <span>Tasdiqlanmoqda</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Stats */}
                <div className="ua-stats">
                    <div className="ua-stat ua-stat--total">
                        <div className="ua-stat-ico"><Calendar size={20} /></div>
                        <div>
                            <div className="ua-stat-val">{stats.total}</div>
                            <div className="ua-stat-lbl">Jami</div>
                        </div>
                    </div>
                    <div className="ua-stat ua-stat--action" data-hot={stats.needAction > 0}>
                        <div className="ua-stat-ico"><AlertCircle size={20} /></div>
                        <div>
                            <div className="ua-stat-val">{stats.needAction}</div>
                            <div className="ua-stat-lbl">Harakat kerak</div>
                        </div>
                    </div>
                    <div className="ua-stat ua-stat--active">
                        <div className="ua-stat-ico"><Hourglass size={20} /></div>
                        <div>
                            <div className="ua-stat-val">{stats.active}</div>
                            <div className="ua-stat-lbl">Faol</div>
                        </div>
                    </div>
                    <div className="ua-stat ua-stat--done">
                        <div className="ua-stat-ico"><CheckCircle2 size={20} /></div>
                        <div>
                            <div className="ua-stat-val">{stats.completed}</div>
                            <div className="ua-stat-lbl">Yakunlangan</div>
                        </div>
                    </div>
                </div>

                {/* Search + Filters */}
                <div className="ua-toolbar">
                    <div className="ua-search">
                        <Search size={16} />
                        <input
                            type="text"
                            placeholder="Klinika, xizmat yoki bron raqami bo'yicha qidirish..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <div className="ua-filters">
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
                </div>

                {/* List */}
                {isLoading ? (
                    <div className="ua-loading">
                        <div className="ua-skeleton" />
                        <div className="ua-skeleton" />
                        <div className="ua-skeleton" />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="ua-empty">
                        <div className="ua-empty-illust">
                            <Calendar size={56} />
                        </div>
                        <h3>{search ? 'Hech narsa topilmadi' : 'Hali bronlar yo\'q'}</h3>
                        <p>
                            {search
                                ? 'Boshqa kalit so\'z bilan qidirib ko\'ring'
                                : 'Birinchi bronni yaratish uchun xizmatlarni ko\'ring'}
                        </p>
                        {!search && (
                            <Link to="/xizmatlar" className="ua-empty-btn">
                                Xizmatlarni ko'rish <ArrowRight size={16} />
                            </Link>
                        )}
                    </div>
                ) : (
                    <div className="ua-list">
                        {filtered.map(a => {
                            const badge = statusLabel(a.status);
                            const date = new Date(a.scheduledAt);
                            const pay = paymentBadge(a);
                            const needs = needsCheckIn(a);
                            const awaits = awaitingCashier(a);
                            const ready = isReadyForService(a);
                            const actionable = needs || awaits || ready;

                            return (
                                <Link key={a.id} to={`/user/appointments/${a.id}`} className={`ua-card ${actionable ? 'ua-card--actionable' : ''}`}>
                                    {/* Date block */}
                                    <div className="ua-date">
                                        <div className="ua-date-wd">{UZ_WEEKDAYS_SHORT[date.getDay()]}</div>
                                        <div className="ua-date-day">{date.getDate()}</div>
                                        <div className="ua-date-month">{date.toLocaleDateString('uz-UZ', { month: 'short' })}</div>
                                    </div>

                                    {/* Main */}
                                    <div className="ua-main-info">
                                        <div className="ua-row-top">
                                            <h3 className="ua-clinic">
                                                <Building2 size={14} />
                                                {a.clinic?.nameUz || 'Klinika'}
                                            </h3>
                                            <span className="ua-badge" style={{ backgroundColor: badge.bg, color: badge.color }}>
                                                {badge.text}
                                            </span>
                                        </div>

                                        <div className="ua-service">
                                            <Stethoscope size={14} />
                                            {serviceNameOf(a)}
                                        </div>

                                        <div className="ua-meta-row">
                                            <span className="ua-meta-chip"><Clock size={12} /> {date.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}</span>
                                            <span className={`ua-meta-chip ua-pay--${pay.cls}`}>{pay.icon} {pay.text}</span>
                                            {a.bookingNumber && (
                                                <span className="ua-meta-chip ua-meta-bron">{shortBookingNo(a.bookingNumber)}</span>
                                            )}
                                        </div>

                                        {/* Inline action banner */}
                                        {needs && (
                                            <div className="ua-action-banner ua-action-banner--warn">
                                                <Camera size={14} />
                                                <span>Check-in qiling</span>
                                                <ChevronRight size={14} />
                                            </div>
                                        )}
                                        {awaits && (
                                            <div className="ua-action-banner ua-action-banner--info">
                                                <Loader2 size={14} className="ua-spin" />
                                                <span>To'lov tasdiqlanmoqda</span>
                                                <ChevronRight size={14} />
                                            </div>
                                        )}
                                        {ready && a.status !== 'COMPLETED' && (
                                            <div className="ua-action-banner ua-action-banner--ok">
                                                <CheckCircle2 size={14} />
                                                <span>To'langan — xizmat xonasiga o'ting</span>
                                                <ChevronRight size={14} />
                                            </div>
                                        )}
                                    </div>

                                    {/* Price */}
                                    <div className="ua-right">
                                        <div className="ua-price-amount">{fmtSum(a.finalPrice || a.price)} <span>so'm</span></div>
                                        <ChevronRight size={20} className="ua-chevron" />
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                )}

                {/* Pagination */}
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

            <Footer />
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
