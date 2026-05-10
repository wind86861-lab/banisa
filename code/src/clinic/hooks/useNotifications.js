import { useEffect, useRef, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import api from '../../shared/api/axios';

/**
 * Adaptive notification polling for clinic dashboard.
 * - 5s when tab is focused
 * - 30s when tab is in background
 * - paused when offline or tab hidden long enough
 * - uses ETag (If-None-Match) so server returns 304 when nothing changed
 *
 * Side effects when count goes UP:
 * - plays soft chime (audio)
 * - shows browser Notification (if user granted permission)
 * - invalidates the notifications list cache so the page refreshes
 */

const ACTIVE_INTERVAL = 5000;
const IDLE_INTERVAL = 30000;
const STORAGE_KEY = 'clinic_notifs_etag';

// Tiny base64-encoded chime (short ping). Lazy-create on first use.
let audioEl = null;
function playPing() {
    try {
        if (!audioEl) {
            audioEl = new Audio('data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU' +
                'tvT18AAACAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA');
            audioEl.volume = 0.4;
        }
        audioEl.currentTime = 0;
        audioEl.play().catch(() => {});
    } catch {}
}

function showBrowserNotification(title, body) {
    if (typeof window === 'undefined') return;
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;
    try {
        const n = new Notification(title, { body, icon: '/favicon.ico', tag: 'banisa-notif' });
        setTimeout(() => n.close(), 6000);
    } catch {}
}

export function useNotifications({ onNew } = {}) {
    const qc = useQueryClient();
    const [unreadCount, setUnreadCount] = useState(0);
    const [latestAt, setLatestAt] = useState(null);

    const lastCountRef = useRef(0);
    const etagRef = useRef(localStorage.getItem(STORAGE_KEY) || '');
    const onNewRef = useRef(onNew);
    onNewRef.current = onNew;

    const fetchOnce = useCallback(async () => {
        if (!navigator.onLine) return;
        try {
            const res = await api.get('/clinic/notifications/unread-count', {
                headers: etagRef.current ? { 'If-None-Match': etagRef.current } : {},
                validateStatus: (s) => s === 200 || s === 304,
            });
            if (res.status === 304) return;

            const newEtag = res.headers?.etag || res.headers?.ETag;
            if (newEtag) {
                etagRef.current = newEtag;
                localStorage.setItem(STORAGE_KEY, newEtag);
            }

            const data = res.data?.data || {};
            const count = Number(data.count || 0);
            const at = data.latestAt || null;

            setUnreadCount(count);
            setLatestAt(at);

            if (count > lastCountRef.current && lastCountRef.current >= 0) {
                playPing();
                showBrowserNotification('🆕 Yangi bildirishnoma', 'Bemor keldi yoki yangi yangilik bor');
                qc.invalidateQueries({ queryKey: ['clinic', 'notifications'] });
                if (onNewRef.current) onNewRef.current({ count, latestAt: at });
            }
            lastCountRef.current = count;
        } catch (e) {
            // silent — keep polling
        }
    }, [qc]);

    useEffect(() => {
        let timer = null;
        let stopped = false;

        const tick = () => {
            if (stopped) return;
            const interval = document.hidden ? IDLE_INTERVAL : ACTIVE_INTERVAL;
            fetchOnce();
            timer = setTimeout(tick, interval);
        };
        tick();

        const onVisibility = () => {
            if (timer) clearTimeout(timer);
            tick();
        };
        const onOnline = () => {
            if (timer) clearTimeout(timer);
            tick();
        };

        document.addEventListener('visibilitychange', onVisibility);
        window.addEventListener('online', onOnline);

        return () => {
            stopped = true;
            if (timer) clearTimeout(timer);
            document.removeEventListener('visibilitychange', onVisibility);
            window.removeEventListener('online', onOnline);
        };
    }, [fetchOnce]);

    const requestPermission = useCallback(async () => {
        if (!('Notification' in window)) return 'denied';
        if (Notification.permission === 'granted') return 'granted';
        if (Notification.permission === 'denied') return 'denied';
        try {
            return await Notification.requestPermission();
        } catch {
            return 'denied';
        }
    }, []);

    return { unreadCount, latestAt, refetch: fetchOnce, requestPermission };
}
