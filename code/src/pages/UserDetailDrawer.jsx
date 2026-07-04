import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import {
    X, Phone, Send, Globe, MessageCircle, Calendar, Building2,
    Truck, CreditCard, Copy, Clock,
} from 'lucide-react';
import api from '../shared/api/axios';
import './UserDetailDrawer.css';

function fmtDate(d) {
    if (!d) return '—';
    try {
        return new Date(d).toLocaleString('uz-UZ', {
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

function fmtSom(n) {
    if (n == null) return '0';
    return new Intl.NumberFormat('uz-UZ').format(n);
}

const STATUS_LABELS = {
    PENDING: 'Kutilmoqda', CONFIRMED: 'Tasdiqlangan', COMPLETED: 'Yakunlangan',
    CANCELLED: 'Bekor qilingan', NO_SHOW: 'Kelmadi', IN_PROGRESS: 'Jarayonda',
    CHECKED_IN: 'Ro\'yxatdan o\'tdi', STARTED: 'Boshlandi',
    ON_ROUTE: 'Yo\'lda', ARRIVED: 'Yetib keldi',
};
function statusLabel(s) { return STATUS_LABELS[s] || s; }
function statusClass(s) {
    if (['COMPLETED', 'CONFIRMED', 'ARRIVED'].includes(s)) return 'ok';
    if (['CANCELLED', 'NO_SHOW'].includes(s)) return 'bad';
    if (['IN_PROGRESS', 'STARTED', 'ON_ROUTE', 'CHECKED_IN'].includes(s)) return 'warn';
    return 'neutral';
}

function copyText(t) { try { navigator.clipboard?.writeText(t); } catch { /* ignore */ } }

export default function UserDetailDrawer({ userId, onClose }) {
    useEffect(() => {
        const onKey = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    const { data: u, isLoading, isError } = useQuery({
        queryKey: ['admin-user-detail', userId],
        queryFn: async () => (await api.get(`/admin/users/${userId}`)).data.data,
        enabled: !!userId,
    });

    const name = u ? [u.firstName, u.lastName].filter(Boolean).join(' ') || '—' : '';
    const initials = u ? (u.firstName?.[0] || u.phone?.slice(-2) || '?').toUpperCase() : '?';
    const isTg = u?.source === 'telegram';

    return createPortal(
        <div className="udd-overlay" onMouseDown={onClose}>
            <div className="udd-drawer" onMouseDown={(e) => e.stopPropagation()}>
                <button className="udd-close" onClick={onClose} aria-label="Yopish"><X size={20} /></button>

                {isLoading ? (
                    <div className="udd-loading">Yuklanmoqda...</div>
                ) : isError || !u ? (
                    <div className="udd-loading">Ma'lumot topilmadi</div>
                ) : (
                    <>
                        {/* Header */}
                        <div className="udd-head">
                            <div className="udd-avatar" style={{ background: isTg ? '#0088cc' : '#6b7280' }}>
                                {initials}
                            </div>
                            <div className="udd-head-info">
                                <h2>{name}</h2>
                                <div className="udd-head-sub">
                                    {isTg ? (
                                        <span className="udd-badge tg"><Send size={11} /> Telegram</span>
                                    ) : (
                                        <span className="udd-badge web"><Globe size={11} /> Sayt</span>
                                    )}
                                    <span className={`udd-badge ${u.isActive ? 'ok' : 'bad'}`}>
                                        {u.isActive ? 'Faol' : 'Faolsiz'}
                                    </span>
                                    {u.telegram?.isBlocked && (
                                        <span className="udd-badge bad">Bot bloklangan</span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Stat tiles */}
                        <div className="udd-stats">
                            <div className="udd-stat">
                                <Calendar size={15} />
                                <div className="udd-stat-v">{u.stats.orderCount}</div>
                                <div className="udd-stat-l">Buyurtma</div>
                            </div>
                            <div className="udd-stat">
                                <Truck size={15} />
                                <div className="udd-stat-v">{u.stats.skoryCount}</div>
                                <div className="udd-stat-l">Tez yordam</div>
                            </div>
                            <div className="udd-stat">
                                <Building2 size={15} />
                                <div className="udd-stat-v">{u.clinics.length}</div>
                                <div className="udd-stat-l">Klinika</div>
                            </div>
                            <div className="udd-stat">
                                <CreditCard size={15} />
                                <div className="udd-stat-v">{fmtSom(u.stats.totalPaid)}</div>
                                <div className="udd-stat-l">To'langan (so'm)</div>
                            </div>
                        </div>

                        {/* Contact / meta */}
                        <div className="udd-section">
                            <div className="udd-meta-grid">
                                <div className="udd-meta">
                                    <span className="udd-meta-l"><Phone size={12} /> Telefon</span>
                                    <span className="udd-meta-v">
                                        <a href={`tel:${u.phone}`}>{u.phone}</a>
                                        <button className="udd-copy" onClick={() => copyText(u.phone)}><Copy size={11} /></button>
                                    </span>
                                </div>
                                {u.email && (
                                    <div className="udd-meta">
                                        <span className="udd-meta-l">Email</span>
                                        <span className="udd-meta-v">{u.email}</span>
                                    </div>
                                )}
                                <div className="udd-meta">
                                    <span className="udd-meta-l"><Calendar size={12} /> Ro'yxatdan o'tgan</span>
                                    <span className="udd-meta-v">{fmtDate(u.createdAt)}</span>
                                </div>
                                <div className="udd-meta">
                                    <span className="udd-meta-l"><Clock size={12} /> Oxirgi faollik</span>
                                    <span className="udd-meta-v">
                                        {u.telegram?.lastSeenAt ? fmtRelative(u.telegram.lastSeenAt) : '—'}
                                    </span>
                                </div>
                                {u.telegram?.username && (
                                    <div className="udd-meta">
                                        <span className="udd-meta-l"><Send size={12} /> Telegram</span>
                                        <span className="udd-meta-v">
                                            <a href={`https://t.me/${u.telegram.username}`} target="_blank" rel="noopener noreferrer">
                                                @{u.telegram.username}
                                            </a>
                                            {u.telegram.telegramUserId && (
                                                <a className="udd-tg-write" href={`tg://user?id=${u.telegram.telegramUserId}`} title="Yozish">
                                                    <MessageCircle size={12} />
                                                </a>
                                            )}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Visited clinics */}
                        {u.clinics.length > 0 && (
                            <div className="udd-section">
                                <h3 className="udd-h3"><Building2 size={14} /> Bo'lgan klinikalar</h3>
                                <div className="udd-clinics">
                                    {u.clinics.map((c) => (
                                        <div className="udd-clinic" key={c.id}>
                                            <div className="udd-clinic-name">{c.name}</div>
                                            <div className="udd-clinic-meta">
                                                <span>{c.visits} marta</span>
                                                <span className="udd-dot">·</span>
                                                <span>oxirgi {fmtRelative(c.lastVisitAt)}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Recent appointments */}
                        <div className="udd-section">
                            <h3 className="udd-h3"><Calendar size={14} /> So'nggi buyurtmalar</h3>
                            {u.recentAppointments.length === 0 ? (
                                <div className="udd-empty">Buyurtmalar yo'q</div>
                            ) : (
                                <div className="udd-orders">
                                    {u.recentAppointments.map((a) => (
                                        <div className="udd-order" key={a.id}>
                                            <div className="udd-order-main">
                                                <div className="udd-order-clinic">{a.clinicName}</div>
                                                <div className="udd-order-sub">
                                                    #{a.bookingNumber}
                                                    {a.doctorName ? ` · ${a.doctorName}` : ''}
                                                </div>
                                            </div>
                                            <div className="udd-order-right">
                                                <span className={`udd-badge ${statusClass(a.status)}`}>{statusLabel(a.status)}</span>
                                                <div className="udd-order-price">{fmtSom(a.finalPrice)} so'm</div>
                                                <div className="udd-order-date">{fmtDate(a.scheduledAt)}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Recent ambulance requests */}
                        {u.recentSkory.length > 0 && (
                            <div className="udd-section">
                                <h3 className="udd-h3"><Truck size={14} /> Tez yordam so'rovlari</h3>
                                <div className="udd-orders">
                                    {u.recentSkory.map((r) => (
                                        <div className="udd-order" key={r.id}>
                                            <div className="udd-order-main">
                                                <div className="udd-order-clinic">{r.pickupAddress || 'Manzil yo\'q'}</div>
                                                {r.destAddress && <div className="udd-order-sub">→ {r.destAddress}</div>}
                                            </div>
                                            <div className="udd-order-right">
                                                <span className={`udd-badge ${statusClass(r.status)}`}>{statusLabel(r.status)}</span>
                                                <div className="udd-order-date">{fmtDate(r.createdAt)}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>,
        document.body
    );
}
