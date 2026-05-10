import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { Bell, Check, X, Volume2, VolumeX } from 'lucide-react';
import api from '../../shared/api/axios';
import { useNotifications } from '../hooks/useNotifications';

const SOUND_KEY = 'clinic_notifs_sound';

function fmtRelative(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    const diff = Math.floor((Date.now() - d.getTime()) / 1000);
    if (diff < 60) return 'Hozirgina';
    if (diff < 3600) return `${Math.floor(diff / 60)} daqiqa oldin`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} soat oldin`;
    return d.toLocaleDateString('uz-UZ', { day: '2-digit', month: 'short' });
}

const PRIORITY_BG = {
    URGENT: '#fee2e2',
    HIGH: '#fef3c7',
    NORMAL: 'transparent',
    LOW: 'transparent',
};

export default function NotificationBell() {
    const navigate = useNavigate();
    const qc = useQueryClient();
    const [open, setOpen] = useState(false);
    const [soundOn, setSoundOn] = useState(() => localStorage.getItem(SOUND_KEY) !== '0');
    const panelRef = useRef(null);

    const { unreadCount, requestPermission } = useNotifications();

    const { data, isLoading } = useQuery({
        queryKey: ['clinic', 'notifications', 'recent'],
        queryFn: async () => {
            const { data } = await api.get('/clinic/notifications', { params: { limit: 15 } });
            return data.data || { items: [] };
        },
        enabled: open,
    });

    const markRead = useMutation({
        mutationFn: (id) => api.post(`/clinic/notifications/${id}/read`),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['clinic', 'notifications'] });
        },
    });

    const markAll = useMutation({
        mutationFn: () => api.post('/clinic/notifications/read-all'),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['clinic', 'notifications'] }),
    });

    // Close panel on outside click
    useEffect(() => {
        if (!open) return;
        const onClick = (e) => {
            if (panelRef.current && !panelRef.current.contains(e.target)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', onClick);
        return () => document.removeEventListener('mousedown', onClick);
    }, [open]);

    // Ask for browser notification permission once when bell is first clicked
    const handleOpen = async () => {
        setOpen((v) => !v);
        if (!open) await requestPermission();
    };

    const handleClick = (n) => {
        if (!n.isRead) markRead.mutate(n.id);
        if (n.link) {
            navigate(n.link);
            setOpen(false);
        }
    };

    const items = data?.items || [];

    return (
        <div ref={panelRef} style={{ position: 'relative' }}>
            <button
                className="action-btn clinic-notif-btn"
                title="Bildirishnomalar"
                onClick={handleOpen}
                style={{ position: 'relative' }}
            >
                <Bell size={20} />
                {unreadCount > 0 && (
                    <span className="badge" style={{ background: '#ef4444' }}>
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {open && (
                <div
                    style={{
                        position: 'absolute',
                        top: 'calc(100% + 8px)',
                        right: 0,
                        width: 380,
                        maxWidth: 'calc(100vw - 32px)',
                        maxHeight: 520,
                        background: 'var(--bg-card, #fff)',
                        borderRadius: 14,
                        boxShadow: '0 12px 40px rgba(0,0,0,0.15)',
                        border: '1px solid var(--border-color, #eee)',
                        zIndex: 1000,
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
                    }}
                >
                    {/* Header */}
                    <div style={{
                        padding: '14px 16px',
                        borderBottom: '1px solid var(--border-color, #eee)',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    }}>
                        <div style={{ fontWeight: 700, fontSize: 15 }}>
                            Bildirishnomalar
                            {unreadCount > 0 && (
                                <span style={{
                                    marginLeft: 8, fontSize: 11, color: '#fff',
                                    background: '#ef4444', padding: '2px 7px', borderRadius: 10, fontWeight: 700,
                                }}>{unreadCount}</span>
                            )}
                        </div>
                        <div style={{ display: 'flex', gap: 6 }}>
                            <button
                                onClick={() => {
                                    const next = !soundOn;
                                    setSoundOn(next);
                                    localStorage.setItem(SOUND_KEY, next ? '1' : '0');
                                }}
                                title={soundOn ? 'Ovoz yoqilgan' : 'Ovoz o\'chirilgan'}
                                style={{
                                    background: 'transparent', border: 'none',
                                    cursor: 'pointer', padding: 6, borderRadius: 6,
                                    color: 'var(--text-muted)',
                                }}
                            >
                                {soundOn ? <Volume2 size={16} /> : <VolumeX size={16} />}
                            </button>
                            {unreadCount > 0 && (
                                <button
                                    onClick={() => markAll.mutate()}
                                    title="Hammasini o'qildi qilish"
                                    style={{
                                        background: 'transparent', border: '1px solid var(--border-color)',
                                        cursor: 'pointer', padding: '4px 10px', borderRadius: 8,
                                        fontSize: 12, color: 'var(--text-muted)',
                                    }}
                                >
                                    <Check size={12} style={{ verticalAlign: '-2px' }} /> Hammasi
                                </button>
                            )}
                            <button
                                onClick={() => setOpen(false)}
                                style={{
                                    background: 'transparent', border: 'none',
                                    cursor: 'pointer', padding: 6, borderRadius: 6,
                                    color: 'var(--text-muted)',
                                }}
                            >
                                <X size={16} />
                            </button>
                        </div>
                    </div>

                    {/* List */}
                    <div style={{ overflowY: 'auto', flex: 1 }}>
                        {isLoading && (
                            <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                                Yuklanmoqda...
                            </div>
                        )}
                        {!isLoading && items.length === 0 && (
                            <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>
                                <div style={{ fontSize: 36, marginBottom: 8 }}>🔔</div>
                                <div style={{ fontSize: 13 }}>Hozircha bildirishnomalar yo'q</div>
                            </div>
                        )}
                        {!isLoading && items.map((n) => (
                            <div
                                key={n.id}
                                onClick={() => handleClick(n)}
                                style={{
                                    padding: '12px 16px',
                                    borderBottom: '1px solid var(--border-color, #f0f0f0)',
                                    cursor: 'pointer',
                                    background: n.isRead ? 'transparent' : (PRIORITY_BG[n.priority] || 'rgba(0,189,224,0.05)'),
                                    transition: 'background 0.15s',
                                    position: 'relative',
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.03)'}
                                onMouseLeave={(e) => e.currentTarget.style.background = n.isRead ? 'transparent' : (PRIORITY_BG[n.priority] || 'rgba(0,189,224,0.05)')}
                            >
                                {!n.isRead && (
                                    <span style={{
                                        position: 'absolute', left: 6, top: 18,
                                        width: 6, height: 6, borderRadius: '50%',
                                        background: '#3b82f6',
                                    }} />
                                )}
                                <div style={{ paddingLeft: 8 }}>
                                    <div style={{ fontWeight: n.isRead ? 500 : 700, fontSize: 13, marginBottom: 2 }}>
                                        {n.title}
                                    </div>
                                    <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 4 }}>
                                        {n.body || n.message}
                                    </div>
                                    <div style={{ fontSize: 11, color: 'var(--text-muted)', opacity: 0.7 }}>
                                        {fmtRelative(n.createdAt)}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Footer */}
                    <div style={{
                        padding: '10px 16px',
                        borderTop: '1px solid var(--border-color, #eee)',
                        textAlign: 'center',
                    }}>
                        <button
                            onClick={() => { setOpen(false); navigate('/clinic/notifications'); }}
                            style={{
                                background: 'transparent', border: 'none',
                                cursor: 'pointer', fontSize: 12, fontWeight: 600,
                                color: 'var(--color-primary, #00bde0)',
                            }}
                        >
                            Hammasini ko'rish →
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
