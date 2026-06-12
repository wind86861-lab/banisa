import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Bell, BellOff, CheckCheck, Clock, Calendar,
    Star, Package, AlertCircle, Info, Megaphone,
    RefreshCw, ChevronRight,
    UserCheck, Wallet, Banknote, Loader2,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../shared/api/axios';
import CashConfirmModal from '../components/CashConfirmModal';
import BanisaLoader from '../../shared/components/BanisaLoader';
import './clinic-admin.css';

/* ─── helpers ─── */
const timeAgo = (dateStr) => {
    if (!dateStr) return '';
    const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
    if (diff < 60) return 'Hozirgina';
    if (diff < 3600) return `${Math.floor(diff / 60)} daqiqa oldin`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} soat oldin`;
    if (diff < 604800) return `${Math.floor(diff / 86400)} kun oldin`;
    return new Date(dateStr).toLocaleDateString('uz-UZ');
};

/* ─── notification type config ─── */
const TYPE_CONFIG = {
    BOOKING: { icon: Calendar, color: '#3b82f6', bg: 'rgba(59,130,246,0.1)', label: 'Bron' },
    CHECK_IN: { icon: UserCheck, color: '#10b981', bg: 'rgba(16,185,129,0.12)', label: 'Bemor keldi' },
    NEW_BOOKING: { icon: Calendar, color: '#3b82f6', bg: 'rgba(59,130,246,0.1)', label: 'Yangi bron' },
    PAYMENT_RECEIVED: { icon: Wallet, color: '#10b981', bg: 'rgba(16,185,129,0.1)', label: 'To\'lov' },
    REVIEW: { icon: Star, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', label: 'Sharh' },
    SYSTEM: { icon: Info, color: '#6366f1', bg: 'rgba(99,102,241,0.1)', label: 'Tizim' },
    PROMOTION: { icon: Megaphone, color: '#10b981', bg: 'rgba(16,185,129,0.1)', label: 'Aksiya' },
    REMINDER: { icon: Clock, color: '#f97316', bg: 'rgba(249,115,22,0.1)', label: 'Eslatma' },
    SERVICE: { icon: Package, color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)', label: 'Xizmat' },
    ALERT: { icon: AlertCircle, color: '#ef4444', bg: 'rgba(239,68,68,0.1)', label: 'Ogohlantirish' },
    GENERAL: { icon: Info, color: '#6366f1', bg: 'rgba(99,102,241,0.1)', label: 'Xabar' },
};

/* ─── hooks ─── */
const useNotifications = (filters) =>
    useQuery({
        queryKey: ['clinic', 'notifications', filters],
        queryFn: async () => {
            const { data } = await api.get('/clinic/notifications', { params: filters });
            return data.data || { notifications: [], unreadCount: 0, total: 0 };
        },
        refetchInterval: 30_000,
    });

const useMarkAllRead = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: () => api.post('/clinic/notifications/mark-all-read'),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['clinic', 'notifications'] }),
    });
};

const useMarkRead = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id) => api.patch(`/clinic/notifications/${id}/read`),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['clinic', 'notifications'] }),
    });
};

/* ─── sub-components ─── */
function NotificationItem({ n, onClick, onCashConfirm }) {
    const cfg = TYPE_CONFIG[n.type] || TYPE_CONFIG.SYSTEM;
    const Icon = cfg.icon;
    const isUnread = !n.isRead;

    const isCashCheckIn = n.type === 'CHECK_IN' && n.data?.paymentMethod === 'CASH' && n.data?.paymentStatus !== 'PAID';
    const isOnlineCheckIn = n.type === 'CHECK_IN' && n.data?.paymentStatus === 'PAID';

    return (
        <div
            onClick={() => onClick(n)}
            style={{
                display: 'flex', gap: 14, padding: '14px 20px',
                borderBottom: '1px solid var(--border-color)',
                background: isUnread ? 'rgba(0,189,224,0.04)' : 'transparent',
                cursor: 'pointer',
                transition: 'background 0.15s',
                position: 'relative',
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.04)'}
            onMouseLeave={(e) => e.currentTarget.style.background = isUnread ? 'rgba(0,189,224,0.04)' : 'transparent'}
        >
            {/* Unread dot */}
            {isUnread && (
                <div style={{
                    position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)',
                    width: 6, height: 6, borderRadius: '50%', background: 'var(--color-primary)',
                }} />
            )}

            {/* Icon */}
            <div style={{
                flexShrink: 0, width: 40, height: 40, borderRadius: 10,
                background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
                <Icon size={18} color={cfg.color} />
            </div>

            {/* Content */}
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                    fontSize: 13, fontWeight: isUnread ? 600 : 500,
                    color: 'var(--text-main)', lineHeight: 1.4,
                    marginBottom: 3,
                }}>
                    {n.title}
                </div>
                {n.message && (
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                        {n.message}
                    </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 5 }}>
                    <span style={{
                        fontSize: 10, fontWeight: 500, padding: '2px 7px', borderRadius: 20,
                        background: cfg.bg, color: cfg.color,
                    }}>
                        {cfg.label}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {timeAgo(n.createdAt)}
                    </span>
                </div>

                {/* Inline action buttons for CHECK_IN */}
                {isCashCheckIn && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onCashConfirm(n); }}
                        style={{
                            marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 6,
                            padding: '7px 14px', background: '#10b981', color: '#fff',
                            border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600,
                            cursor: 'pointer',
                        }}
                    >
                        <Banknote size={14} /> Naqdni tasdiqlash
                    </button>
                )}
                {isOnlineCheckIn && (
                    <div style={{
                        marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 6,
                        padding: '5px 12px', background: 'rgba(16,185,129,0.1)', color: '#059669',
                        borderRadius: 8, fontSize: 11, fontWeight: 600,
                    }}>
                        <CheckCheck size={13} /> Online to'langan — bemorni qabul qiling
                    </div>
                )}
            </div>

            {n.link && (
                <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                    <ChevronRight size={16} color="var(--text-muted)" />
                </div>
            )}
        </div>
    );
}


/* ─── main page ─── */
const TABS = [
    { key: 'all', label: 'Barchasi' },
    { key: 'unread', label: 'O\'qilmagan' },
    { key: 'BOOKING', label: 'Bronlar' },
    { key: 'REVIEW', label: 'Sharhlar' },
    { key: 'SYSTEM', label: 'Tizim' },
];

export default function ClinicNotifications() {
    const navigate = useNavigate();
    const [tab, setTab] = useState('all');
    const [cashConfirmBooking, setCashConfirmBooking] = useState(null);
    const [cashLoading, setCashLoading] = useState(false);

    const handleCashConfirm = async (notif) => {
        const apptId = notif.data?.appointmentId;
        if (!apptId) return;
        setCashLoading(true);
        try {
            const { data: res } = await api.get(`/clinic/appointments/${apptId}`);
            setCashConfirmBooking(res.data);
        } catch {
            alert('Bron ma\'lumotlarini yuklab bo\'lmadi');
        } finally {
            setCashLoading(false);
        }
    };

    const filters = {
        ...(tab === 'unread' ? { isRead: false } : {}),
        ...(tab !== 'all' && tab !== 'unread' ? { type: tab } : {}),
        limit: 50,
    };

    const { data, isLoading, refetch } = useNotifications(filters);
    const markAllMut = useMarkAllRead();
    const markReadMut = useMarkRead();

    const notifications = data?.notifications || [];
    const unreadCount = data?.unreadCount ?? 0;

    return (
        <div>
            {/* Header */}
            <div className="ca-header" style={{ marginBottom: 0 }}>
                <div>
                    <h1 className="ca-title">Bildirishnomalar</h1>
                    <p className="ca-subtitle">
                        {unreadCount > 0
                            ? <><strong>{unreadCount}</strong> ta o'qilmagan bildirishnoma</>
                            : 'Barcha bildirishnomalar o\'qilgan'}
                    </p>
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    {unreadCount > 0 && (
                        <button
                            className="ca-btn-secondary"
                            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}
                            onClick={() => markAllMut.mutate()}
                            disabled={markAllMut.isPending}
                        >
                            {markAllMut.isPending
                                ? <Loader2 size={14} className="ca-spin" />
                                : <CheckCheck size={14} />}
                            Hammasini o'qilgan deb belgilash
                        </button>
                    )}
                    <button
                        className="ca-icon-btn"
                        onClick={() => refetch()}
                        title="Yangilash"
                    >
                        <RefreshCw size={16} />
                    </button>
                </div>
            </div>

            <div style={{ marginTop: 20 }}>

                {/* ── Left: notification list ── */}
                <div className="ca-card" style={{ padding: 0, overflow: 'hidden' }}>
                    {/* Tab bar */}
                    <div className="ca-tabs" style={{ padding: '0 20px', borderBottom: '1px solid var(--border-color)' }}>
                        {TABS.map(t => (
                            <button
                                key={t.key}
                                className={`ca-tab${tab === t.key ? ' active' : ''}`}
                                onClick={() => setTab(t.key)}
                            >
                                {t.label}
                                {t.key === 'unread' && unreadCount > 0 && (
                                    <span style={{
                                        marginLeft: 5, background: 'var(--color-primary)',
                                        color: '#fff', borderRadius: 20, fontSize: 10,
                                        padding: '1px 6px', fontWeight: 700,
                                    }}>
                                        {unreadCount}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>

                    {/* List */}
                    {isLoading ? (
                        <BanisaLoader message="Bildirishnomalar yuklanmoqda..." />
                    ) : notifications.length === 0 ? (
                        <div className="ca-empty" style={{ padding: 60 }}>
                            <div className="ca-empty-icon">
                                <BellOff size={36} />
                            </div>
                            <h3>Bildirishnomalar yo'q</h3>
                            <p>
                                {tab === 'unread'
                                    ? 'Barcha bildirishnomalar o\'qilgan.'
                                    : 'Hozircha bildirishnomalar mavjud emas.'}
                            </p>
                        </div>
                    ) : (
                        <div>
                            {notifications.map(n => (
                                <NotificationItem
                                    key={n.id}
                                    n={n}
                                    onClick={(item) => {
                                        if (!item.isRead) markReadMut.mutate(item.id);
                                        if (item.link) navigate(item.link);
                                    }}
                                    onCashConfirm={handleCashConfirm}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Cash Confirm Modal */}
            {cashConfirmBooking && (
                <CashConfirmModal
                    booking={cashConfirmBooking}
                    onClose={() => setCashConfirmBooking(null)}
                    onSuccess={() => {
                        setCashConfirmBooking(null);
                        refetch();
                    }}
                />
            )}
            {cashLoading && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)',
                    zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                    <div style={{
                        background: '#fff', borderRadius: 16, padding: '24px 32px',
                        display: 'flex', alignItems: 'center', gap: 12,
                        boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
                    }}>
                        <Loader2 size={20} className="ca-spin" />
                        <span style={{ fontSize: 14, fontWeight: 600 }}>Bron yuklanmoqda...</span>
                    </div>
                </div>
            )}
        </div>
    );
}
