
import React from 'react';
import {
    Users, UserCheck, Building2, CalendarCheck,
    MoreHorizontal, Settings, CheckSquare, TrendingUp,
    Activity, Clock, Star,
} from 'lucide-react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar,
} from 'recharts';
import './Dashboard.css';

// ─── Static Data ──────────────────────────────────────────────────────────────

const activityData = [
    { name: 'Yan', bron: 45, bemorlar: 30 },
    { name: 'Fev', bron: 62, bemorlar: 45 },
    { name: 'Mar', bron: 48, bemorlar: 52 },
    { name: 'Apr', bron: 75, bemorlar: 38 },
    { name: 'May', bron: 58, bemorlar: 65 },
    { name: 'Iyn', bron: 70, bemorlar: 50 },
    { name: 'Iyl', bron: 82, bemorlar: 60 },
];

const serviceStats = [
    { label: 'Kardiologiya', value: 92 },
    { label: 'Ginekologiya', value: 88 },
    { label: 'Nevrologiya', value: 95 },
    { label: 'Stomatologiya', value: 78 },
    { label: 'Ortopediya', value: 85 },
    { label: 'Fizioterapiya', value: 97 },
];

const doctorsList = [
    { name: 'Dr. Danial Frankie', role: 'Kardiologiya', img: '/images/1751463932_img2.png', status: 'Mavjud' },
    { name: 'Dr. Kenneth Fong', role: 'Nevrologiya', img: '/images/1751463996_img4.png', status: 'Band' },
    { name: 'Dr. Nashid Martines', role: 'Pediatriya', img: '/images/1751463870_img1.png', status: 'Mavjud' },
    { name: 'Dr. Rihana Roy', role: 'Ginekologiya', img: '/images/1751463965_img3.png', status: 'Mavjud' },
];

const appointmentList = [
    { id: '01', name: 'Aziza Karimova', date: '20 Apr  10:30', age: 34, gender: 'Ayol', doctor: 'Dr. Danial', status: 'Tasdiqlangan' },
    { id: '02', name: 'Bobur Toshmatov', date: '20 Apr  11:00', age: 28, gender: 'Erkak', doctor: 'Dr. Kenneth', status: 'Kutilmoqda' },
    { id: '03', name: 'Dilnoza Yusupova', date: '21 Apr  09:30', age: 45, gender: 'Ayol', doctor: 'Dr. Rihana', status: 'Tasdiqlangan' },
    { id: '04', name: 'Jasur Mirzaev', date: '21 Apr  14:00', age: 31, gender: 'Erkak', doctor: 'Dr. Nashid', status: 'Bekor qilindi' },
];

const STATUS_COLOR = {
    'Tasdiqlangan': '#22c55e',
    'Kutilmoqda': '#f59e0b',
    'Bekor qilindi': '#ef4444',
};

// ─── Sub-Components ───────────────────────────────────────────────────────────

const WelcomeBanner = () => (
    <div className="welcome-section">
        <div className="welcome-banner">
            <div className="welcome-content">
                <p className="welcome-sub">Xush kelibsiz 👋</p>
                <h1>BANISA Super Admin</h1>
                <p>Barcha klinikalar, bronlar va foydalanuvchilarni shu yerdan boshqaring.</p>
            </div>
            <div className="welcome-illustration">
                <img src="/images/1752040923.img1.webp" alt="Doctor" className="welcome-doctor-img" />
            </div>
        </div>
        <div className="mini-stats-panel">
            <div className="mini-stat">
                <h2 className="text-info">48</h2>
                <span>Yangi Bronlar</span>
            </div>
            <div className="mini-stat">
                <h2 className="text-primary">125</h2>
                <span>Yangi Bemorlar</span>
            </div>
            <div className="mini-stat">
                <h2 className="text-danger">7</h2>
                <span>Kutilayotgan</span>
            </div>
        </div>
    </div>
);

const InfoCard = ({ title, value, icon, color, subText }) => (
    <div className="card info-card">
        <div className={`icon-wrapper bg-${color}-soft`}>{icon}</div>
        <div className="info-content">
            <span className="info-title">{title}</span>
            <h3 className="info-value">{value}</h3>
            {subText && <span className="info-sub">{subText}</span>}
        </div>
        <div className="card-illustration">
            {React.cloneElement(icon, { size: 60, strokeWidth: 1, opacity: 0.07 })}
        </div>
    </div>
);

const ActivityChart = () => (
    <div className="card activity-card">
        <div className="card-header">
            <h3 className="card-title">Faollik grafigi</h3>
            <div className="chart-legend">
                <span className="dot dot-primary" /> Bronlar
                <span className="dot dot-secondary" /> Bemorlar
            </div>
        </div>
        <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={activityData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <defs>
                    <linearGradient id="gBron" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#1dbfc1" stopOpacity={0.18} />
                        <stop offset="95%" stopColor="#1dbfc1" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gBemor" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.18} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
                <Tooltip
                    contentStyle={{ background: 'var(--bg-card)', borderRadius: 10, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.12)' }}
                    itemStyle={{ color: 'var(--text-main)' }}
                />
                <Area type="monotone" dataKey="bron" stroke="#1dbfc1" strokeWidth={2.5} fill="url(#gBron)" />
                <Area type="monotone" dataKey="bemorlar" stroke="#6366f1" strokeWidth={2.5} fill="url(#gBemor)" />
            </AreaChart>
        </ResponsiveContainer>
    </div>
);

const ServiceStats = () => (
    <div className="card success-stats-card">
        <div className="card-header">
            <h3 className="card-title">Xizmat samaradorligi</h3>
            <span className="date-badge">2025</span>
        </div>
        <div className="stats-list">
            {serviceStats.map((s, i) => (
                <div key={i} className="stat-item">
                    <div className="stat-label">
                        <span>{s.label}</span>
                        <span className="stat-val">{s.value}%</span>
                    </div>
                    <div className="progress-bar-bg">
                        <div className="progress-bar bg-info" style={{ width: `${s.value}%` }} />
                    </div>
                </div>
            ))}
        </div>
    </div>
);

const DoctorList = () => (
    <div className="card doctor-list-card">
        <div className="card-header">
            <h3 className="card-title">Shifokorlar</h3>
            <button className="btn-icon"><MoreHorizontal size={20} /></button>
        </div>
        <div className="doctors-grid">
            {doctorsList.map((doc, i) => (
                <div key={i} className="doctor-item">
                    <img src={doc.img} alt={doc.name} className="doc-img" />
                    <div className="doc-info">
                        <h4>{doc.name}</h4>
                        <p>{doc.role}</p>
                    </div>
                    <span className={`doc-status ${doc.status === 'Mavjud' ? 'status-available' : 'status-busy'}`}>
                        {doc.status}
                    </span>
                </div>
            ))}
        </div>
    </div>
);

const AppointmentTable = () => (
    <div className="card appointment-card">
        <div className="card-header">
            <h3 className="card-title">So'nggi bronlar</h3>
            <a href="/admin/clinics" className="btn-link">Barchasini ko'rish</a>
        </div>
        <div className="table-responsive">
            <table className="table">
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Bemor</th>
                        <th>Sana va vaqt</th>
                        <th>Yosh</th>
                        <th>Jins</th>
                        <th>Shifokor</th>
                        <th>Holat</th>
                    </tr>
                </thead>
                <tbody>
                    {appointmentList.map((apt) => (
                        <tr key={apt.id}>
                            <td>{apt.id}</td>
                            <td><strong>{apt.name}</strong></td>
                            <td><Clock size={12} style={{ marginRight: 4, opacity: 0.5 }} />{apt.date}</td>
                            <td>{apt.age}</td>
                            <td>{apt.gender}</td>
                            <td>{apt.doctor}</td>
                            <td>
                                <span className="status-badge" style={{ background: STATUS_COLOR[apt.status] + '22', color: STATUS_COLOR[apt.status] }}>
                                    {apt.status}
                                </span>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div>
);

// ─── Main Dashboard ───────────────────────────────────────────────────────────

const Dashboard = () => (
    <div className="dashboard-grid">
        <WelcomeBanner />

        <div className="info-cards-grid">
            <InfoCard title="Jami Bemorlar" value="2,415" icon={<Users size={24} className="text-danger" />} color="danger" subText="+12% bu oy" />
            <InfoCard title="Jami Klinikalar" value="38" icon={<Building2 size={24} className="text-warning" />} color="warning" subText="4 ta yangi" />
            <InfoCard title="Faol Bronlar" value="186" icon={<CalendarCheck size={24} className="text-info" />} color="info" subText="Bugun" />
            <InfoCard title="Shifokolar" value="214" icon={<UserCheck size={24} className="text-primary" />} color="primary" subText="Barcha filiallar" />
        </div>

        <div className="charts-grid">
            <ActivityChart />
            <ServiceStats />
        </div>

        <div className="lists-grid">
            <DoctorList />
            <AppointmentTable />
        </div>
    </div>
);

export default Dashboard;
