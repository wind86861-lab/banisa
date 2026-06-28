import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { Bell, Check, X } from 'lucide-react';
import api from '../../shared/api/axios';
import { useUserAuth } from '../../shared/auth/UserAuthContext';
import './UserNotificationBell.css';

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

    // Keep every hook call above the conditional render. Previously this
    // returned null for non-patients BEFORE useQuery / useMutation /
    // useEffect ran below, so the hook count changed across renders when
    // a role flipped — React #310. Now the queries simply stay disabled
    // when the user isn't a patient OR the panel is closed, and the final
    // render returns null below.
    const { data, isLoading } = useQuery({
        queryKey: ['user', 'notifications', 'recent'],
        queryFn: async () => {
            const r = await api.get('/user/notifications', { params: { limit: 15 } });
            return r.data?.data || { items: [] };
        },
        enabled: isPatient && open,
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

    // Render nothing for non-patients — defence in depth on top of
    // Navigation's gate. MUST come after all hook calls above so the hook
    // count stays stable across renders even when isPatient toggles.
    if (!isPatient) return null;

    const handleClick = (n) => {
        if (!n.isRead) markRead.mutate(n.id);
        if (n.link) { navigate(n.link); setOpen(false); }
    };

    const items = data?.items || [];

    return (
        <div ref={panelRef} className="unb-root">
            <button
                className="cm-nav-bell unb-trigger"
                aria-label="Bildirishnomalar"
                onClick={() => setOpen(v => !v)}
            >
                <Bell size={20} />
                {unreadCount > 0 && (
                    <span className="unb-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
                )}
            </button>

            {open && (
                <div className="unb-panel">
                    <div className="unb-panel-head">
                        <div className="unb-panel-title">
                            Bildirishnomalar
                            {unreadCount > 0 && (
                                <span className="unb-panel-count">{unreadCount}</span>
                            )}
                        </div>
                        <div className="unb-panel-head-actions">
                            {unreadCount > 0 && (
                                <button onClick={() => markAll.mutate()} title="Hammasini o'qildi" className="unb-mark-all">
                                    <Check size={12} /> Hammasi
                                </button>
                            )}
                            <button onClick={() => setOpen(false)} className="unb-close">
                                <X size={16} />
                            </button>
                        </div>
                    </div>

                    <div className="unb-list">
                        {isLoading && <div className="unb-loading">Yuklanmoqda...</div>}
                        {!isLoading && items.length === 0 && (
                            <div className="unb-empty">
                                <div className="unb-empty-emoji">🔔</div>
                                <div>Hozircha bildirishnomalar yo'q</div>
                            </div>
                        )}
                        {!isLoading && items.map((n) => (
                            <div
                                key={n.id}
                                onClick={() => handleClick(n)}
                                className={`unb-item${n.isRead ? '' : ' unb-item--unread'}${n.link ? ' unb-item--clickable' : ''}`}
                            >
                                {!n.isRead && <span className="unb-dot" />}
                                <div className="unb-item-body">
                                    <div className={`unb-item-title${n.isRead ? '' : ' unb-item-title--bold'}`}>{n.title}</div>
                                    <div className="unb-item-text">{n.body || n.message}</div>
                                    <div className="unb-item-time">{fmtRelative(n.createdAt)}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
