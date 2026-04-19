import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
    Phone, CheckCircle2, XCircle, Search, Calendar, User, Building2,
    Tag, Eye, RefreshCw, AlertCircle, Loader2
} from 'lucide-react';
import api from '../../shared/api/axios';
import OperatorCallModal from './OperatorCallModal';
import AppointmentDetailModal from './AppointmentDetailModal';
import './AppointmentsPage.css';

const STATUS_FILTERS = [
    { value: 'ALL', label: 'Barchasi' },
    { value: 'PENDING', label: 'Yangi', urgent: true },
    { value: 'OPERATOR_CONFIRMED', label: 'Tasdiqlangan' },
    { value: 'SENT_TO_CLINIC', label: 'Klinikada' },
    { value: 'CLINIC_ACCEPTED', label: 'Qabul qilingan' },
    { value: 'PAID', label: 'To\'langan' },
    { value: 'CHECKED_IN', label: 'Keldi' },
    { value: 'COMPLETED', label: 'Yakunlangan' },
    { value: 'CANCELLED', label: 'Bekor' },
    { value: 'NO_SHOW', label: 'Kelmadi' },
];

const STATUS_STYLES = {
    PENDING: { color: '#D97706', bg: '#FEF3C7', label: 'Yangi' },
    OPERATOR_CONFIRMED: { color: '#2563EB', bg: '#DBEAFE', label: 'Tasdiqlandi' },
    SENT_TO_CLINIC: { color: '#2563EB', bg: '#DBEAFE', label: 'Klinikada' },
    CLINIC_ACCEPTED: { color: '#059669', bg: '#D1FAE5', label: 'Qabul qilindi' },
    PAID: { color: '#059669', bg: '#D1FAE5', label: 'To\'landi' },
    CHECKED_IN: { color: '#7C3AED', bg: '#EDE9FE', label: 'Keldi' },
    IN_PROGRESS: { color: '#7C3AED', bg: '#EDE9FE', label: 'Jarayonda' },
    COMPLETED: { color: '#065F46', bg: '#D1FAE5', label: 'Yakunlangan' },
    CANCELLED: { color: '#991B1B', bg: '#FEE2E2', label: 'Bekor' },
    NO_SHOW: { color: '#991B1B', bg: '#FEE2E2', label: 'Kelmadi' },
    RESCHEDULED: { color: '#D97706', bg: '#FEF3C7', label: 'O\'zgartirildi' },
};

const fmt = (n) => n ? Number(n).toLocaleString('uz-UZ') : '0';

export default function AppointmentsPage() {
    const [status, setStatus] = useState('PENDING');
    const [search, setSearch] = useState('');
    const [searchInput, setSearchInput] = useState('');
    const [page, setPage] = useState(1);
    const [callModal, setCallModal] = useState(null);
    const [detailModal, setDetailModal] = useState(null);
    const qc = useQueryClient();

    const { data: stats } = useQuery({
        queryKey: ['admin', 'appointments', 'stats'],
        queryFn: async () => (await api.get('/admin/appointments/stats')).data.data,
        refetchInterval: 30_000,
    });

    const { data, isLoading, refetch } = useQuery({
        queryKey: ['admin', 'appointments', { status, search, page }],
        queryFn: async () => {
            const res = await api.get('/admin/appointments', {
                params: { status, search, page, limit: 20 },
            });
            return res.data;
        },
    });

    const items = data?.data ?? [];
    const meta = data?.meta ?? {};

    const onSearchSubmit = (e) => {
        e.preventDefault();
        setSearch(searchInput);
        setPage(1);
    };

    const afterMutation = () => {
        qc.invalidateQueries({ queryKey: ['admin', 'appointments'] });
    };

    return (
        <div className="ap-page">
            <div className="ap-header">
                <div>
                    <h1>Bronlar Boshqaruvi</h1>
                    <p>Operator tomonidan tasdiqlash va kuzatuv</p>
                </div>
                <button className="ap-refresh" onClick={() => refetch()} title="Yangilash">
                    <RefreshCw size={18} />
                </button>
            </div>

            {/* Stats */}
            {stats && (
                <div className="ap-stats">
                    <div className="ap-stat-card">
                        <div className="ap-stat-label">Bugun</div>
                        <div className="ap-stat-value">{stats.todayTotal}</div>
                    </div>
                    <div className="ap-stat-card ap-stat-urgent">
                        <div className="ap-stat-label">Tasdiqlash kerak</div>
                        <div className="ap-stat-value">{stats.pending}</div>
                    </div>
                    <div className="ap-stat-card">
                        <div className="ap-stat-label">Tasdiqlangan</div>
                        <div className="ap-stat-value">{stats.operatorConfirmed}</div>
                    </div>
                    <div className="ap-stat-card">
                        <div className="ap-stat-label">Yakunlangan</div>
                        <div className="ap-stat-value">{stats.completed}</div>
                    </div>
                </div>
            )}

            {/* Status Tabs */}
            <div className="ap-tabs">
                {STATUS_FILTERS.map(f => (
                    <button
                        key={f.value}
                        className={`ap-tab ${status === f.value ? 'active' : ''} ${f.urgent ? 'urgent' : ''}`}
                        onClick={() => { setStatus(f.value); setPage(1); }}
                    >
                        {f.label}
                    </button>
                ))}
            </div>

            {/* Search */}
            <form className="ap-search" onSubmit={onSearchSubmit}>
                <Search size={18} />
                <input
                    placeholder="Bron raqami, bemor ismi yoki telefon bo'yicha qidiruv..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                />
                {searchInput && (
                    <button type="button" onClick={() => { setSearchInput(''); setSearch(''); }}>
                        <XCircle size={16} />
                    </button>
                )}
            </form>

            {/* List */}
            {isLoading ? (
                <div className="ap-loading"><Loader2 size={28} className="spin" /> Yuklanmoqda...</div>
            ) : items.length === 0 ? (
                <div className="ap-empty">
                    <AlertCircle size={48} />
                    <h3>Bronlar topilmadi</h3>
                </div>
            ) : (
                <div className="ap-list">
                    {items.map(appt => {
                        const style = STATUS_STYLES[appt.status] ?? STATUS_STYLES.PENDING;
                        const service = appt.diagnosticService?.nameUz || appt.surgicalService?.nameUz || 'Xizmat';
                        const date = new Date(appt.scheduledAt);
                        return (
                            <div key={appt.id} className="ap-card">
                                <div className="ap-card-top">
                                    <div>
                                        <div className="ap-booking-num">{appt.bookingNumber}</div>
                                        <div className="ap-time-ago">
                                            {new Date(appt.createdAt).toLocaleString('uz-UZ')}
                                        </div>
                                    </div>
                                    <span className="ap-status" style={{ color: style.color, background: style.bg }}>
                                        {style.label}
                                    </span>
                                </div>

                                <div className="ap-card-body">
                                    <div className="ap-info-grid">
                                        <div className="ap-info">
                                            <User size={14} />
                                            <span>{appt.patient?.firstName} {appt.patient?.lastName}</span>
                                        </div>
                                        <div className="ap-info">
                                            <Phone size={14} />
                                            <span>{appt.patient?.phone}</span>
                                        </div>
                                        <div className="ap-info">
                                            <Building2 size={14} />
                                            <span>{appt.clinic?.nameUz}</span>
                                        </div>
                                        <div className="ap-info">
                                            <Calendar size={14} />
                                            <span>{date.toLocaleDateString('uz-UZ')} — {date.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                        <div className="ap-info">
                                            <Tag size={14} />
                                            <span>{service}</span>
                                        </div>
                                        <div className="ap-info ap-price">
                                            <strong>{fmt(appt.finalPrice)} so'm</strong>
                                            {appt.discountPercent > 0 && (
                                                <span className="ap-discount-badge">-{appt.discountPercent}%</span>
                                            )}
                                        </div>
                                    </div>

                                    {appt.operatorCallNote && (
                                        <div className="ap-note">
                                            <strong>Operator izohi:</strong> {appt.operatorCallNote}
                                        </div>
                                    )}
                                </div>

                                <div className="ap-card-actions">
                                    {appt.status === 'PENDING' && (
                                        <button
                                            className="ap-btn ap-btn-primary"
                                            onClick={() => setCallModal(appt)}
                                        >
                                            <Phone size={16} /> Telefon qilish
                                        </button>
                                    )}
                                    <button
                                        className="ap-btn ap-btn-secondary"
                                        onClick={() => setDetailModal(appt)}
                                    >
                                        <Eye size={16} /> Tafsilot
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Pagination */}
            {meta.totalPages > 1 && (
                <div className="ap-pagination">
                    <button disabled={page === 1} onClick={() => setPage(p => p - 1)}>Oldingi</button>
                    <span>{page} / {meta.totalPages}</span>
                    <button disabled={page >= meta.totalPages} onClick={() => setPage(p => p + 1)}>Keyingi</button>
                </div>
            )}

            {callModal && (
                <OperatorCallModal
                    appointment={callModal}
                    onClose={() => setCallModal(null)}
                    onDone={() => { setCallModal(null); afterMutation(); }}
                />
            )}
            {detailModal && (
                <AppointmentDetailModal
                    appointmentId={detailModal.id}
                    onClose={() => setDetailModal(null)}
                />
            )}
        </div>
    );
}
