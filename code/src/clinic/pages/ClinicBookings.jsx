import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
    Search, List, LayoutGrid, Eye, CheckCircle2,
    XCircle, RefreshCw, Calendar, Clock,
    User, Phone, Stethoscope, X, AlertTriangle, Wallet,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useClinicBookings, useUpdateBookingStatus, usePatientStats } from '../hooks/useClinicData';
import { useMyClinicMembership } from '../hooks/useMyClinicMembership';
import CashConfirmModal from '../components/CashConfirmModal';
import AppointmentMetadataInput from '../components/AppointmentMetadataInput';
import BanisaLoader from '../../shared/components/BanisaLoader';
import { useToast } from '../../shared/components/Toast';
import './clinic-admin.css';

const STATUS_OPTS = [
    { value: 'ALL', label: 'Barchasi' },
    { value: 'PENDING', label: 'Yangi' },
    { value: 'CONFIRMED', label: 'Qabul qilingan' },
    { value: 'CHECKED_IN', label: 'Keldi' },
    { value: 'IN_PROGRESS', label: 'Jarayonda' },
    { value: 'COMPLETED', label: 'Yakunlangan' },
    { value: 'NO_SHOW', label: 'Kelmadi' },
    { value: 'CANCELLED', label: 'Bekor' },
];

const STATUS_MAP = {
    PENDING:     { label: 'Yangi',           cls: 'pending'   },
    CONFIRMED:   { label: 'Qabul qilingan',  cls: 'confirmed' },
    CHECKED_IN:  { label: 'Keldi',           cls: 'confirmed' },
    IN_PROGRESS: { label: 'Jarayonda',       cls: 'confirmed' },
    COMPLETED:   { label: 'Yakunlangan',     cls: 'completed' },
    CANCELLED:   { label: 'Bekor qilingan',  cls: 'cancelled' },
    NO_SHOW:     { label: 'Kelmadi',         cls: 'inactive'  },
};

const SERVICE_TYPE_MAP = {
    DIAGNOSTIC: 'Diagnostika',
    SURGICAL: 'Jarrohlik',
    CHECKUP: 'Checkup',
    CONSULTATION: 'Konsultatsiya',
    OTHER: 'Boshqa',
};

const fmt = (n) => (n ?? 0).toLocaleString('uz-UZ');
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('uz-UZ', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';
const fmtTime = (d) => d ? new Date(d).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' }) : '';

function StatusBadge({ status }) {
    const s = STATUS_MAP[status] ?? { label: status, cls: 'inactive' };
    return <span className={`ca-badge ${s.cls}`}>{s.label}</span>;
}

const needsCashConfirm = (b) =>
    b?.status === 'CHECKED_IN' && b?.paymentStatus !== 'PAID';
const canStart = (b) =>
    b?.status === 'CHECKED_IN' && b?.paymentStatus === 'PAID';

function ConfirmDialog({ booking, action, onConfirm, onClose }) {
    const isDanger = action === 'no_show';
    const titles = {
        confirm: 'Bronni qabul qilasizmi?',
        start: 'Xizmatni boshlash?',
        complete: 'Xizmatni tugatish?',
        no_show: 'Bemor kelmaganini belgilash?',
    };
    const confirmLabels = {
        confirm: 'Ha, qabul qilaman',
        start: 'Boshlash',
        complete: 'Tugatish',
        no_show: 'NO_SHOW deb belgilash',
    };

    return (
        <div className="ca-dialog-overlay" onClick={onClose}>
            <div className="ca-dialog" onClick={e => e.stopPropagation()}>
                <div
                    className="ca-dialog-icon"
                    style={{
                        background: isDanger ? 'rgba(252,105,106,0.12)' : 'rgba(34,197,94,0.12)',
                        color: isDanger ? 'var(--color-danger)' : '#22c55e',
                    }}
                >
                    {isDanger ? <XCircle size={26} /> : <CheckCircle2 size={26} />}
                </div>
                <div className="ca-dialog-title">{titles[action] ?? 'Tasdiqlaysizmi?'}</div>
                <div className="ca-dialog-desc">
                    {booking?.patient?.firstName} {booking?.patient?.lastName} — {fmtDate(booking?.scheduledAt)}
                </div>
                <div className="ca-dialog-actions">
                    <button className="ca-btn-secondary" onClick={onClose}>Bekor qilish</button>
                    <button
                        className={isDanger ? 'ca-btn-danger' : 'ca-btn-primary'}
                        onClick={() => onConfirm()}
                    >
                        {confirmLabels[action] ?? 'Tasdiqlash'}
                    </button>
                </div>
            </div>
        </div>
    );
}

function BookingDrawer({ booking, onClose, onConfirm, onCancel, onCash, perms }) {
    if (!booking) return null;
    const patient = booking.patient ?? {};
    const doctor = booking.doctor ?? null;
    const { data: stats } = usePatientStats(patient.id);

    const originalPrice = Number(booking.price ?? 0);
    const finalPrice = Number(booking.finalPrice ?? booking.price ?? 0);
    const discountAmount = Math.max(0, originalPrice - finalPrice);
    const paymentMethodLabel = {
        CASH: '💵 Naqd (klinikada)',
        CARD: '💳 Karta',
        PAYME: '💳 Payme',
        CLICK: '💳 Click',
    }[booking.paymentMethod] || (booking.paymentMethod ? `💳 ${booking.paymentMethod}` : '—');
    const paymentStatusLabel = booking.paymentStatus === 'PAID'
        ? { text: "✓ To'langan", color: '#059669' }
        : booking.paymentStatus === 'REFUNDED'
            ? { text: '↩ Qaytarilgan', color: '#6b7280' }
            : { text: "○ To'lanmagan", color: '#d97706' };

    const fmtDateOnly = (d) => d ? new Date(d).toLocaleDateString('uz-UZ', { day: '2-digit', month: 'long', year: 'numeric' }) : '—';

    return (
        <>
            <motion.div
                className="ca-backdrop"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={onClose}
            />
            <motion.div
                className="ca-drawer"
                initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
                transition={{ type: 'tween', duration: 0.28 }}
            >
                <div className="ca-drawer-header">
                    <span className="ca-drawer-title">Bron tafsilotlari</span>
                    <button className="ca-drawer-close" onClick={onClose}><X size={20} /></button>
                </div>
                <div className="ca-drawer-body">
                    {/* Status */}
                    <div style={{ marginBottom: 20 }}>
                        <StatusBadge status={booking.status} />
                    </div>

                    {/* Patient */}
                    <div className="ca-detail-section">
                        <div className="ca-detail-section-title">Bemor ma&#39;lumotlari</div>
                        <div className="ca-info-row">
                            <div className="ca-info-row-icon"><User size={16} /></div>
                            <div>
                                <div className="ca-info-row-label">Ism Familiya</div>
                                <div className="ca-info-row-value">
                                    {patient.firstName} {patient.lastName}
                                </div>
                            </div>
                        </div>
                        {patient.phone && (
                            <div className="ca-info-row">
                                <div className="ca-info-row-icon"><Phone size={16} /></div>
                                <div>
                                    <div className="ca-info-row-label">Telefon</div>
                                    <div className="ca-info-row-value">
                                        <a href={`tel:${patient.phone}`} style={{ color: 'inherit', textDecoration: 'none' }}>{patient.phone}</a>
                                    </div>
                                </div>
                            </div>
                        )}
                        {stats && (
                            <div style={{
                                marginTop: 12,
                                padding: '10px 12px',
                                background: stats.isReturning ? 'rgba(16,185,129,0.08)' : 'rgba(59,130,246,0.08)',
                                border: `1px solid ${stats.isReturning ? 'rgba(16,185,129,0.25)' : 'rgba(59,130,246,0.25)'}`,
                                borderRadius: 10,
                                fontSize: 12,
                                color: 'var(--text-main)',
                            }}>
                                <div style={{ fontWeight: 700, marginBottom: 6, color: stats.isReturning ? '#059669' : '#2563eb' }}>
                                    {stats.isReturning ? '🔁 Qaytaruvchi mijoz' : '✨ Yangi mijoz'}
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                                    <div>Jami bron: <strong>{stats.totalBookings}</strong></div>
                                    <div>Bajarilgan: <strong>{stats.completed}</strong></div>
                                    {stats.cancelled > 0 && <div>Bekor: <strong>{stats.cancelled}</strong></div>}
                                    {stats.noShow > 0 && <div style={{ color: '#dc2626' }}>Kelmagan: <strong>{stats.noShow}</strong></div>}
                                </div>
                                {stats.paidTotal > 0 && (
                                    <div style={{ marginTop: 6, paddingTop: 6, borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                                        Jami sarflagan: <strong style={{ color: '#059669' }}>{fmt(stats.paidTotal)} so'm</strong>
                                    </div>
                                )}
                                {stats.lastVisitAt && (
                                    <div style={{ marginTop: 4, color: 'var(--text-muted)' }}>
                                        Oxirgi tashrif: {fmtDateOnly(stats.lastVisitAt)}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Appointment */}
                    <div className="ca-detail-section">
                        <div className="ca-detail-section-title">Bron ma&#39;lumotlari</div>
                        <div className="ca-info-row">
                            <div className="ca-info-row-icon"><Calendar size={16} /></div>
                            <div>
                                <div className="ca-info-row-label">Sana</div>
                                <div className="ca-info-row-value">{fmtDate(booking.scheduledAt)}</div>
                            </div>
                        </div>
                        <div className="ca-info-row">
                            <div className="ca-info-row-icon"><Clock size={16} /></div>
                            <div>
                                <div className="ca-info-row-label">Vaqt</div>
                                <div className="ca-info-row-value">{fmtTime(booking.scheduledAt) || '—'}</div>
                            </div>
                        </div>
                        <div className="ca-info-row">
                            <div className="ca-info-row-icon"><Stethoscope size={16} /></div>
                            <div>
                                <div className="ca-info-row-label">Xizmat</div>
                                {Array.isArray(booking.services) && booking.services.length > 0 ? (
                                    <>
                                        {booking.services.map(s => (
                                            <div key={s.id} className="ca-info-row-value" style={{ fontWeight: 600 }}>
                                                • {s.serviceName}
                                                {s.finalPrice ? (
                                                    <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: 12 }}>
                                                        {' '}— {fmt(s.finalPrice)} so'm
                                                    </span>
                                                ) : null}
                                            </div>
                                        ))}
                                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                                            {SERVICE_TYPE_MAP[booking.serviceType] ?? booking.serviceType ?? ''}
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="ca-info-row-value">
                                            {booking.diagnosticService?.nameUz
                                                || booking.surgicalService?.nameUz
                                                || SERVICE_TYPE_MAP[booking.serviceType]
                                                || '—'}
                                        </div>
                                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                                            {SERVICE_TYPE_MAP[booking.serviceType] ?? booking.serviceType ?? ''}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                        {doctor && (
                            <div className="ca-info-row">
                                <div className="ca-info-row-icon"><User size={16} /></div>
                                <div>
                                    <div className="ca-info-row-label">Shifokor</div>
                                    <div className="ca-info-row-value">
                                        {doctor.firstName} {doctor.lastName}
                                        {doctor.specialty && <span style={{ color: 'var(--text-muted)', fontSize: 12 }}> — {doctor.specialty}</span>}
                                    </div>
                                </div>
                            </div>
                        )}
                        {booking.notes && (
                            <div className="ca-info-row">
                                <div className="ca-info-row-icon"><AlertTriangle size={16} /></div>
                                <div>
                                    <div className="ca-info-row-label">Izoh</div>
                                    <div className="ca-info-row-value">{booking.notes}</div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Pricing + payment */}
                    <div className="ca-detail-section">
                        <div className="ca-detail-section-title">To'lov ma'lumotlari</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 14 }}>
                            {discountAmount > 0 && (
                                <>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ color: 'var(--text-muted)' }}>Asl narx</span>
                                        <span style={{ textDecoration: 'line-through', color: 'var(--text-muted)' }}>{fmt(originalPrice)} so'm</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ color: '#059669' }}>Chegirma{booking.discountPercent ? ` (${booking.discountPercent}%)` : ''}</span>
                                        <span style={{ color: '#059669' }}>−{fmt(discountAmount)} so'm</span>
                                    </div>
                                </>
                            )}
                            <div style={{
                                display: 'flex', justifyContent: 'space-between',
                                paddingTop: discountAmount > 0 ? 6 : 0,
                                borderTop: discountAmount > 0 ? '1px solid var(--border-color)' : 'none',
                            }}>
                                <span style={{ fontWeight: 700 }}>Umumiy summa</span>
                                <span style={{ fontWeight: 700, fontSize: 16, color: '#031B4E' }}>{fmt(finalPrice)} so'm</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                                <span style={{ color: 'var(--text-muted)' }}>To'lov turi</span>
                                <span>{paymentMethodLabel}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: 'var(--text-muted)' }}>To'lov holati</span>
                                <span style={{ color: paymentStatusLabel.color, fontWeight: 600 }}>{paymentStatusLabel.text}</span>
                            </div>
                            {booking.bookingNumber && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, paddingTop: 6, borderTop: '1px solid var(--border-color)' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Bron raqami</span>
                                    <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{booking.bookingNumber}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {booking.cancellationReason && (
                        <div className="ca-detail-section">
                            <div className="ca-detail-section-title">Bekor qilish sababi</div>
                            <p style={{ fontSize: 14, color: 'var(--color-danger)' }}>{booking.cancellationReason}</p>
                        </div>
                    )}

                    {/* Metadata Input */}
                    <AppointmentMetadataInput appointmentId={booking.id} />
                </div>

                {/* Footer actions (hidden entirely for DIRECTOR / no write perms) */}
                {(perms?.canAccept || perms?.canCashConfirm)
                    && ['PENDING', 'CHECKED_IN', 'IN_PROGRESS'].includes(booking.status) && (
                    <div className="ca-drawer-footer">
                        {perms?.canAccept && booking.status === 'PENDING' && (
                            <button className="ca-btn-primary" onClick={() => onConfirm(booking)}>
                                <CheckCircle2 size={15} /> Qabul qilish
                            </button>
                        )}
                        {perms?.canCashConfirm && needsCashConfirm(booking) && (
                            <button
                                onClick={() => onCash && onCash(booking)}
                                style={{
                                    background: '#10b981', color: '#fff',
                                    border: 'none', padding: '10px 16px',
                                    borderRadius: 10, fontSize: 14, fontWeight: 600,
                                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                                }}
                            >
                                <Wallet size={15} /> Naqdni qabul qilish
                            </button>
                        )}
                        {perms?.canActOnLifecycle && canStart(booking) && (
                            <button className="ca-btn-primary" onClick={() => onConfirm(booking, 'start')}>
                                <CheckCircle2 size={15} /> Xizmatni boshlash
                            </button>
                        )}
                        {perms?.canActOnLifecycle && booking.status === 'IN_PROGRESS' && (
                            <button className="ca-btn-primary" onClick={() => onConfirm(booking, 'complete')}>
                                <CheckCircle2 size={15} /> Xizmatni tugatish
                            </button>
                        )}
                    </div>
                )}
            </motion.div>
        </>
    );
}

export default function ClinicBookings() {
    const { can } = useMyClinicMembership();
    const canAccept = can('BOOKING_ACCEPT');
    const canCashConfirm = can('PAYMENT_CONFIRM_CASH');
    // Lifecycle actions (start / complete / no-show) ride alongside accept —
    // DIRECTOR shouldn't toggle them either.
    const canActOnLifecycle = canAccept;

    const [searchParams, setSearchParams] = useSearchParams();
    const [viewMode, setViewMode] = useState('list');
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState(searchParams.get('status') || 'ALL');
    const [page, setPage] = useState(1);
    const [drawer, setDrawer] = useState(null);
    const [dialog, setDialog] = useState(null);
    const [cashBooking, setCashBooking] = useState(null);
    const toast = useToast();

    const { data, isLoading, refetch } = useClinicBookings({ status, search, page, limit: 20 });
    const updateStatus = useUpdateBookingStatus();

    const bookings = data?.data ?? [];
    const meta = data?.meta ?? {};

    useEffect(() => { setPage(1); }, [status, search]);

    // Auto-open drawer when /clinic/bookings?focus=<id> — e.g. clicked from notification.
    const focusId = searchParams.get('focus');
    useEffect(() => {
        if (!focusId || drawer?.id === focusId) return;
        const hit = bookings.find((b) => b.id === focusId);
        if (hit) {
            setDrawer(hit);
            const next = new URLSearchParams(searchParams);
            next.delete('focus');
            setSearchParams(next, { replace: true });
        }
        // If not in current page, broaden filter so it can be found.
        else if (status !== 'ALL') {
            setStatus('ALL');
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [focusId, bookings]);

    const handleConfirm = (booking, mode) => {
        const action = mode === 'complete' ? 'complete'
            : mode === 'start' ? 'start'
                : 'confirm';
        setDialog({ booking, action });
        setDrawer(null);
    };

    const executeAction = async () => {
        if (!dialog) return;
        // Clinic can only: accept (PENDING → CONFIRMED),
        // start (CHECKED_IN → IN_PROGRESS), complete (→ COMPLETED), or no-show.
        // Clinic CANNOT reject bookings — only operator/patient can cancel.
        const newStatus =
            dialog.action === 'confirm' ? 'CONFIRMED' :
                dialog.action === 'start' ? 'IN_PROGRESS' :
                    dialog.action === 'complete' ? 'COMPLETED' :
                        dialog.action === 'no_show' ? 'NO_SHOW' :
                            null;
        if (!newStatus) { setDialog(null); return; }
        try {
            await updateStatus.mutateAsync({
                id: dialog.booking.id,
                status: newStatus,
            });
        } catch (e) {
            const msg = e.response?.data?.error?.message
                || e.response?.data?.message
                || e.message || 'Xatolik';
            toast.error(msg);
            // The most common 400 here is "booking is no longer in that
            // status" — another admin (or a bot tap) already acted on it.
            // Pull a fresh list so the stale row disappears.
            refetch();
        }
        setDialog(null);
    };

    return (
        <div>
            <div className="ca-header">
                <div>
                    <h1 className="ca-title">Bronlar</h1>
                    <p className="ca-subtitle">Bemor bronlarini boshqarish</p>
                </div>
                <button className="ca-btn-secondary" onClick={() => refetch()}>
                    <RefreshCw size={15} /> Yangilash
                </button>
            </div>

            {/* Toolbar */}
            <div className="ca-toolbar">
                <div className="ca-search">
                    <Search size={16} className="ca-search-icon" />
                    <input
                        type="text"
                        placeholder="Bemor ismi yoki telefoni..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
                <select className="ca-select" value={status} onChange={e => setStatus(e.target.value)}>
                    {STATUS_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <div className="ca-view-toggle">
                    <button className={viewMode === 'list' ? 'active' : ''} onClick={() => setViewMode('list')} title="Jadval">
                        <List size={18} />
                    </button>
                    <button className={viewMode === 'grid' ? 'active' : ''} onClick={() => setViewMode('grid')} title="Kartalar">
                        <LayoutGrid size={18} />
                    </button>
                </div>
            </div>

            {isLoading ? (
                <BanisaLoader message="Bronlar yuklanmoqda..." />
            ) : bookings.length === 0 ? (
                <div className="ca-empty">
                    <div className="ca-empty-icon"><Calendar size={36} /></div>
                    <h3>Bronlar topilmadi</h3>
                    <p>Hozircha bronlar yo&#39;q yoki filtr bo&#39;yicha mos kelmadi.</p>
                </div>
            ) : viewMode === 'list' ? (
                <div className="ca-table-wrap">
                    <table className="ca-table">
                        <thead>
                            <tr>
                                <th>Bemor</th>
                                <th>Sana / Vaqt</th>
                                <th>Xizmat</th>
                                <th>Shifokor</th>
                                <th>Status</th>
                                <th>Amallar</th>
                            </tr>
                        </thead>
                        <tbody>
                            {bookings.map(b => (
                                <tr key={b.id} onClick={() => setDrawer(b)}>
                                    <td>
                                        <div className="ca-user-cell">
                                            <div className="ca-avatar">
                                                {(b.patient?.firstName?.[0] ?? 'B').toUpperCase()}
                                            </div>
                                            <div className="ca-name-cell">
                                                <span className="main">{b.patient?.firstName} {b.patient?.lastName}</span>
                                                <span className="sub">{b.patient?.phone}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <div className="ca-name-cell">
                                            <span className="main">{fmtDate(b.scheduledAt)}</span>
                                            <span className="sub">{fmtTime(b.scheduledAt)}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <div className="ca-name-cell">
                                            <span className="main">
                                                {b.diagnosticService?.nameUz
                                                    || b.surgicalService?.nameUz
                                                    || SERVICE_TYPE_MAP[b.serviceType]
                                                    || '—'}
                                            </span>
                                            <span className="sub">
                                                {SERVICE_TYPE_MAP[b.serviceType] ?? b.serviceType ?? ''}
                                            </span>
                                        </div>
                                    </td>
                                    <td>
                                        {b.doctor
                                            ? `${b.doctor.firstName} ${b.doctor.lastName}`
                                            : <span style={{ color: 'var(--text-muted)' }}>—</span>
                                        }
                                    </td>
                                    <td><StatusBadge status={b.status} /></td>
                                    <td onClick={e => e.stopPropagation()}>
                                        <div className="ca-actions-cell">
                                            <button className="ca-icon-btn" title="Ko'rish" onClick={() => setDrawer(b)}>
                                                <Eye size={15} />
                                            </button>
                                            {canAccept && b.status === 'PENDING' && (
                                                <button className="ca-icon-btn success" title="Qabul qilish" onClick={() => handleConfirm(b)}>
                                                    <CheckCircle2 size={15} />
                                                </button>
                                            )}
                                            {canCashConfirm && needsCashConfirm(b) && (
                                                <button
                                                    className="ca-icon-btn"
                                                    style={{ background: '#10b981', color: '#fff' }}
                                                    title="Naqdni qabul qilish"
                                                    onClick={() => setCashBooking(b)}
                                                >
                                                    <Wallet size={15} />
                                                </button>
                                            )}
                                            {canActOnLifecycle && canStart(b) && (
                                                <button className="ca-icon-btn success" title="Boshlash" onClick={() => setDialog({ booking: b, action: 'start' })}>
                                                    <CheckCircle2 size={15} />
                                                </button>
                                            )}
                                            {canActOnLifecycle && b.status === 'IN_PROGRESS' && (
                                                <button className="ca-icon-btn success" title="Tugatish" onClick={() => setDialog({ booking: b, action: 'complete' })}>
                                                    <CheckCircle2 size={15} />
                                                </button>
                                            )}
                                            {canActOnLifecycle && ['CONFIRMED', 'CHECKED_IN'].includes(b.status) && (
                                                <button className="ca-icon-btn danger" title="Kelmadi" onClick={() => setDialog({ booking: b, action: 'no_show' })}>
                                                    <XCircle size={15} />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {meta.totalPages > 1 && (
                        <div className="ca-pagination">
                            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Oldingi</button>
                            <span className="ca-pagination-info">{page} / {meta.totalPages}</span>
                            <button disabled={page >= meta.totalPages} onClick={() => setPage(p => p + 1)}>Keyingi →</button>
                        </div>
                    )}
                </div>
            ) : (
                <div className="ca-cards-grid">
                    {bookings.map(b => (
                        <div key={b.id} className="ca-card" onClick={() => setDrawer(b)}>
                            <div className="ca-card-header">
                                <div className="ca-user-cell">
                                    <div className="ca-avatar">{(b.patient?.firstName?.[0] ?? 'B').toUpperCase()}</div>
                                    <div className="ca-name-cell">
                                        <span className="main">{b.patient?.firstName} {b.patient?.lastName}</span>
                                        <span className="sub">{b.patient?.phone}</span>
                                    </div>
                                </div>
                                <StatusBadge status={b.status} />
                            </div>
                            <div style={{ display: 'flex', gap: 16 }}>
                                <div>
                                    <div className="ca-info-row-label">Sana</div>
                                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-main)' }}>{fmtDate(b.scheduledAt)}</div>
                                </div>
                                <div>
                                    <div className="ca-info-row-label">Vaqt</div>
                                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-main)' }}>{fmtTime(b.scheduledAt) || '—'}</div>
                                </div>
                            </div>
                            <div>
                                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-main)' }}>
                                    {b.diagnosticService?.nameUz
                                        || b.surgicalService?.nameUz
                                        || SERVICE_TYPE_MAP[b.serviceType]
                                        || '—'}
                                </span>
                                <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 6 }}>
                                    {SERVICE_TYPE_MAP[b.serviceType] ?? b.serviceType ?? ''}
                                    {b.doctor && ` • ${b.doctor.firstName} ${b.doctor.lastName}`}
                                </span>
                            </div>
                            <div className="ca-card-actions" onClick={e => e.stopPropagation()}>
                                <button className="ca-icon-btn" title="Ko'rish" onClick={() => setDrawer(b)}><Eye size={15} /></button>
                                {canAccept && b.status === 'PENDING' && (
                                    <button className="ca-icon-btn success" title="Qabul qilish" onClick={() => handleConfirm(b)}>
                                        <CheckCircle2 size={15} />
                                    </button>
                                )}
                                {canCashConfirm && needsCashConfirm(b) && (
                                    <button className="ca-icon-btn" style={{ background: '#10b981', color: '#fff' }} title="Naqdni qabul qilish" onClick={() => setCashBooking(b)}>
                                        <Wallet size={15} />
                                    </button>
                                )}
                                {canActOnLifecycle && canStart(b) && (
                                    <button className="ca-icon-btn success" title="Boshlash" onClick={() => setDialog({ booking: b, action: 'start' })}>
                                        <CheckCircle2 size={15} />
                                    </button>
                                )}
                                {canActOnLifecycle && b.status === 'IN_PROGRESS' && (
                                    <button className="ca-icon-btn success" title="Tugatish" onClick={() => setDialog({ booking: b, action: 'complete' })}>
                                        <CheckCircle2 size={15} />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Drawer */}
            <AnimatePresence>
                {drawer && (
                    <BookingDrawer
                        booking={drawer}
                        onClose={() => setDrawer(null)}
                        onConfirm={handleConfirm}
                        onCash={(b) => { setCashBooking(b); setDrawer(null); }}
                        perms={{ canAccept, canCashConfirm, canActOnLifecycle }}
                    />
                )}
            </AnimatePresence>

            {/* Confirm dialog */}
            {dialog && (
                <ConfirmDialog
                    booking={dialog.booking}
                    action={dialog.action}
                    onConfirm={executeAction}
                    onClose={() => setDialog(null)}
                />
            )}

            {/* Cash confirmation */}
            {cashBooking && (
                <CashConfirmModal
                    booking={cashBooking}
                    onClose={() => setCashBooking(null)}
                    onSuccess={() => refetch()}
                />
            )}
        </div>
    );
}
