import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Filter, Send, Globe, RefreshCw, Phone, MessageCircle, Copy, ChevronLeft, ChevronRight, Calendar, Truck } from 'lucide-react';
import api from '../shared/api/axios';
import UserDetailDrawer from './UserDetailDrawer';
import './Users.css';

function fmtDate(d) {
    if (!d) return '—';
    try {
        const dt = new Date(d);
        return dt.toLocaleString('uz-UZ', {
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit',
        });
    } catch { return String(d); }
}

function fmtRelative(d) {
    if (!d) return '';
    const diff = Date.now() - new Date(d).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'hozir';
    if (m < 60) return `${m} daq oldin`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h} soat oldin`;
    const day = Math.floor(h / 24);
    if (day < 30) return `${day} kun oldin`;
    return fmtDate(d);
}

function copyText(text) {
    try { navigator.clipboard?.writeText(text); } catch { /* ignore */ }
}

export default function Users() {
    const [q, setQ] = useState('');
    const [source, setSource] = useState('ALL');  // ALL | telegram | web
    const [page, setPage] = useState(1);
    const [selectedId, setSelectedId] = useState(null);
    const limit = 50;

    const params = useMemo(() => {
        const p = { page, limit };
        if (q.trim()) p.q = q.trim();
        if (source !== 'ALL') p.source = source;
        return p;
    }, [q, source, page]);

    const { data, isLoading, isFetching, refetch } = useQuery({
        queryKey: ['admin-users', params],
        queryFn: async () => (await api.get('/admin/users', { params })).data.data,
        keepPreviousData: true,
    });

    const items = data?.items ?? [];
    const meta = data?.meta ?? { total: 0, telegramCount: 0, webCount: 0, pages: 1 };

    return (
        <div className="users-page">
            <div className="users-header">
                <div className="header-left">
                    <h1>Bemorlar</h1>
                    <p className="subtitle">Sayt va Telegram orqali ro'yxatdan o'tgan barcha foydalanuvchilar</p>
                </div>
                <div className="header-actions">
                    <button className="btn-secondary" onClick={() => refetch()} disabled={isFetching}>
                        <RefreshCw size={16} className={isFetching ? 'spin' : ''} />
                        Yangilash
                    </button>
                </div>
            </div>

            <div className="users-stats">
                <div className="stat-card">
                    <div className="stat-label">Jami</div>
                    <div className="stat-value">{meta.total}</div>
                </div>
                <div className="stat-card stat-card--tg">
                    <div className="stat-label"><Send size={11} /> Telegram orqali</div>
                    <div className="stat-value">{meta.telegramCount}</div>
                </div>
                <div className="stat-card stat-card--web">
                    <div className="stat-label"><Globe size={11} /> Sayt orqali</div>
                    <div className="stat-value">{meta.webCount}</div>
                </div>
                <div className="stat-card">
                    <div className="stat-label">Bugun</div>
                    <div className="stat-value">
                        {items.filter(u => {
                            const d = new Date(u.createdAt);
                            const today = new Date();
                            return d.toDateString() === today.toDateString();
                        }).length}
                    </div>
                </div>
            </div>

            <div className="users-filters">
                <div className="search-box">
                    <Search size={18} className="search-icon" />
                    <input
                        type="text"
                        placeholder="Telefon, ism, Telegram username..."
                        value={q}
                        onChange={(e) => { setQ(e.target.value); setPage(1); }}
                    />
                </div>
                <div className="filter-group">
                    <Filter size={18} />
                    <select value={source} onChange={(e) => { setSource(e.target.value); setPage(1); }}>
                        <option value="ALL">Barcha manbalar</option>
                        <option value="telegram">Faqat Telegram</option>
                        <option value="web">Faqat sayt</option>
                    </select>
                </div>
            </div>

            <div className="users-table-container">
                <table className="users-table">
                    <thead>
                        <tr>
                            <th>Foydalanuvchi</th>
                            <th>Telefon</th>
                            <th>Buyurtmalar</th>
                            <th>Manba</th>
                            <th>Telegram</th>
                            <th>Ro'yxatdan o'tgan</th>
                            <th>Faollik</th>
                            <th>Holat</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <tr><td colSpan="8" className="empty-state">Yuklanmoqda...</td></tr>
                        ) : items.length === 0 ? (
                            <tr><td colSpan="8" className="empty-state">
                                <div className="empty-icon">👥</div>
                                <h3>Foydalanuvchi topilmadi</h3>
                                <p>Qidiruv yoki filtrlarni o'zgartiring</p>
                            </td></tr>
                        ) : (
                            items.map(u => {
                                const name = [u.firstName, u.lastName].filter(Boolean).join(' ') || '—';
                                const initials = (u.firstName?.[0] || u.phone?.slice(-2) || '?').toUpperCase();
                                const isTg = u.source === 'telegram';
                                return (
                                    <tr key={u.id} className="user-row" onClick={() => setSelectedId(u.id)}>
                                        <td>
                                            <div className="user-info">
                                                <div className="user-avatar" style={{ background: isTg ? '#0088cc' : '#6b7280' }}>
                                                    {initials}
                                                </div>
                                                <div>
                                                    <div className="user-name">{name}</div>
                                                    <div className="user-id">{u.email || `ID: ${u.id.slice(0, 8)}`}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="phone-cell">
                                                <a href={`tel:${u.phone}`} className="phone-link" onClick={(e) => e.stopPropagation()}>
                                                    <Phone size={11} /> {u.phone}
                                                </a>
                                                <button className="copy-btn" onClick={(e) => { e.stopPropagation(); copyText(u.phone); }} title="Nusxalash">
                                                    <Copy size={11} />
                                                </button>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="orders-cell">
                                                <span className="orders-count" title="Buyurtmalar">
                                                    <Calendar size={11} /> {u.orderCount ?? 0}
                                                </span>
                                                {(u.skoryCount ?? 0) > 0 && (
                                                    <span className="orders-skory" title="Tez yordam so'rovlari">
                                                        <Truck size={11} /> {u.skoryCount}
                                                    </span>
                                                )}
                                                {u.lastOrderAt && (
                                                    <span className="orders-last">{fmtRelative(u.lastOrderAt)}</span>
                                                )}
                                            </div>
                                        </td>
                                        <td>
                                            {isTg ? (
                                                <span className="source-badge source-badge--tg">
                                                    <Send size={11} /> Telegram
                                                </span>
                                            ) : (
                                                <span className="source-badge source-badge--web">
                                                    <Globe size={11} /> Sayt
                                                </span>
                                            )}
                                        </td>
                                        <td>
                                            {u.telegram ? (
                                                <div className="tg-cell" onClick={(e) => e.stopPropagation()}>
                                                    {u.telegram.username ? (
                                                        <a
                                                            href={`https://t.me/${u.telegram.username}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="tg-username"
                                                        >
                                                            @{u.telegram.username}
                                                        </a>
                                                    ) : (
                                                        <span className="tg-username tg-username--noname">@yo'q</span>
                                                    )}
                                                    {u.telegram.chatId && (
                                                        <a
                                                            href={`tg://user?id=${u.telegram.telegramUserId}`}
                                                            className="tg-write"
                                                            title="Yozish"
                                                        >
                                                            <MessageCircle size={11} />
                                                        </a>
                                                    )}
                                                    {u.telegram.language && (
                                                        <span className="tg-lang">{u.telegram.language.toUpperCase()}</span>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="tg-none">—</span>
                                            )}
                                        </td>
                                        <td>
                                            <div className="date-cell">
                                                <div>{fmtDate(u.createdAt)}</div>
                                                <div className="date-relative">{fmtRelative(u.createdAt)}</div>
                                            </div>
                                        </td>
                                        <td>
                                            {u.telegram?.lastSeenAt ? (
                                                <div className="date-cell">
                                                    <div>{fmtRelative(u.telegram.lastSeenAt)}</div>
                                                </div>
                                            ) : <span className="tg-none">—</span>}
                                        </td>
                                        <td>
                                            <span className={`status-badge ${u.isActive ? 'active' : 'inactive'}`}>
                                                {u.isActive ? 'Faol' : 'Faolsiz'}
                                            </span>
                                            {u.telegram?.isBlocked && (
                                                <span className="status-badge inactive" style={{ marginLeft: 4 }}>
                                                    Bot bloklangan
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {meta.pages > 1 && (
                <div className="users-pagination">
                    <button
                        className="page-btn"
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page <= 1}
                    >
                        <ChevronLeft size={14} /> Oldingi
                    </button>
                    <span className="page-info">{page} / {meta.pages}</span>
                    <button
                        className="page-btn"
                        onClick={() => setPage(p => Math.min(meta.pages, p + 1))}
                        disabled={page >= meta.pages}
                    >
                        Keyingi <ChevronRight size={14} />
                    </button>
                </div>
            )}

            {selectedId && (
                <UserDetailDrawer userId={selectedId} onClose={() => setSelectedId(null)} />
            )}
        </div>
    );
}
