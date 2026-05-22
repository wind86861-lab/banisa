import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { Bell, Check, X } from 'lucide-react';
import api from '../../shared/api/axios';
import { useUserAuth } from '../../shared/auth/UserAuthContext';

// Poll cadence: 10s when tab visible, 60s when hidden.
const ACTIVE_INTERVAL = 10000;
const IDLE_INTERVAL = 60000;
const STORAGE_KEY = 'patient_notifs_etag';

function fmtRelative(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    const diff = Math.floor((Date.now() - d.getTime()) / 1000);
    if (diff < 60) return 'Hozirgina';
    if (diff < 3600) return `${Math.floor(diff / 60)} daqiqa oldin`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} soat oldin`;
    return d.toLocaleDateString('uz-UZ', { day: '2-digit', month: 'short' });
}

export default function UserNotificationBell() {
    const navigate = useNavigate();
    const qc = useQueryClient();
    const { user } = useUserAuth();
    const [open, setOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const panelRef = useRef(null);
    const etagRef = useRef(localStorage.getItem(STORAGE_KEY) || '');
    const lastCountRef = useRef(0);
    // Hard stop once we see auth failure — otherwise we'd spam 403s every 10s
    // for the whole session (e.g. clinic_admin viewing a public page).
    const stoppedRef = useRef(false);

    const isPatient = user?.role === 'PATIENT';

    const tick = useCallback(async () => {
        if (!navigator.onLine || stoppedRef.current || !isPatient) return;
        try {
            const res = await api.get('/user/notifications/unread-count', {
                headers: etagRef.current ? { 'If-None-Match': etagRef.current } : {},
                validateStatus: (s) => s === 200 || s === 304 || s === 401 || s === 403,
            });
            if (res.status === 401 || res.status === 403) {
                stoppedRef.current = true; // permanent stop until reload
                return;
            }
            if (res.status === 304) return;
            const newEtag = res.headers?.etag || res.headers?.ETag;
            if (newEtag) {
                etagRef.current = newEtag;
                localStorage.setItem(STORAGE_KEY, newEtag);
            }
            const count = Number(res.data?.data?.count || 0);
            setUnreadCount(count);
            if (count > lastCountRef.current && lastCountRef.current >= 0) {
                qc.invalidateQueries({ queryKey: ['user', 'notifications'] });
            }
            lastCountRef.current = count;
        } catch {
            /* silent */
        }
    }, [qc, isPatient]);

    useEffect(() => {
        if (!isPatient) return; // skip the polling loop entirely for non-patients
        let timer = null;
        let stopped = false;
        const loop = () => {
            if (stopped || stoppedRef.current) return;
            tick();
            timer = setTimeout(loop, document.hidden ? IDLE_INTERVAL : ACTIVE_INTERVAL);
        };
        loop();
        const onVis = () => { if (timer) clearTimeout(timer); loop(); };
        document.addEventListener('visibilitychange', onVis);
        return () => { stopped = true; if (timer) clearTimeout(timer); document.removeEventListener('visibilitychange', onVis); };
    }, [tick, isPatient]);

    // Render nothing for non-patients — defence in depth on top of Navigation's gate.
    if (!isPatient) return null;

    const { data, isLoading } = useQuery({
        queryKey: ['user', 'notifications', 'recent'],
        queryFn: async () => {
            const r = await api.get('/user/notifications', { params: { limit: 15 } });
            return r.data?.data || { items: [] };
        },
        enabled: open,
    });

    const markRead = useMutation({
        mutationFn: (id) => api.post(`/user/notifications/${id}/read`),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['user', 'notifications'] }),
    });
    const markAll = useMutation({
        mutationFn: () => api.post('/user/notifications/read-all'),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['user', 'notifications'] }); setUnreadCount(0); },
    });

    useEffect(() => {
        if (!open) return;
        const onClick = (e) => { if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', onClick);
        return () => document.removeEventListener('mousedown', onClick);
    }, [open]);

    const handleClick = (n) => {
        if (!n.isRead) markRead.mutate(n.id);
        if (n.link) { navigate(n.link); setOpen(false); }
    };

    const items = data?.items || [];

    return (
        <div ref={panelRef} style={{ position: 'relative' }}>
            <button
                className="cm-nav-bell"
                aria-label="Bildirishnomalar"
                onClick={() => setOpen(v => !v)}
                style={{ position: 'relative' }}
            >
                <Bell size={20} />
                {unreadCount > 0 && (
                    <span style={{
                        position: 'absolute', top: -4, right: -4,
                        background: '#ef4444', color: '#fff',
                        fontSize: 10, fontWeight: 700,
                        minWidth: 18, height: 18, padding: '0 5px',
                        borderRadius: 999, display: 'flex',
                        alignItems: 'center', justifyContent: 'center',
                    }}>{unreadCount > 99 ? '99+' : unreadCount}</span>
                )}
            </button>

            {open && (
                <div style={{
                    position: 'absolute', top: 'calc(100% + 8px)', right: 0,
                    width: 380, maxWidth: 'calc(100vw - 32px)', maxHeight: 480,
                    background: '#fff', borderRadius: 14,
                    boxShadow: '0 12px 40px rgba(0,0,0,0.15)',
                    border: '1px solid #eee', zIndex: 1000,
                    overflow: 'hidden', display: 'flex', flexDirection: 'column',
                }}>
                    <div style={{ padding: '14px 16px', borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ fontWeight: 700, fontSize: 15 }}>
                            Bildirishnomalar
                            {unreadCount > 0 && (
                                <span style={{ marginLeft: 8, fontSize: 11, color: '#fff', background: '#ef4444', padding: '2px 7px', borderRadius: 10, fontWeight: 700 }}>{unreadCount}</span>
                            )}
                        </div>
                        <div style={{ display: 'flex', gap: 6 }}>
                            {unreadCount > 0 && (
                                <button onClick={() => markAll.mutate()} title="Hammasini o'qildi" style={{ background: 'transparent', border: '1px solid #eee', cursor: 'pointer', padding: '4px 10px', borderRadius: 8, fontSize: 12, color: '#475569' }}>
                                    <Check size={12} style={{ verticalAlign: '-2px' }} /> Hammasi
                                </button>
                            )}
                            <button onClick={() => setOpen(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 6, color: '#475569' }}>
                                <X size={16} />
                            </button>
                        </div>
                    </div>

                    <div style={{ overflowY: 'auto', flex: 1 }}>
                        {isLoading && <div style={{ padding: 24, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>Yuklanmoqda...</div>}
                        {!isLoading && items.length === 0 && (
                            <div style={{ padding: 32, textAlign: 'center', color: '#94a3b8' }}>
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
                                    borderBottom: '1px solid #f1f5f9',
                                    cursor: n.link ? 'pointer' : 'default',
                                    background: n.isRead ? 'transparent' : '#eff6ff',
                                    position: 'relative',
                                }}
                            >
                                {!n.isRead && (
                                    <span style={{ position: 'absolute', left: 6, top: 18, width: 6, height: 6, borderRadius: '50%', background: '#2563eb' }} />
                                )}
                                <div style={{ paddingLeft: 8 }}>
                                    <div style={{ fontWeight: n.isRead ? 500 : 700, fontSize: 13, marginBottom: 2 }}>{n.title}</div>
                                    <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.5, marginBottom: 4 }}>{n.body || n.message}</div>
                                    <div style={{ fontSize: 11, color: '#94a3b8' }}>{fmtRelative(n.createdAt)}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
