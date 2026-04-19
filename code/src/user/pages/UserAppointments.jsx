import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Calendar, Clock, User, ChevronRight, ArrowRight } from 'lucide-react';
import api from '../../shared/api/axios';
import TopBar from '../../pages/home/TopBar';
import Navigation from '../../pages/home/Navigation';
import Footer from '../../pages/home/Footer';
import './css/UserAppointments.css';

export default function UserAppointments() {
    const [statusFilter, setStatusFilter] = useState('all');
    const [page, setPage] = useState(1);

    const { data, isLoading } = useQuery({
        queryKey: ['user', 'appointments', statusFilter, page],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (statusFilter !== 'all') params.set('status', statusFilter);
            params.set('page', page.toString());
            params.set('limit', '10');

            const res = await api.get(`/user/appointments?${params}`);
            return res.data;
        },
    });

    const appointments = data?.data || [];
    const meta = data?.meta || {};

    const getStatusBadge = (status) => {
        const badges = {
            PENDING: { bg: '#FEF3C7', color: '#D97706', text: 'Operator kutmoqda' },
            OPERATOR_CONFIRMED: { bg: '#DBEAFE', color: '#1D4ED8', text: 'Tasdiqlangan' },
            SENT_TO_CLINIC: { bg: '#DBEAFE', color: '#1D4ED8', text: 'Klinikada' },
            CLINIC_ACCEPTED: { bg: '#D1FAE5', color: '#059669', text: 'Qabul qilindi' },
            PAID: { bg: '#D1FAE5', color: '#059669', text: 'To\'langan' },
            CHECKED_IN: { bg: '#EDE9FE', color: '#7C3AED', text: 'Keldi' },
            IN_PROGRESS: { bg: '#EDE9FE', color: '#7C3AED', text: 'Jarayonda' },
            CONFIRMED: { bg: '#DBEAFE', color: '#1D4ED8', text: 'Tasdiqlangan' },
            COMPLETED: { bg: '#D1FAE5', color: '#065F46', text: 'Yakunlangan' },
            CANCELLED: { bg: '#FEE2E2', color: '#991B1B', text: 'Bekor qilingan' },
            NO_SHOW: { bg: '#FEE2E2', color: '#991B1B', text: 'Kelmadi' },
            RESCHEDULED: { bg: '#FEF3C7', color: '#D97706', text: 'O\'zgartirildi' },
        };
        return badges[status] || badges.PENDING;
    };

    const filters = [
        { value: 'all', label: 'Barchasi' },
        { value: 'PENDING', label: 'Kutilmoqda' },
        { value: 'CONFIRMED', label: 'Tasdiqlangan' },
        { value: 'COMPLETED', label: 'Yakunlangan' },
        { value: 'CANCELLED', label: 'Bekor qilingan' },
    ];

    return (
        <div className="home-page">
            <TopBar />
            <Navigation />
            <main className="home-container ua-main">
                {/* Breadcrumb */}
                <div className="ua-breadcrumb">
                    <Link to="/user/dashboard">Dashboard</Link>
                    <ChevronRight size={16} />
                    <span>Uchrashuvlar</span>
                </div>

                {/* Page Header */}
                <h1 className="ua-title">Mening uchrashuvlarim</h1>
                <p className="ua-subtitle">Barcha uchrashuvlar va ularning holati</p>

                {/* Filter Tabs */}
                <div className="ua-filters">
                    {filters.map(filter => (
                        <button
                            key={filter.value}
                            onClick={() => { setStatusFilter(filter.value); setPage(1); }}
                            className={`ua-filter-btn ${statusFilter === filter.value ? 'active' : ''}`}
                        >
                            {filter.label}
                        </button>
                    ))}
                </div>

                {/* Appointments List */}
                {isLoading ? (
                    <div className="ua-loading">
                        <p>Yuklanmoqda...</p>
                    </div>
                ) : appointments.length === 0 ? (
                    <div className="ua-empty">
                        <Calendar size={80} className="ua-empty-icon" />
                        <h3>Uchrashuvlar topilmadi</h3>
                        <p>Hali bronlar yo'q</p>
                        <Link to="/xizmatlar" className="ua-empty-btn">
                            Xizmat qidirish <ArrowRight size={16} />
                        </Link>
                    </div>
                ) : (
                    <div className="ua-list">
                        {appointments.map(appointment => {
                            const badge = getStatusBadge(appointment.status);
                            const date = new Date(appointment.scheduledAt);
                            return (
                                <div key={appointment.id} className="ua-card">
                                    {/* Date Block */}
                                    <div className="ua-date">
                                        <div className="ua-date-day">{date.getDate()}</div>
                                        <div className="ua-date-month">
                                            {date.toLocaleDateString('uz-UZ', { month: 'short' })}
                                        </div>
                                    </div>

                                    {/* Details */}
                                    <div className="ua-details">
                                        <div className="ua-details-header">
                                            <h3>{appointment.clinic?.nameUz || 'Klinika'}</h3>
                                            <span className="ua-badge" style={{ backgroundColor: badge.bg, color: badge.color }}>
                                                {badge.text}
                                            </span>
                                        </div>
                                        <div className="ua-details-info">
                                            <div className="ua-info-item">
                                                <Clock size={14} />
                                                {date.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                            {appointment.doctor && (
                                                <div className="ua-info-item">
                                                    <User size={14} />
                                                    {appointment.doctor.firstName} {appointment.doctor.lastName}
                                                </div>
                                            )}
                                            {appointment.serviceType && (
                                                <span className="ua-service-tag">{appointment.serviceType}</span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Price & Action */}
                                    <div className="ua-price">
                                        <div className="ua-price-amount">
                                            {(appointment.finalPrice || appointment.price)?.toLocaleString('uz-UZ')} so'm
                                        </div>
                                        <Link to={`/user/appointments/${appointment.id}`} className="ua-details-btn">
                                            Batafsil
                                        </Link>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Pagination */}
                {meta.totalPages > 1 && (
                    <div className="ua-pagination">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="ua-page-btn"
                        >
                            Oldingi
                        </button>
                        <span className="ua-page-info">{page} / {meta.totalPages}</span>
                        <button
                            onClick={() => setPage(p => Math.min(meta.totalPages, p + 1))}
                            disabled={page === meta.totalPages}
                            className="ua-page-btn"
                        >
                            Keyingi
                        </button>
                    </div>
                )}
            </main>
            <Footer />
        </div>
    );
}
