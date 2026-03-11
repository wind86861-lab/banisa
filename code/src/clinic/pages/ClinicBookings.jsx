import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
    Search, List, LayoutGrid, Eye, CheckCircle2,
    XCircle, RefreshCw, Loader2, Calendar, Clock,
    User, Phone, Stethoscope, X, AlertTriangle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useClinicBookings, useUpdateBookingStatus } from '../hooks/useClinicData';
import './clinic-admin.css';

const STATUS_OPTS = [
    { value: 'ALL', label: 'Barchasi' },
    { value: 'PENDING', label: 'Kutilmoqda' },
    { value: 'CONFIRMED', label: 'Tasdiqlangan' },
    { value: 'COMPLETED', label: 'Bajarilgan' },
    { value: 'CANCELLED', label: 'Bekor' },
    { value: 'NO_SHOW', label: 'Kelmadi' },
];

const STATUS_MAP = {
    PENDING: { label: 'Kutilmoqda', cls: 'pending' },
    CONFIRMED: { label: 'Tasdiqlangan', cls: 'confirmed' },
    COMPLETED: { label: 'Bajarilgan', cls: 'completed' },
    CANCELLED: { label: 'Bekor qilingan', cls: 'cancelled' },
    NO_SHOW: { label: 'Kelmadi', cls: 'inactive' },
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

function ConfirmDialog({ booking, action, onConfirm, onClose }) {
    const [reason, setReason] = useState('');
    const isCancel = action === 'cancel';
    const isDanger = isCancel;

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
                <div className="ca-dialog-title">
                    {isCancel ? 'Bronni bekor qilish?' : 'Bronni tasdiqlash?'}
                </div>
                <div className="ca-dialog-desc">
                    {booking?.patient?.firstName} {booking?.patient?.lastName} — {fmtDate(booking?.scheduledAt)}
                </div>
                {isCancel && (
                    <div className="ca-dialog-form">
                        <label className="ca-label">Bekor qilish sababi (ixtiyoriy)</label>
                        <textarea
                            className="ca-input"
                            rows={3}
                            value={reason}
                            onChange={e => setReason(e.target.value)}
                            placeholder="Sababni kiriting..."
                        />
                    </div>
                )}
                <div className="ca-dialog-actions">
                    <button className="ca-btn-secondary" onClick={onClose}>Bekor qilish</button>
                    <button
                        className={isDanger ? 'ca-btn-danger' : 'ca-btn-primary'}
                        onClick={() => onConfirm(reason)}
                    >
                        {isCancel ? 'Ha, bekor qilish' : 'Tasdiqlash'}
                    </button>
                </div>
            </div>
        </div>
    );
}

function BookingDrawer({ booking, onClose, onConfirm, onCancel }) {
    if (!booking) return null;
    const patient = booking.patient ?? {};
    const doctor = booking.doctor ?? null;

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
                                    <div className="ca-info-row-value">{patient.phone}</div>
                                </div>
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
                                <div className="ca-info-row-label">Xizmat turi</div>
                                <div className="ca-info-row-value">
                                    {SERVICE_TYPE_MAP[booking.serviceType] ?? booking.serviceType ?? '—'}
                                </div>
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

                    {booking.cancellationReason && (
                        <div className="ca-detail-section">
                            <div className="ca-detail-section-title">Bekor qilish sababi</div>
                            <p style={{ fontSize: 14, color: 'var(--color-danger)' }}>{booking.cancellationReason}</p>
                        </div>
                    )}
                </div>

                {/* Footer actions */}
                {['PENDING', 'CONFIRMED'].includes(booking.status) && (
                    <div className="ca-drawer-footer">
                        <button className="ca-btn-danger" onClick={() => onCancel(booking)}>
                            <XCircle size={15} /> Bekor qilish
                        </button>
                        {booking.status === 'PENDING' && (
                            <button className="ca-btn-primary" onClick={() => onConfirm(booking)}>
                                <CheckCircle2 size={15} /> Tasdiqlash
                            </button>
                        )}
                        {booking.status === 'CONFIRMED' && (
                            <button className="ca-btn-primary" onClick={() => onConfirm(booking, 'complete')}>
                                <CheckCircle2 size={15} /> Bajarildi
                            </button>
                        )}
                    </div>
                )}
            </motion.div>
        </>
    );
}

export default function ClinicBookings() {
    const [searchParams] = useSearchParams();
    const [viewMode, setViewMode] = useState('list');
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState(searchParams.get('status') || 'ALL');
    const [page, setPage] = useState(1);
    const [drawer, setDrawer] = useState(null);
    const [dialog, setDialog] = useState(null);

    const { data, isLoading, refetch } = useClinicBookings({ status, search, page, limit: 20 });
    const updateStatus = useUpdateBookingStatus();

    const bookings = data?.data ?? [];
    const meta = data?.meta ?? {};

    useEffect(() => { setPage(1); }, [status, search]);

    const handleConfirm = (booking, mode) => {
        setDialog({ booking, action: mode === 'complete' ? 'complete' : 'confirm' });
        setDrawer(null);
    };
    const handleCancel = (booking) => {
        setDialog({ booking, action: 'cancel' });
        setDrawer(null);
    };

    const executeAction = async (reason) => {
        if (!dialog) return;
        const newStatus =
            dialog.action === 'confirm' ? 'CONFIRMED' :
                dialog.action === 'complete' ? 'COMPLETED' :
                    'CANCELLED';
        await updateStatus.mutateAsync({
            id: dialog.booking.id,
            status: newStatus,
            cancellationReason: reason || undefined,
        });
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
                <div className="ca-loading"><Loader2 size={32} className="ca-spin" /><span>Yuklanmoqda...</span></div>
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
                                    <td>{SERVICE_TYPE_MAP[b.serviceType] ?? b.serviceType ?? '—'}</td>
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
                                            {b.status === 'PENDING' && (
                                                <button className="ca-icon-btn success" title="Tasdiqlash" onClick={() => handleConfirm(b)}>
                                                    <CheckCircle2 size={15} />
                                                </button>
                                            )}
                                            {['PENDING', 'CONFIRMED'].includes(b.status) && (
                                                <button className="ca-icon-btn danger" title="Bekor qilish" onClick={() => handleCancel(b)}>
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
                                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                    {SERVICE_TYPE_MAP[b.serviceType] ?? b.serviceType ?? '—'}
                                    {b.doctor && ` • ${b.doctor.firstName} ${b.doctor.lastName}`}
                                </span>
                            </div>
                            <div className="ca-card-actions" onClick={e => e.stopPropagation()}>
                                <button className="ca-icon-btn" title="Ko'rish" onClick={() => setDrawer(b)}><Eye size={15} /></button>
                                {b.status === 'PENDING' && (
                                    <button className="ca-icon-btn success" title="Tasdiqlash" onClick={() => handleConfirm(b)}>
                                        <CheckCircle2 size={15} />
                                    </button>
                                )}
                                {['PENDING', 'CONFIRMED'].includes(b.status) && (
                                    <button className="ca-icon-btn danger" title="Bekor" onClick={() => handleCancel(b)}>
                                        <XCircle size={15} />
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
                        onCancel={handleCancel}
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
        </div>
    );
}
