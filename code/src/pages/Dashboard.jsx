
import React from 'react';
import {
    Users, Activity, DollarSign, Briefcase,
    TrendingUp, TrendingDown, MoreHorizontal, Settings,
    Calendar, MapPin, UserCheck, Heart, Bell, CheckSquare,
    Home, Truck, Monitor
} from 'lucide-react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import './Dashboard.css';

// --- Data ---
const activityData = [
    { name: 'Jan', consultation: 45, patients: 30 },
    { name: 'Feb', consultation: 52, patients: 35 },
    { name: 'Mar', consultation: 38, patients: 45 },
    { name: 'Apr', consultation: 65, patients: 32 },
    { name: 'May', consultation: 50, patients: 55 },
    { name: 'Jun', consultation: 58, patients: 40 },
    { name: 'Jul', consultation: 62, patients: 48 },
];

const successStatsData = [
    { label: 'Anesthetics', value: 80, color: 'info' },
    { label: 'Gynecology', value: 95, color: 'info' },
    { label: 'Nerology', value: 100, color: 'info' },
    { label: 'Oncology', value: 89, color: 'info' },
    { label: 'Orthopedics', value: 97, color: 'info' },
    { label: 'Physiotherapy', value: 100, color: 'info' },
];

const doctorsList = [
    { name: 'Dr. Jaylon Stanton', role: 'Dentist', img: 'https://randomuser.me/api/portraits/men/32.jpg', status: 'Available' },
    { name: 'Dr. Carla Schleifer', role: 'Ophthalmologist', img: 'https://randomuser.me/api/portraits/women/44.jpg', status: 'Busy' },
    { name: 'Dr. Roger Geidt', role: 'Pediatrician', img: 'https://randomuser.me/api/portraits/men/85.jpg', status: 'Available' },
];

const appointmentList = [
    { id: '01', name: 'Natiya', date: '20 May 5:30pm', age: 50, gender: 'Female', doctor: 'Dr. Lee', action: 'Edit' },
    { id: '02', name: 'John Deo', date: '21 May 3:00pm', age: 28, gender: 'Male', doctor: 'Dr. Mark', action: 'Edit' },
    { id: '03', name: 'Miya', date: '22 May 11:00am', age: 35, gender: 'Female', doctor: 'Dr. Sarah', action: 'Edit' },
];

// --- Sub-Components ---

const WelcomeBanner = () => (
    <div className="welcome-section">
        <div className="welcome-banner">
            <div className="welcome-content">
                <h1>Hello Jhon!</h1>
                <p>Here are your important task, Updates and alerts.<br />You can set your in app preferences here.</p>
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
                <h2 className="text-info">30</h2>
                <span>New Tasks</span>
            </div>
            <div className="mini-stat">
                <h2 className="text-primary">50</h2>
                <span>New Patients</span>
            </div>
            <div className="mini-stat">
                <h2 className="text-danger">25</h2>
                <span>Notification</span>
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

const ActivityChart = () => (
    <div className="card activity-card">
        <div className="card-header">
            <h3 className="card-title">Activity</h3>
            <div className="chart-legend">
                <span className="dot dot-primary"></span> Consultation
                <span className="dot dot-secondary"></span> Patients
                <span className="period-select">Last 6 Month ▼</span>
            </div>
        </div>
        <div className="chart-container" style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={activityData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
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
                        dataKey="consultation"
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

const SuccessStats = () => (
    <div className="card success-stats-card">
        <div className="card-header">
            <h3 className="card-title">Success Stats</h3>
            <span className="date-badge">May 2024</span>
        </div>
        <div className="stats-list">
            {successStatsData.map((stat, idx) => (
                <div key={idx} className="stat-item">
                    <div className="stat-label">
                        <span>{stat.label}</span>
                        <span className="stat-val">{stat.value}%</span>
                    </div>
                    <div className="progress-bar-bg">
                        <div
                            className={`progress-bar bg-${stat.color}`}
                            style={{ width: `${stat.value}%` }}
                        ></div>
                    </div>
                </div>
            ))}
        </div>
    </div>
);

const DoctorList = () => (
    <div className="card doctor-list-card">
        <div className="card-header">
            <h3 className="card-title">Doctor List</h3>
            <button className="btn-icon"><MoreHorizontal size={20} /></button>
        </div>
        <div className="doctors-grid">
            {doctorsList.map((doc, idx) => (
                <div key={idx} className="doctor-item">
                    <img src={doc.img} alt={doc.name} className="doc-img" />
                    <div className="doc-info">
                        <h4>{doc.name}</h4>
                        <p>{doc.role}</p>
                    </div>
                    <button className="btn-icon"><MoreHorizontal size={16} /></button>
                </div>
            ))}
        </div>
    </div>
);

const AppointmentTable = () => (
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
                    {appointmentList.map((apt, idx) => (
                        <tr key={idx}>
                            <td>{apt.id}</td>
                            <td>{apt.name}</td>
                            <td>{apt.date}</td>
                            <td>{apt.age}</td>
                            <td>{apt.gender}</td>
                            <td>{apt.doctor}</td>
                            <td>
                                <div className="action-buttons">
                                    <button className="btn-icon btn-edit"><CheckSquare size={16} /></button>
                                    <button className="btn-icon btn-action"><Settings size={16} /></button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div>
);

const Dashboard = () => {
    return (
        <div className="dashboard-grid">
            {/* Row 1: Banner & Mini Stats */}
            <WelcomeBanner />

            {/* Row 2: Main Info Cards */}
            <div className="info-cards-grid">
                <InfoCard
                    title="Total Patients"
                    value="2,015"
                    icon={<Users size={24} className="text-danger" />}
                    color="danger"
                />
                <InfoCard
                    title="Total Staffs"
                    value="550"
                    icon={<UserCheck size={24} className="text-warning" />}
                    color="warning"
                />
                <InfoCard
                    title="Total Rooms"
                    value="2000"
                    icon={<Home size={24} className="text-info" />}
                    color="info"
                />
                <InfoCard
                    title="Total Cars"
                    value="50"
                    icon={<Truck size={24} className="text-primary" />}
                    color="primary"
                />
            </div>

            {/* Row 3: Activity Chart & Success Stats */}
            <div className="charts-grid">
                <ActivityChart />
                <SuccessStats />
            </div>

            {/* Row 4: Lists */}
            <div className="lists-grid">
                <DoctorList />
                <AppointmentTable />
            </div>
        </div>
    );
};

export default Dashboard;
