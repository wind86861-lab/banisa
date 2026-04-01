import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { User, Calendar, Heart, Grid, Clock, Star, ArrowRight, LogOut } from 'lucide-react';
import { useUserAuth } from '../../shared/auth/UserAuthContext';
import api from '../../shared/api/axios';
import TopBar from '../../pages/home/TopBar';
import Navigation from '../../pages/home/Navigation';
import Footer from '../../pages/home/Footer';
import './css/UserDashboard.css';

export default function UserDashboard() {
    const { user, logout } = useUserAuth();

    const { data: appointments = [] } = useQuery({
        queryKey: ['user', 'appointments'],
        queryFn: async () => {
            const res = await api.get('/user/appointments');
            return res.data.data || [];
        },
    });

    const { data: reviews = [] } = useQuery({
        queryKey: ['user', 'reviews'],
        queryFn: async () => {
            const res = await api.get('/user/reviews');
            return res.data.data || [];
        },
    });

    const stats = [
        { label: 'Jami bronlar', value: appointments.length, icon: Calendar, color: '#00BDE0' },
        { label: 'Faol bronlar', value: appointments.filter(a => a.status === 'PENDING' || a.status === 'CONFIRMED').length, icon: Clock, color: '#3B82F6' },
        { label: 'Sharhlarim', value: reviews.length, icon: Star, color: '#F59E0B' },
        { label: 'Sevimlilar', value: 0, icon: Heart, color: '#EC4899' },
    ];

    const quickActions = [
        { title: 'Profilim', subtitle: 'Shaxsiy ma\'lumotlarni tahrirlash', icon: User, to: '/user/profile', bgColor: '#EFF6FF', iconColor: '#2563EB' },
        { title: 'Uchrashuvlarim', subtitle: 'Navbat va uchrashuvlar tarixi', icon: Calendar, to: '/user/appointments', bgColor: '#F0FDF4', iconColor: '#16A34A' },
        { title: 'Sevimlilar', subtitle: 'Saqlangan xizmatlar', icon: Heart, to: '/user/favorites', bgColor: '#FFF1F2', iconColor: '#E11D48' },
        { title: 'Xizmatlar', subtitle: 'Xizmatlarni ko\'rish', icon: Grid, to: '/xizmatlar', bgColor: '#FFF7ED', iconColor: '#EA580C' },
    ];

    const recentAppointments = appointments.slice(0, 3);

    const getStatusBadge = (status) => {
        const badges = {
            PENDING: { bg: '#FEF3C7', color: '#D97706', text: 'Kutilmoqda' },
            CONFIRMED: { bg: '#DBEAFE', color: '#1D4ED8', text: 'Tasdiqlangan' },
            COMPLETED: { bg: '#D1FAE5', color: '#065F46', text: 'Yakunlangan' },
            CANCELLED: { bg: '#FEE2E2', color: '#991B1B', text: 'Bekor qilingan' },
        };
        return badges[status] || badges.PENDING;
    };

    return (
        <div className="home-page">
            <TopBar />
            <Navigation />
            <main className="home-container ud-main">
                {/* Hero Banner */}
                <div className="ud-hero">
                    <div className="ud-hero-content">
                        <h1>Xush kelibsiz, {user?.firstName || 'Foydalanuvchi'}!</h1>
                        <p>Sog'ligingizni boshqaring</p>
                    </div>
                    <div className="ud-hero-avatar">
                        {user?.firstName?.[0]?.toUpperCase() || 'U'}
                    </div>
                    <div className="ud-hero-circle ud-hero-circle-1"></div>
                    <div className="ud-hero-circle ud-hero-circle-2"></div>
                    <div className="ud-hero-circle ud-hero-circle-3"></div>
                </div>

                {/* Stats Row */}
                <div className="ud-stats">
                    {stats.map((stat, idx) => {
                        const Icon = stat.icon;
                        return (
                            <div key={idx} className="ud-stat-card">
                                <div className="ud-stat-icon" style={{ color: stat.color }}>
                                    <Icon size={24} />
                                </div>
                                <div className="ud-stat-info">
                                    <div className="ud-stat-value">{stat.value}</div>
                                    <div className="ud-stat-label">{stat.label}</div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Quick Actions */}
                <div className="ud-actions">
                    {quickActions.map((action, idx) => {
                        const Icon = action.icon;
                        return (
                            <Link key={idx} to={action.to} className="ud-action-card">
                                <div className="ud-action-icon" style={{ backgroundColor: action.bgColor }}>
                                    <Icon size={28} style={{ color: action.iconColor }} />
                                </div>
                                <div className="ud-action-content">
                                    <h3>{action.title}</h3>
                                    <p>{action.subtitle}</p>
                                </div>
                                <ArrowRight size={20} className="ud-action-arrow" />
                            </Link>
                        );
                    })}
                </div>

                {/* Recent Appointments */}
                <div className="ud-recent">
                    <div className="ud-recent-header">
                        <h2>So'nggi uchrashuvlar</h2>
                        <Link to="/user/appointments" className="ud-recent-link">
                            Barchasini ko'rish <ArrowRight size={16} />
                        </Link>
                    </div>
                    {recentAppointments.length > 0 ? (
                        <div className="ud-recent-list">
                            {recentAppointments.map((apt) => {
                                const badge = getStatusBadge(apt.status);
                                return (
                                    <div key={apt.id} className="ud-recent-item">
                                        <div className="ud-recent-clinic">
                                            <div className="ud-recent-logo">
                                                {apt.clinic?.name?.[0] || 'K'}
                                            </div>
                                            <div>
                                                <div className="ud-recent-name">{apt.clinic?.name || 'Klinika'}</div>
                                                <div className="ud-recent-date">
                                                    {new Date(apt.appointmentDate).toLocaleDateString('uz-UZ')}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="ud-recent-badge" style={{ backgroundColor: badge.bg, color: badge.color }}>
                                            {badge.text}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="ud-empty">
                            <Calendar size={64} className="ud-empty-icon" />
                            <h3>Hali bronlar yo'q</h3>
                            <p>Xizmatlarni ko'ring va bron qiling</p>
                            <Link to="/xizmatlar" className="ud-empty-btn">
                                Xizmat qidirish <ArrowRight size={16} />
                            </Link>
                        </div>
                    )}
                </div>

                {/* Logout Button */}
                <button className="ud-logout" onClick={logout}>
                    <LogOut size={18} />
                    Tizimdan chiqish
                </button>
            </main>
            <Footer />
        </div>
    );
}
