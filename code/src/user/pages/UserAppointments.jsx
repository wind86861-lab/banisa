import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Calendar, Clock, MapPin, User, Filter } from 'lucide-react';
import api from '../../shared/api/axios';

/**
 * User Appointments Page
 * Displays user's appointment history and upcoming appointments
 */
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
        const styles = {
            PENDING: { bg: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', label: 'Kutilmoqda' },
            CONFIRMED: { bg: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', label: 'Tasdiqlangan' },
            COMPLETED: { bg: 'rgba(16, 185, 129, 0.1)', color: '#10b981', label: 'Yakunlangan' },
            CANCELLED: { bg: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', label: 'Bekor qilingan' },
        };
        const style = styles[status] || styles.PENDING;
        return (
            <span style={{
                padding: '4px 12px',
                borderRadius: 12,
                fontSize: 12,
                fontWeight: 500,
                background: style.bg,
                color: style.color,
            }}>
                {style.label}
            </span>
        );
    };

    return (
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: 20 }}>
            {/* Header */}
            <div style={{ marginBottom: 24 }}>
                <h1 style={{ margin: '0 0 8px', fontSize: 28, fontWeight: 700 }}>
                    Mening uchrashuvlarim
                </h1>
                <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 14 }}>
                    Barcha uchrashuvlar va ularning holati
                </p>
            </div>

            {/* Filters */}
            <div style={{
                background: 'var(--bg-card)',
                borderRadius: 12,
                padding: 16,
                marginBottom: 20,
                display: 'flex',
                alignItems: 'center',
                gap: 12,
            }}>
                <Filter size={18} color="var(--text-muted)" />
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {[
                        { value: 'all', label: 'Barchasi' },
                        { value: 'PENDING', label: 'Kutilmoqda' },
                        { value: 'CONFIRMED', label: 'Tasdiqlangan' },
                        { value: 'COMPLETED', label: 'Yakunlangan' },
                        { value: 'CANCELLED', label: 'Bekor qilingan' },
                    ].map(filter => (
                        <button
                            key={filter.value}
                            onClick={() => { setStatusFilter(filter.value); setPage(1); }}
                            style={{
                                padding: '6px 16px',
                                borderRadius: 8,
                                border: 'none',
                                background: statusFilter === filter.value ? 'var(--color-primary)' : 'var(--bg-main)',
                                color: statusFilter === filter.value ? 'white' : 'var(--text-main)',
                                cursor: 'pointer',
                                fontSize: 13,
                                fontWeight: 500,
                            }}
                        >
                            {filter.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Appointments List */}
            {isLoading ? (
                <div style={{ padding: 40, textAlign: 'center' }}>
                    <div className="spinner"></div>
                    <p>Yuklanmoqda...</p>
                </div>
            ) : appointments.length === 0 ? (
                <div style={{
                    background: 'var(--bg-card)',
                    borderRadius: 12,
                    padding: 60,
                    textAlign: 'center',
                }}>
                    <Calendar size={48} color="var(--text-muted)" style={{ margin: '0 auto 16px' }} />
                    <h3 style={{ margin: '0 0 8px', fontSize: 18 }}>Uchrashuvlar topilmadi</h3>
                    <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 14 }}>
                        Hozircha uchrashuvlar yo'q
                    </p>
                </div>
            ) : (
                <div style={{ display: 'grid', gap: 16 }}>
                    {appointments.map(appointment => (
                        <div
                            key={appointment.id}
                            style={{
                                background: 'var(--bg-card)',
                                borderRadius: 12,
                                padding: 20,
                                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                                display: 'grid',
                                gridTemplateColumns: 'auto 1fr auto',
                                gap: 20,
                                alignItems: 'center',
                            }}
                        >
                            {/* Date/Time */}
                            <div style={{
                                width: 80,
                                textAlign: 'center',
                                padding: 12,
                                borderRadius: 8,
                                background: 'var(--bg-main)',
                            }}>
                                <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--color-primary)' }}>
                                    {new Date(appointment.scheduledAt).getDate()}
                                </div>
                                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                    {new Date(appointment.scheduledAt).toLocaleDateString('uz-UZ', { month: 'short' })}
                                </div>
                            </div>

                            {/* Details */}
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>
                                        {appointment.clinic?.nameUz}
                                    </h3>
                                    {getStatusBadge(appointment.status)}
                                </div>
                                
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, fontSize: 13, color: 'var(--text-muted)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <Clock size={14} />
                                        {new Date(appointment.scheduledAt).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                    {appointment.doctor && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <User size={14} />
                                            {appointment.doctor.firstName} {appointment.doctor.lastName}
                                        </div>
                                    )}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <span style={{
                                            padding: '2px 8px',
                                            borderRadius: 4,
                                            fontSize: 11,
                                            background: 'rgba(139, 92, 246, 0.1)',
                                            color: '#8b5cf6',
                                        }}>
                                            {appointment.serviceType}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Price */}
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-primary)' }}>
                                    {appointment.price?.toLocaleString('uz-UZ')} so'm
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Pagination */}
            {meta.totalPages > 1 && (
                <div style={{
                    marginTop: 24,
                    display: 'flex',
                    justifyContent: 'center',
                    gap: 8,
                }}>
                    <button
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        style={{
                            padding: '8px 16px',
                            borderRadius: 8,
                            border: '1px solid var(--border-color)',
                            background: 'var(--bg-card)',
                            cursor: page === 1 ? 'not-allowed' : 'pointer',
                            opacity: page === 1 ? 0.5 : 1,
                        }}
                    >
                        Oldingi
                    </button>
                    <span style={{ padding: '8px 16px', fontSize: 14 }}>
                        {page} / {meta.totalPages}
                    </span>
                    <button
                        onClick={() => setPage(p => Math.min(meta.totalPages, p + 1))}
                        disabled={page === meta.totalPages}
                        style={{
                            padding: '8px 16px',
                            borderRadius: 8,
                            border: '1px solid var(--border-color)',
                            background: 'var(--bg-card)',
                            cursor: page === meta.totalPages ? 'not-allowed' : 'pointer',
                            opacity: page === meta.totalPages ? 0.5 : 1,
                        }}
                    >
                        Keyingi
                    </button>
                </div>
            )}
        </div>
    );
}
