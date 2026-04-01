import { useState, useEffect, useCallback } from 'react';
import {
    Bell, BellOff, CheckCheck, Clock, Calendar,
    Star, Package, AlertCircle, Info, Megaphone,
    Settings, RefreshCw, Loader2, X, Filter,
    ToggleLeft, ToggleRight, ChevronRight,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../shared/api/axios';
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
    BOOKING:       { icon: Calendar,    color: '#3b82f6', bg: 'rgba(59,130,246,0.1)',  label: 'Bron' },
    REVIEW:        { icon: Star,        color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  label: 'Sharh' },
    SYSTEM:        { icon: Info,        color: '#6366f1', bg: 'rgba(99,102,241,0.1)',  label: 'Tizim' },
    PROMOTION:     { icon: Megaphone,   color: '#10b981', bg: 'rgba(16,185,129,0.1)',  label: 'Aksiya' },
    REMINDER:      { icon: Clock,       color: '#f97316', bg: 'rgba(249,115,22,0.1)',  label: 'Eslatma' },
    SERVICE:       { icon: Package,     color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)',  label: 'Xizmat' },
    ALERT:         { icon: AlertCircle, color: '#ef4444', bg: 'rgba(239,68,68,0.1)',   label: 'Ogohlantirish' },
};

const DEFAULT_SETTINGS = {
    bookingCreated:     true,
    bookingCancelled:   true,
    bookingReminder:    true,
    newReview:          true,
    systemAlerts:       true,
    promotions:         false,
    weeklyReport:       true,
    pushEnabled:        true,
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

const useNotificationSettings = () =>
    useQuery({
        queryKey: ['clinic', 'notification-settings'],
        queryFn: async () => {
            try {
                const { data } = await api.get('/clinic/notification-settings');
                return { ...DEFAULT_SETTINGS, ...(data.data || {}) };
            } catch {
                return DEFAULT_SETTINGS;
            }
        },
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

const useSaveSettings = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (settings) => api.put('/clinic/notification-settings', settings),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['clinic', 'notification-settings'] }),
    });
};

/* ─── sub-components ─── */
function NotificationItem({ n, onMarkRead }) {
    const cfg = TYPE_CONFIG[n.type] || TYPE_CONFIG.SYSTEM;
    const Icon = cfg.icon;
    const isUnread = !n.isRead;

    return (
        <div
            onClick={() => isUnread && onMarkRead(n.id)}
            style={{
                display: 'flex', gap: 14, padding: '14px 20px',
                borderBottom: '1px solid var(--border-color)',
                background: isUnread ? 'rgba(0,189,224,0.04)' : 'transparent',
                cursor: isUnread ? 'pointer' : 'default',
                transition: 'background 0.15s',
                position: 'relative',
            }}
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
            </div>

            {n.link && (
                <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                    <ChevronRight size={16} color="var(--text-muted)" />
                </div>
            )}
        </div>
    );
}

function SettingsToggle({ label, description, checked, onChange }) {
    return (
        <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 0', borderBottom: '1px solid var(--border-color)',
        }}>
            <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-main)' }}>{label}</div>
                {description && (
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{description}</div>
                )}
            </div>
            <button
                onClick={() => onChange(!checked)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
            >
                {checked
                    ? <ToggleRight size={28} color="var(--color-primary)" />
                    : <ToggleLeft size={28} color="var(--text-muted)" />}
            </button>
        </div>
    );
}

/* ─── main page ─── */
const TABS = [
    { key: 'all',      label: 'Barchasi' },
    { key: 'unread',   label: 'O\'qilmagan' },
    { key: 'BOOKING',  label: 'Bronlar' },
    { key: 'REVIEW',   label: 'Sharhlar' },
    { key: 'SYSTEM',   label: 'Tizim' },
];

export default function ClinicNotifications() {
    const [tab, setTab] = useState('all');
    const [view, setView] = useState('history');  // 'history' | 'settings'
    const [settingsLocal, setSettingsLocal] = useState(null);
    const [settingsSaved, setSettingsSaved] = useState(false);

    const filters = {
        ...(tab === 'unread' ? { isRead: false } : {}),
        ...(tab !== 'all' && tab !== 'unread' ? { type: tab } : {}),
        limit: 50,
    };

    const { data, isLoading, refetch } = useNotifications(filters);
    const { data: settings } = useNotificationSettings();
    const markAllMut = useMarkAllRead();
    const markReadMut = useMarkRead();
    const saveSettingsMut = useSaveSettings();

    const notifications = data?.notifications || [];
    const unreadCount = data?.unreadCount ?? 0;

    useEffect(() => {
        if (settings && !settingsLocal) setSettingsLocal({ ...settings });
    }, [settings, settingsLocal]);

    const handleSaveSettings = async () => {
        await saveSettingsMut.mutateAsync(settingsLocal);
        setSettingsSaved(true);
        setTimeout(() => setSettingsSaved(false), 2500);
    };

    const setSetting = useCallback((key, val) => {
        setSettingsLocal(prev => ({ ...prev, [key]: val }));
    }, []);

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
                    {view === 'history' && unreadCount > 0 && (
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
                    <button
                        className={`ca-icon-btn${view === 'settings' ? ' active' : ''}`}
                        onClick={() => setView(v => v === 'settings' ? 'history' : 'settings')}
                        title="Sozlamalar"
                        style={view === 'settings' ? { background: 'rgba(0,189,224,0.12)', color: 'var(--color-primary)' } : {}}
                    >
                        <Settings size={16} />
                    </button>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: view === 'settings' ? '1fr 380px' : '1fr', gap: 20, marginTop: 20, alignItems: 'start' }}>

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
                        <div className="ca-loading" style={{ padding: 40 }}>
                            <Loader2 size={28} className="ca-spin" />
                            <span>Yuklanmoqda...</span>
                        </div>
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
                                    onMarkRead={(id) => markReadMut.mutate(id)}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* ── Right: settings panel ── */}
                {view === 'settings' && settingsLocal && (
                    <div className="ca-card" style={{ position: 'sticky', top: 20 }}>
                        <div style={{ marginBottom: 16 }}>
                            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>
                                Bildirishnoma sozlamalari
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                Qaysi bildirishnomalarni olishni sozlang
                            </div>
                        </div>

                        {/* Push toggle */}
                        <div style={{
                            padding: '12px 14px', borderRadius: 10, marginBottom: 16,
                            background: settingsLocal.pushEnabled
                                ? 'rgba(0,189,224,0.07)' : 'rgba(239,68,68,0.06)',
                            border: `1px solid ${settingsLocal.pushEnabled
                                ? 'rgba(0,189,224,0.2)' : 'rgba(239,68,68,0.2)'}`,
                            display: 'flex', alignItems: 'center', gap: 10,
                        }}>
                            {settingsLocal.pushEnabled
                                ? <Bell size={18} color="var(--color-primary)" />
                                : <BellOff size={18} color="#ef4444" />}
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 13, fontWeight: 600 }}>
                                    Push bildirishnomalar
                                </div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                    {settingsLocal.pushEnabled ? 'Yoqilgan' : 'O\'chirilgan'}
                                </div>
                            </div>
                            <button
                                onClick={() => setSetting('pushEnabled', !settingsLocal.pushEnabled)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                            >
                                {settingsLocal.pushEnabled
                                    ? <ToggleRight size={30} color="var(--color-primary)" />
                                    : <ToggleLeft size={30} color="var(--text-muted)" />}
                            </button>
                        </div>

                        {/* Category toggles */}
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                            Bron bildirishnomalari
                        </div>
                        <SettingsToggle
                            label="Yangi bron"
                            description="Bemor bron qilganda xabar oling"
                            checked={settingsLocal.bookingCreated}
                            onChange={v => setSetting('bookingCreated', v)}
                        />
                        <SettingsToggle
                            label="Bron bekor qilindi"
                            description="Bemor bronni bekor qilganda"
                            checked={settingsLocal.bookingCancelled}
                            onChange={v => setSetting('bookingCancelled', v)}
                        />
                        <SettingsToggle
                            label="Bron eslatmasi"
                            description="Bron vaqtidan 1 soat oldin"
                            checked={settingsLocal.bookingReminder}
                            onChange={v => setSetting('bookingReminder', v)}
                        />

                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '16px 0 8px' }}>
                            Boshqa bildirishnomalar
                        </div>
                        <SettingsToggle
                            label="Yangi sharh"
                            description="Bemor sharh qoldirganida"
                            checked={settingsLocal.newReview}
                            onChange={v => setSetting('newReview', v)}
                        />
                        <SettingsToggle
                            label="Tizim ogohlantirishlari"
                            description="Muhim tizim xabarlari"
                            checked={settingsLocal.systemAlerts}
                            onChange={v => setSetting('systemAlerts', v)}
                        />
                        <SettingsToggle
                            label="Haftalik hisobot"
                            description="Har dushanba haftalik statistika"
                            checked={settingsLocal.weeklyReport}
                            onChange={v => setSetting('weeklyReport', v)}
                        />
                        <SettingsToggle
                            label="Aksiya & yangiliklar"
                            description="Platforma yangiliklari va takliflari"
                            checked={settingsLocal.promotions}
                            onChange={v => setSetting('promotions', v)}
                        />

                        <button
                            className="ca-btn-primary"
                            style={{ width: '100%', marginTop: 20, justifyContent: 'center' }}
                            onClick={handleSaveSettings}
                            disabled={saveSettingsMut.isPending}
                        >
                            {saveSettingsMut.isPending
                                ? <><Loader2 size={14} className="ca-spin" /> Saqlanmoqda...</>
                                : settingsSaved
                                    ? <><CheckCheck size={14} /> Saqlandi!</>
                                    : 'Sozlamalarni saqlash'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
