import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Calendar, Users, Briefcase, CheckCircle2,
    Clock, ArrowRight, Loader2, Activity,
    TrendingUp, TrendingDown, Minus, Star,
    Stethoscope, Scissors, Bed, Package,
    Phone, ChevronRight, DollarSign, Eye,
    UserCheck, CalendarCheck, BarChart3,
} from 'lucide-react';
import { motion } from 'framer-motion';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import { useClinicStats, useClinicProfile } from '../hooks/useClinicData';
import { useAuth } from '../../shared/auth/AuthContext';
import './clinic-admin.css';
import './clinic-dashboard.css';

const fmt = (n) => (n ?? 0).toLocaleString('uz-UZ');
const fmtMoney = (n) => {
    if (!n) return '0';
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
    return n.toString();
};

const STATUS_COLORS = {
    PENDING: { bg: 'rgba(245,158,11,0.12)', color: '#f59e0b', label: 'Kutilmoqda' },
    CONFIRMED: { bg: 'rgba(6,182,212,0.12)', color: '#06b6d4', label: 'Tasdiqlangan' },
    COMPLETED: { bg: 'rgba(16,185,129,0.12)', color: '#10b981', label: 'Bajarilgan' },
    CANCELLED: { bg: 'rgba(239,68,68,0.12)', color: '#ef4444', label: 'Bekor qilingan' },
};

const AVATAR_COLORS = ['#00C9A7', '#6366f1', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4'];
const getAvatarColor = (name) => AVATAR_COLORS[(name || '').charCodeAt(0) % AVATAR_COLORS.length];
const getInitials = (first, last) => `${(first || '?')[0]}${(last || '')[0] || ''}`.toUpperCase();

const SERVICE_TYPES = [
    { key: 'diagnostics', label: 'Diagnostika', icon: <Stethoscope size={16} />, color: '#00C9A7' },
    { key: 'surgical', label: 'Operatsiyalar', icon: <Scissors size={16} />, color: '#8b5cf6' },
    { key: 'sanatorium', label: 'Sanatoriya', icon: <Bed size={16} />, color: '#3b82f6' },
    { key: 'checkup', label: 'Checkup', icon: <Package size={16} />, color: '#f59e0b' },
];

const container = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div style={{
            background: 'var(--bg-card)', border: '1px solid var(--border-color)',
            borderRadius: 10, padding: '10px 14px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
        }}>
            <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 6 }}>{label}</div>
            {payload.map((p, i) => (
                <div key={i} style={{ fontSize: 11, color: p.color, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.color, display: 'inline-block' }} />
                    {p.name}: <strong>{fmt(p.value)}</strong>
                </div>
            ))}
        </div>
    );
};

export default function ClinicDashboard() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { data: stats, isLoading: statsLoading } = useClinicStats();
    const { data: profile } = useClinicProfile();

    const clinicName = profile?.nameUz || 'Klinika';
    const now = new Date();
    const dateStr = now.toLocaleDateString('uz-UZ', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    const totalServicesActive = stats?.activeServices ?? 0;

    const STAT_CARDS = [
        {
            label: 'Jami bronlar',
            value: stats?.totalAppointments ?? 0,
            icon: <Calendar size={22} />,
            color: '#00C9A7',
            bg: 'rgba(0,201,167,0.12)',
            accent: '#00C9A7',
        },
        {
            label: 'Bugungi bronlar',
            value: stats?.todayAppointments ?? 0,
            icon: <CalendarCheck size={22} />,
            color: '#6366f1',
            bg: 'rgba(99,102,241,0.12)',
            accent: '#6366f1',
        },
        {
            label: 'Bu oylik',
            value: stats?.thisMonthCount ?? 0,
            icon: <BarChart3 size={22} />,
            color: '#06b6d4',
            bg: 'rgba(6,182,212,0.12)',
            accent: '#06b6d4',
            change: stats?.monthGrowth ?? 0,
        },
        {
            label: 'Daromad (oy)',
            value: fmtMoney(stats?.revenueThisMonth ?? 0),
            icon: <DollarSign size={22} />,
            color: '#10b981',
            bg: 'rgba(16,185,129,0.12)',
            accent: '#10b981',
            isMoney: true,
        },
    ];

    const STAT_CARDS_2 = [
        { label: 'Kutilmoqda', value: stats?.pendingCount ?? 0, icon: <Clock size={20} />, color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
        { label: 'Tasdiqlangan', value: stats?.confirmedCount ?? 0, icon: <CheckCircle2 size={20} />, color: '#06b6d4', bg: 'rgba(6,182,212,0.12)' },
        { label: 'Bajarilgan', value: stats?.completedCount ?? 0, icon: <CheckCircle2 size={20} />, color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
        { label: 'Shifokorlar', value: stats?.totalDoctors ?? 0, icon: <Users size={20} />, color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)' },
    ];

    const serviceBreakdown = stats?.serviceBreakdown || {};
    const totalSB = Object.values(serviceBreakdown).reduce((a, b) => a + b, 0) || 1;

    const donutData = (stats?.statusBreakdown || []).filter(s => s.value > 0);
    const donutTotal = donutData.reduce((a, b) => a + b.value, 0);

    const weeklyData = stats?.weeklyTrend || [];

    if (statsLoading) {
        return (
            <div>
                <div className="cd-welcome">
                    <div className="cd-welcome-top">
                        <div>
                            <h1>Yuklanmoqda...</h1>
                            <p>Dashboard ma'lumotlari yuklanmoqda</p>
                        </div>
                    </div>
                </div>
                <div className="cd-stats-grid">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="cd-skeleton" style={{ height: 100 }} />
                    ))}
                </div>
                <div className="cd-charts-row" style={{ marginTop: 16 }}>
                    <div className="cd-skeleton" style={{ height: 300 }} />
                    <div className="cd-skeleton" style={{ height: 300 }} />
                </div>
            </div>
        );
    }

    return (
        <motion.div initial="hidden" animate="show" variants={container}>
            {/* ═══ Welcome Banner ═══ */}
            <motion.div className="cd-welcome" variants={item}>
                <div className="cd-welcome-top">
                    <div>
                        <h1>Xush kelibsiz, {user?.firstName || 'Admin'} 👋</h1>
                        <p>{clinicName} — boshqaruv paneli</p>
                    </div>
                    <div className="cd-welcome-date">
                        <strong>{dateStr}</strong>
                        {profile?.region && <span>{profile.region}{profile.district ? `, ${profile.district}` : ''}</span>}
                    </div>
                </div>
            </motion.div>

            {/* ═══ Main Stat Cards ═══ */}
            <motion.div className="cd-stats-grid" variants={container}>
                {STAT_CARDS.map((card, i) => (
                    <motion.div
                        key={i}
                        className="cd-stat-card"
                        variants={item}
                        style={{ '--accent': card.accent }}
                    >
                        <div className="cd-stat-icon" style={{ background: card.bg, color: card.color }}>
                            {card.icon}
                        </div>
                        <div className="cd-stat-body">
                            <div className="cd-stat-value">
                                {card.isMoney ? card.value : fmt(card.value)}
                                {card.isMoney && <span style={{ fontSize: 14, fontWeight: 500, marginLeft: 2 }}>UZS</span>}
                            </div>
                            <div className="cd-stat-label">{card.label}</div>
                            {card.change !== undefined && (
                                <span className={`cd-stat-change ${card.change > 0 ? 'up' : card.change < 0 ? 'down' : 'neutral'}`}>
                                    {card.change > 0 ? <TrendingUp size={11} /> : card.change < 0 ? <TrendingDown size={11} /> : <Minus size={11} />}
                                    {card.change > 0 ? '+' : ''}{card.change}%
                                </span>
                            )}
                        </div>
                        <div style={{ position: 'absolute', top: 0, left: 0, width: 4, height: '100%', background: card.accent, borderRadius: '4px 0 0 4px' }} />
                    </motion.div>
                ))}
            </motion.div>

            {/* ═══ Secondary Stats (mini) ═══ */}
            <motion.div variants={item} style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
                {STAT_CARDS_2.map((card, i) => (
                    <div key={i} style={{
                        background: 'var(--bg-card)', border: '1px solid var(--border-color)',
                        borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10,
                    }}>
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: card.bg, color: card.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {card.icon}
                        </div>
                        <div>
                            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-main)', lineHeight: 1 }}>{fmt(card.value)}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{card.label}</div>
                        </div>
                    </div>
                ))}
            </motion.div>

            {/* ═══ Charts Row ═══ */}
            <motion.div className="cd-charts-row" variants={item}>
                {/* Weekly Trend */}
                <div className="cd-chart-card">
                    <div className="cd-chart-title">Haftalik ko'rsatkich</div>
                    <div className="cd-chart-subtitle">Oxirgi 7 kunlik bronlar va bajarilganlar</div>
                    <ResponsiveContainer width="100%" height={260}>
                        <AreaChart data={weeklyData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorAppts" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                            <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} allowDecimals={false} />
                            <Tooltip content={<CustomTooltip />} />
                            <Area type="monotone" dataKey="appointments" name="Bronlar" stroke="#6366f1" strokeWidth={2.5} fillOpacity={1} fill="url(#colorAppts)" dot={{ r: 4, fill: '#6366f1', strokeWidth: 0 }} activeDot={{ r: 6 }} />
                            <Area type="monotone" dataKey="completed" name="Bajarilgan" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorCompleted)" dot={{ r: 4, fill: '#10b981', strokeWidth: 0 }} activeDot={{ r: 6 }} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                {/* Donut */}
                <div className="cd-chart-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ alignSelf: 'flex-start', width: '100%' }}>
                        <div className="cd-chart-title">Bronlar holati</div>
                        <div className="cd-chart-subtitle">Umumiy taqsimot</div>
                    </div>
                    <div style={{ position: 'relative', width: 200, height: 200 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={donutData.length > 0 ? donutData : [{ name: 'Bo\'sh', value: 1, color: 'var(--border-color)' }]}
                                    cx="50%" cy="50%"
                                    innerRadius={60} outerRadius={90}
                                    paddingAngle={3}
                                    dataKey="value"
                                    strokeWidth={0}
                                >
                                    {(donutData.length > 0 ? donutData : [{ color: 'var(--border-color)' }]).map((entry, i) => (
                                        <Cell key={i} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(val) => fmt(val)} />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="cd-donut-center">
                            <div className="cd-donut-center-value">{fmt(donutTotal)}</div>
                            <div className="cd-donut-center-label">Jami</div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8, justifyContent: 'center' }}>
                        {donutData.map((d, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
                                <span style={{ width: 8, height: 8, borderRadius: '50%', background: d.color }} />
                                {d.name}: <strong>{d.value}</strong>
                            </div>
                        ))}
                    </div>
                </div>
            </motion.div>

            {/* ═══ Quick Actions ═══ */}
            <motion.div className="cd-actions-grid" variants={item}>
                {[
                    { icon: <Calendar size={20} />, label: 'Bronlar', sub: "Barcha bronlarni ko'rish", path: '/clinic/bookings', color: '#00C9A7', bg: 'rgba(0,201,167,0.1)' },
                    { icon: <Briefcase size={20} />, label: 'Xizmatlar', sub: 'Xizmatlarni boshqarish', path: '/clinic/services', color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)' },
                    { icon: <Users size={20} />, label: 'Xodimlar', sub: 'Shifokorlar va xodimlar', path: '/clinic/staff', color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
                    { icon: <Activity size={20} />, label: 'Profil', sub: "Klinika ma'lumotlari", path: '/clinic/profile', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
                ].map((a, i) => (
                    <div key={i} className="cd-action-card" onClick={() => navigate(a.path)}>
                        <div className="cd-action-icon" style={{ background: a.bg, color: a.color }}>{a.icon}</div>
                        <div>
                            <div className="cd-action-label">{a.label}</div>
                            <div className="cd-action-sub">{a.sub}</div>
                        </div>
                        <ChevronRight size={16} color="var(--text-muted)" style={{ marginLeft: 'auto' }} />
                    </div>
                ))}
            </motion.div>

            {/* ═══ Bottom Grid: Recent + Services ═══ */}
            <motion.div className="cd-bottom-grid" variants={item}>
                {/* Recent Appointments */}
                <div className="cd-recent-card">
                    <div className="cd-recent-header">
                        <h3>So'nggi bronlar</h3>
                        <button
                            style={{ background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}
                            onClick={() => navigate('/clinic/bookings')}
                        >
                            Barchasi <ArrowRight size={13} />
                        </button>
                    </div>
                    {(stats?.recentAppointments?.length ?? 0) === 0 ? (
                        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                            <CalendarCheck size={32} style={{ marginBottom: 8, opacity: 0.4 }} />
                            <div>Hozircha bronlar yo'q</div>
                        </div>
                    ) : (
                        <ul className="cd-recent-list">
                            {stats.recentAppointments.map((appt) => {
                                const st = STATUS_COLORS[appt.status] || STATUS_COLORS.PENDING;
                                const pName = `${appt.patient?.firstName || ''} ${appt.patient?.lastName || ''}`.trim();
                                const dName = appt.doctor ? `Dr. ${appt.doctor.firstName} ${appt.doctor.lastName}` : null;
                                const scheduled = new Date(appt.scheduledAt);
                                return (
                                    <li key={appt.id} className="cd-recent-item">
                                        <div className="cd-recent-avatar" style={{ background: getAvatarColor(pName) }}>
                                            {getInitials(appt.patient?.firstName, appt.patient?.lastName)}
                                        </div>
                                        <div className="cd-recent-info">
                                            <div className="cd-recent-name">{pName || 'Bemor'}</div>
                                            <div className="cd-recent-meta">
                                                <Clock size={10} />
                                                {scheduled.toLocaleDateString('uz-UZ', { day: 'numeric', month: 'short' })}
                                                {dName && <><span style={{ opacity: 0.4 }}>|</span> {dName}</>}
                                            </div>
                                        </div>
                                        <span className="cd-recent-status" style={{ background: st.bg, color: st.color }}>
                                            {st.label}
                                        </span>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>

                {/* Right column: Services + Top Doctors + Reviews */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {/* Service Breakdown */}
                    <div className="cd-service-card">
                        <div className="cd-service-header">
                            <h3>Faol xizmatlar ({totalServicesActive})</h3>
                        </div>
                        <div className="cd-service-list">
                            {SERVICE_TYPES.map(st => {
                                const count = serviceBreakdown[st.key] || 0;
                                const pct = Math.round((count / totalSB) * 100) || 0;
                                return (
                                    <div key={st.key}>
                                        <div className="cd-service-row">
                                            <div className="cd-service-dot" style={{ background: st.color }} />
                                            <span style={{ color: st.color, display: 'flex', alignItems: 'center' }}>{st.icon}</span>
                                            <span className="cd-service-name">{st.label}</span>
                                            <span className="cd-service-count">{count}</span>
                                        </div>
                                        <div className="cd-service-bar-wrap">
                                            <div className="cd-service-bar" style={{ width: `${pct}%`, background: st.color }} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Top Doctors */}
                    {(stats?.topDoctors?.length ?? 0) > 0 && (
                        <div className="cd-service-card">
                            <div className="cd-service-header">
                                <h3>Eng faol shifokorlar</h3>
                            </div>
                            <div style={{ padding: '8px 22px 16px' }}>
                                {stats.topDoctors.map((doc, i) => (
                                    <div key={i} className="cd-doctor-item">
                                        <div className="cd-doctor-avatar" style={{ background: AVATAR_COLORS[i % AVATAR_COLORS.length] }}>
                                            {getInitials(doc.firstName, doc.lastName)}
                                        </div>
                                        <div className="cd-doctor-info">
                                            <div className="cd-doctor-name">Dr. {doc.firstName} {doc.lastName}</div>
                                            {doc.specialty && <div className="cd-doctor-spec">{doc.specialty}</div>}
                                        </div>
                                        <div className="cd-doctor-count">{doc.appointmentCount}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Review Stats */}
                    {stats?.reviewStats && (
                        <div className="cd-service-card">
                            <div style={{ padding: '18px 22px', display: 'flex', alignItems: 'center', gap: 16 }}>
                                <div style={{
                                    width: 56, height: 56, borderRadius: 16,
                                    background: 'rgba(245,158,11,0.1)', display: 'flex',
                                    alignItems: 'center', justifyContent: 'center',
                                }}>
                                    <Star size={26} color="#f59e0b" fill="#f59e0b" />
                                </div>
                                <div>
                                    <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-main)', lineHeight: 1 }}>
                                        {stats.reviewStats.averageRating || '—'}
                                    </div>
                                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                                        {stats.reviewStats.totalReviews} ta sharh asosida
                                    </div>
                                    <div className="cd-stars" style={{ marginTop: 4 }}>
                                        {[1, 2, 3, 4, 5].map(s => (
                                            <Star key={s} size={14}
                                                className={s <= Math.round(stats.reviewStats.averageRating || 0) ? 'cd-star' : 'cd-star empty'}
                                                fill={s <= Math.round(stats.reviewStats.averageRating || 0) ? '#f59e0b' : 'none'}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
}
