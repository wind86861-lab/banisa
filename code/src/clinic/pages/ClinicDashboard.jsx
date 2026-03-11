import { useNavigate } from 'react-router-dom';
import {
    Calendar, Users, Briefcase, CheckCircle2,
    Clock, ArrowRight, Loader2, Activity,
} from 'lucide-react';
import { useClinicStats, useClinicProfile } from '../hooks/useClinicData';
import { useClinicServices } from '../hooks/useClinicServices';
import { useAuth } from '../../shared/auth/AuthContext';
import './clinic-admin.css';

const fmt = (n) => (n ?? 0).toLocaleString('uz-UZ');


export default function ClinicDashboard() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { data: stats, isLoading: statsLoading } = useClinicStats();
    const { data: profile } = useClinicProfile();
    const { data: services } = useClinicServices();

    const clinicName = profile?.nameUz || 'Klinika';
    const activeServices = services?.filter(s => s.clinicService?.isActive).length ?? 0;

    const STAT_CARDS = [
        {
            label: 'Jami bronlar',
            value: stats?.totalAppointments ?? 0,
            icon: <Calendar size={22} />,
            color: '#00C9A7',
            bg: 'rgba(0,201,167,0.12)',
            change: null,
        },
        {
            label: 'Kutilmoqda',
            value: stats?.pendingCount ?? 0,
            icon: <Clock size={22} />,
            color: '#f59e0b',
            bg: 'rgba(245,158,11,0.12)',
            change: null,
        },
        {
            label: 'Tasdiqlangan',
            value: stats?.confirmedCount ?? 0,
            icon: <CheckCircle2 size={22} />,
            color: '#06b6d4',
            bg: 'rgba(6,182,212,0.12)',
            change: null,
        },
        {
            label: 'Faol xizmatlar',
            value: stats?.activeServices ?? activeServices,
            icon: <Briefcase size={22} />,
            color: '#8b5cf6',
            bg: 'rgba(139,92,246,0.12)',
            change: null,
        },
        {
            label: 'Shifokorlar',
            value: stats?.totalDoctors ?? 0,
            icon: <Users size={22} />,
            color: '#3b82f6',
            bg: 'rgba(59,130,246,0.12)',
            change: null,
        },
        {
            label: 'Bajarilgan',
            value: stats?.completedCount ?? 0,
            icon: <CheckCircle2 size={22} />,
            color: '#22c55e',
            bg: 'rgba(34,197,94,0.12)',
            change: null,
        },
    ];

    return (
        <div>
            {/* ─── Welcome header ─── */}
            <div className="ca-header">
                <div>
                    <h1 className="ca-title">Xush kelibsiz, {user?.firstName || 'Admin'} 👋</h1>
                    <p className="ca-subtitle">{clinicName} — boshqaruv paneli</p>
                </div>
                <button className="ca-btn-primary" onClick={() => navigate('/clinic/bookings')}>
                    <Calendar size={16} />
                    Bronlarni ko'rish
                </button>
            </div>

            {/* ─── Stats ─── */}
            {statsLoading ? (
                <div className="ca-loading" style={{ padding: '40px 0' }}>
                    <Loader2 size={32} className="ca-spin" />
                    <span>Yuklanmoqda...</span>
                </div>
            ) : (
                <div className="ca-stats-grid">
                    {STAT_CARDS.map((card, i) => (
                        <div key={i} className="ca-stat-card">
                            <div className="ca-stat-icon" style={{ background: card.bg, color: card.color }}>
                                {card.icon}
                            </div>
                            <div className="ca-stat-body">
                                <div className="ca-stat-value">{fmt(card.value)}</div>
                                <div className="ca-stat-label">{card.label}</div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* ─── Quick actions ─── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16, marginBottom: 28 }}>
                {[
                    {
                        icon: <Calendar size={20} />, label: 'Bronlar', sub: "Bemorlar bronlarini ko'ring", path: '/clinic/bookings', color: '#00C9A7', bg: 'rgba(0,201,167,0.1)'
                    },
                    { icon: <Briefcase size={20} />, label: 'Xizmatlar', sub: 'Xizmatlarni faollashtiring', path: '/clinic/services', color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)' },
                    { icon: <Users size={20} />, label: 'Xodimlar', sub: 'Shifokorlarni boshqaring', path: '/clinic/staff', color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
                    { icon: <Activity size={20} />, label: 'Profil', sub: 'Klinika ma\'lumotlari', path: '/clinic/profile', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
                ].map((item, i) => (
                    <div
                        key={i}
                        className="ca-card"
                        onClick={() => navigate(item.path)}
                        style={{ cursor: 'pointer', gap: 14 }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                            <div
                                className="ca-stat-icon"
                                style={{ width: 44, height: 44, background: item.bg, color: item.color, borderRadius: 12 }}
                            >
                                {item.icon}
                            </div>
                            <div>
                                <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-main)' }}>{item.label}</div>
                                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{item.sub}</div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <ArrowRight size={16} color="var(--text-muted)" />
                        </div>
                    </div>
                ))}
            </div>

            {/* ─── Status breakdown ─── */}
            {stats && (
                <div className="ca-recent-section">
                    <div className="ca-recent-header">
                        <span className="ca-recent-title">Bronlar holati</span>
                        <button
                            className="ca-btn-secondary"
                            style={{ padding: '7px 14px', fontSize: 13 }}
                            onClick={() => navigate('/clinic/bookings')}
                        >
                            Barchasi <ArrowRight size={14} />
                        </button>
                    </div>
                    <div style={{ padding: '16px 20px', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                        {[
                            { label: 'Kutilmoqda', value: stats.pendingCount, cls: 'pending' },
                            { label: 'Tasdiqlangan', value: stats.confirmedCount, cls: 'confirmed' },
                            { label: 'Bajarilgan', value: stats.completedCount, cls: 'completed' },
                            { label: 'Bekor', value: stats.cancelledCount, cls: 'cancelled' },
                        ].map((s, i) => (
                            <div
                                key={i}
                                style={{
                                    flex: 1, minWidth: 120,
                                    padding: '14px 16px',
                                    borderRadius: 10,
                                    background: 'var(--hover-bg)',
                                    border: '1px solid var(--border-color)',
                                    textAlign: 'center',
                                    cursor: 'pointer',
                                }}
                                onClick={() => navigate(`/clinic/bookings?status=${s.cls.toUpperCase()}`)}
                            >
                                <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-main)', marginBottom: 4 }}>
                                    {s.value}
                                </div>
                                <span className={`ca-badge ${s.cls}`}>{s.label}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
