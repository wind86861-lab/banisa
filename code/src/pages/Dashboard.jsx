
import React, { useState, useEffect } from 'react';
import {
    Users, Activity, DollarSign, Briefcase,
    TrendingUp, TrendingDown, MoreHorizontal, Settings,
    Calendar, MapPin, UserCheck, Heart, Bell, CheckSquare,
    Home, Truck, Monitor, Building2, Loader2
} from 'lucide-react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { useAuth } from '../shared/auth/AuthContext';
import api from '../shared/api/axios';
import './Dashboard.css';


// --- Sub-Components ---

const WelcomeBanner = ({ user, stats }) => (
    <div className="welcome-section">
        <div className="welcome-banner">
            <div className="welcome-content">
                <h1>Hello {user?.firstName || 'Admin'}!</h1>
                <p>Welcome to Banisa Medical Platform Dashboard.<br />Monitor and manage all clinics, services, and appointments.</p>
            </div>
            <div className="welcome-illustration">
                {/* CSS-based simple representation of medical staff or placeholder */}
                <div className="illustration-placeholder">
                    👨‍⚕️ 👩‍⚕️ 👨‍⚕️
                </div>
            </div>
        </div>
        <div className="mini-stats-panel">
            <div className="mini-stat">
                <h2 className="text-info">{stats?.totals?.clinics || 0}</h2>
                <span>Total Clinics</span>
            </div>
            <div className="mini-stat">
                <h2 className="text-primary">{stats?.totals?.users || 0}</h2>
                <span>Total Users</span>
            </div>
            <div className="mini-stat">
                <h2 className="text-danger">{stats?.totals?.appointments || 0}</h2>
                <span>Appointments</span>
            </div>
        </div>
    </div>
);

const InfoCard = ({ title, value, icon, color, subText }) => (
    <div className="card info-card">
        <div className={`icon-wrapper bg-${color}-soft`}>
            {icon}
        </div>
        <div className="info-content">
            <span className="info-title">{title}</span>
            <h3 className="info-value">{value}</h3>
            {subText && <span className="info-sub">{subText}</span>}
        </div>
        <div className="card-illustration">
            {/* Decorative background icon */}
            {React.cloneElement(icon, { size: 60, strokeWidth: 1, opacity: 0.1 })}
        </div>
    </div>
);

const ActivityChart = ({ data }) => (
    <div className="card activity-card">
        <div className="card-header">
            <h3 className="card-title">Activity</h3>
            <div className="chart-legend">
                <span className="dot dot-primary"></span> Appointments
                <span className="dot dot-secondary"></span> Patients
                <span className="period-select">Last 6 Month ▼</span>
            </div>
        </div>
        <div className="chart-container" style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={data || []} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                        <linearGradient id="colorConsultation" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.1} />
                            <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorPatients" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="var(--color-secondary)" stopOpacity={0.1} />
                            <stop offset="95%" stopColor="var(--color-secondary)" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)' }} />
                    <Tooltip
                        contentStyle={{ backgroundColor: 'var(--bg-card)', borderRadius: '10px', border: 'none', boxShadow: '0 5px 15px rgba(0,0,0,0.1)' }}
                        itemStyle={{ color: 'var(--text-main)' }}
                    />
                    <Area
                        type="monotone"
                        dataKey="appointments"
                        stroke="var(--color-primary)"
                        strokeWidth={3}
                        fillOpacity={1}
                        fill="url(#colorConsultation)"
                    />
                    <Area
                        type="monotone"
                        dataKey="patients"
                        stroke="var(--color-secondary)"
                        strokeWidth={3}
                        fillOpacity={1}
                        fill="url(#colorPatients)"
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    </div>
);

const SuccessStats = ({ services }) => (
    <div className="card success-stats-card">
        <div className="card-header">
            <h3 className="card-title">Success Stats</h3>
            <span className="date-badge">May 2024</span>
        </div>
        <div className="stats-list">
            <div className="stat-item">
                <div className="stat-label">
                    <span>Diagnostic Services</span>
                    <span className="stat-val">{services?.diagnostic || 0}</span>
                </div>
                <div className="progress-bar-bg">
                    <div className="progress-bar bg-info" style={{ width: '100%' }}></div>
                </div>
            </div>
            <div className="stat-item">
                <div className="stat-label">
                    <span>Surgical Services</span>
                    <span className="stat-val">{services?.surgical || 0}</span>
                </div>
                <div className="progress-bar-bg">
                    <div className="progress-bar bg-info" style={{ width: '100%' }}></div>
                </div>
            </div>
            <div className="stat-item">
                <div className="stat-label">
                    <span>Sanatorium Services</span>
                    <span className="stat-val">{services?.sanatorium || 0}</span>
                </div>
                <div className="progress-bar-bg">
                    <div className="progress-bar bg-info" style={{ width: '100%' }}></div>
                </div>
            </div>
        </div>
    </div>
);

const ServiceStats = ({ services }) => (
    <div className="card doctor-list-card">
        <div className="card-header">
            <h3 className="card-title">Service Overview</h3>
        </div>
        <div className="stats-list" style={{ padding: '20px' }}>
            <div className="stat-item">
                <div className="stat-label">
                    <span>🔬 Diagnostics</span>
                    <span className="stat-val">{services?.diagnostic || 0}</span>
                </div>
            </div>
            <div className="stat-item">
                <div className="stat-label">
                    <span>🏥 Surgical</span>
                    <span className="stat-val">{services?.surgical || 0}</span>
                </div>
            </div>
            <div className="stat-item">
                <div className="stat-label">
                    <span>🌿 Sanatorium</span>
                    <span className="stat-val">{services?.sanatorium || 0}</span>
                </div>
            </div>
        </div>
    </div>
);

const AppointmentTable = ({ appointments }) => (
    <div className="card appointment-card">
        <div className="card-header">
            <h3 className="card-title">Online Appointment</h3>
            <a href="#" className="btn-link">View All</a>
        </div>
        <div className="table-responsive">
            <table className="table">
                <thead>
                    <tr>
                        <th>No.</th>
                        <th>Name</th>
                        <th>Date & Time</th>
                        <th>Age</th>
                        <th>Gender</th>
                        <th>Appoint for</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody>
                    {appointments && appointments.length > 0 ? (
                        appointments.slice(0, 5).map((apt, idx) => (
                            <tr key={apt.id}>
                                <td>{idx + 1}</td>
                                <td>{apt.patientName}</td>
                                <td>{new Date(apt.date).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</td>
                                <td>-</td>
                                <td>-</td>
                                <td>{apt.clinicName}</td>
                                <td>
                                    <span className={`status-badge ${apt.status.toLowerCase()}`}>{apt.status}</span>
                                </td>
                            </tr>
                        ))
                    ) : (
                        <tr>
                            <td colSpan="7" style={{ textAlign: 'center', padding: '20px' }}>No appointments yet</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    </div>
);

const Dashboard = () => {
    const { user } = useAuth();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const { data } = await api.get('/admin/dashboard/stats');
                setStats(data.data);
            } catch (error) {
                console.error('Failed to fetch dashboard stats:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
                <Loader2 size={40} className="spin" style={{ color: 'var(--color-primary)' }} />
            </div>
        );
    }

    return (
        <div className="dashboard-grid">
            {/* Row 1: Banner & Mini Stats */}
            <WelcomeBanner user={user} stats={stats} />

            {/* Row 2: Main Info Cards */}
            <div className="info-cards-grid">
                <InfoCard
                    title="Total Clinics"
                    value={stats?.totals?.clinics || 0}
                    icon={<Building2 size={24} className="text-danger" />}
                    color="danger"
                />
                <InfoCard
                    title="Total Users"
                    value={stats?.totals?.users || 0}
                    icon={<Users size={24} className="text-warning" />}
                    color="warning"
                />
                <InfoCard
                    title="Total Services"
                    value={stats?.totals?.services || 0}
                    icon={<Briefcase size={24} className="text-info" />}
                    color="info"
                />
                <InfoCard
                    title="Total Appointments"
                    value={stats?.totals?.appointments || 0}
                    icon={<Calendar size={24} className="text-primary" />}
                    color="primary"
                />
            </div>

            {/* Row 3: Activity Chart & Success Stats */}
            <div className="charts-grid">
                <ActivityChart data={stats?.monthlyActivity} />
                <SuccessStats services={stats?.services} />
            </div>

            {/* Row 4: Lists */}
            <div className="lists-grid">
                <ServiceStats services={stats?.services} />
                <AppointmentTable appointments={stats?.recentAppointments} />
            </div>
        </div>
    );
};

export default Dashboard;
