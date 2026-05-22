import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCheck, Loader2, Inbox } from 'lucide-react';
import api from '../../shared/api/axios';
import TopBar from '../../pages/home/TopBar';
import Navigation from '../../pages/home/Navigation';
import Footer from '../../pages/home/Footer';
import BanisaLoader from '../../shared/components/BanisaLoader';
import './css/UserNotificationsPage.css';

function fmtRelative(iso) {
    if (!iso) return '';
    const diff = (Date.now() - new Date(iso).getTime()) / 1000;
    if (diff < 60) return 'Hozir';
    if (diff < 3600) return `${Math.floor(diff / 60)} daq oldin`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} soat oldin`;
    if (diff < 7 * 86400) return `${Math.floor(diff / 86400)} kun oldin`;
    return new Date(iso).toLocaleDateString('uz-UZ', { day: '2-digit', month: 'short' });
}

export default function UserNotificationsPage() {
    const qc = useQueryClient();
    const navigate = useNavigate();
    const [filter, setFilter] = useState('all'); // all | unread

    const { data, isLoading } = useQuery({
        queryKey: ['user', 'notifications', 'list', filter],
        queryFn: async () => {
            const params = new URLSearchParams();
            params.set('limit', '50');
            if (filter === 'unread') params.set('isRead', 'false');
            const res = await api.get(`/user/notifications?${params}`);
            return res.data;
        },
        refetchInterval: 30000,
    });

    const items = data?.data || [];
    const total = data?.meta?.total || items.length;

    const markRead = useMutation({
        mutationFn: async (id) => api.post(`/user/notifications/${id}/read`),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['user', 'notifications'] }),
    });
    const markAll = useMutation({
        mutationFn: async () => api.post('/user/notifications/read-all'),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['user', 'notifications'] }),
    });

    const handleClick = (n) => {
        if (!n.isRead) markRead.mutate(n.id);
        if (n.link) navigate(n.link);
    };

    return (
        <div className="home-page">
            <TopBar />
            <Navigation />
            <main className="un-main">
                <header className="un-header">
                    <div>
                        <h1><Bell size={22} /> Bildirishnomalar</h1>
                        <p>{total} ta bildirishnoma</p>
                    </div>
                    <div className="un-actions">
                        <div className="un-tabs">
                            <button
                                className={`un-tab${filter === 'all' ? ' active' : ''}`}
                                onClick={() => setFilter('all')}
                            >Barchasi</button>
                            <button
                                className={`un-tab${filter === 'unread' ? ' active' : ''}`}
                                onClick={() => setFilter('unread')}
                            >O'qilmagan</button>
                        </div>
                        <button
                            className="un-mark-all"
                            disabled={markAll.isPending}
                            onClick={() => markAll.mutate()}
                        >
                            <CheckCheck size={14} /> Hammasini o'qilgan deb belgilash
                        </button>
                    </div>
                </header>

                {isLoading ? (
                    <BanisaLoader message="Yuklanmoqda..." />
                ) : items.length === 0 ? (
                    <div className="un-empty">
                        <Inbox size={48} className="un-empty-icon" />
                        <h3>{filter === 'unread' ? 'O\'qilmaganlar yo\'q' : 'Hozircha bildirishnomalar yo\'q'}</h3>
                        <p>Yangi xabarlar bo'lganda shu yerda paydo bo'ladi.</p>
                        <Link to="/user/appointments" className="un-empty-link">Bronlarimga o'tish</Link>
                    </div>
                ) : (
                    <div className="un-list">
                        {items.map(n => (
                            <button
                                key={n.id}
                                className={`un-item${n.isRead ? '' : ' un-unread'} un-prio-${(n.priority || 'NORMAL').toLowerCase()}`}
                                onClick={() => handleClick(n)}
                            >
                                {!n.isRead && <span className="un-dot" />}
                                <div className="un-item-body">
                                    <div className="un-item-head">
                                        <strong>{n.title}</strong>
                                        <span className="un-time">{fmtRelative(n.createdAt)}</span>
                                    </div>
                                    {n.body && <p>{n.body}</p>}
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </main>
            <Footer />
        </div>
    );
}
