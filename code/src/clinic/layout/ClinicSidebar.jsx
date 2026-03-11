import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Home, Briefcase, Calendar, Tag,
    Building2, Users, BarChart2,
    LogOut, ChevronDown, Activity,
} from 'lucide-react';
import { useAuth } from '../../shared/auth/AuthContext';
import '../../components/Sidebar.css';
import './ClinicSidebar.css';

const NAV_GROUPS = [
    {
        title: 'ASOSIY',
        items: [
            { key: 'dashboard',  label: 'Dashboard',        path: '/clinic/dashboard',  icon: <Home size={20} /> },
            { key: 'services',   label: 'Xizmatlar',        path: '/clinic/services',   icon: <Briefcase size={20} /> },
            { key: 'bookings',   label: 'Bronlar',           path: '/clinic/bookings',   icon: <Calendar size={20} /> },
            { key: 'discounts',  label: 'Chegirmalar',       path: '/clinic/discounts',  icon: <Tag size={20} /> },
        ],
    },
    {
        title: 'BOSHQARUV',
        items: [
            { key: 'profile',    label: 'Klinika Profili',  path: '/clinic/profile',    icon: <Building2 size={20} /> },
            { key: 'staff',      label: 'Xodimlar',         path: '/clinic/staff',      icon: <Users size={20} /> },
            { key: 'reports',    label: 'Hisobotlar',        path: '/clinic/reports',    icon: <BarChart2 size={20} /> },
        ],
    },
];

export default function ClinicSidebar({ isOpen, toggleSidebar }) {
    const navigate  = useNavigate();
    const location  = useLocation();
    const { user, logout } = useAuth();

    const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    const clinicName = user?.clinicName || 'Klinika Paneli';
    const userFullName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : '';

    return (
        <aside className={`sidebar clinic-sidebar ${!isOpen ? 'closed' : ''}`}>

            {/* ─── Header / Branding ─── */}
            <div className="sidebar-header">
                <a href="/clinic/dashboard" className="logo">
                    <div className="logo-icon" style={{ fontSize: 16 }}>
                        <Activity size={20} />
                    </div>
                    {isOpen && <span>Banisa Clinic</span>}
                </a>
            </div>

            {/* ─── Clinic Info Badge (only when open) ─── */}
            {isOpen && user && (
                <div className="clinic-badge">
                    <div className="clinic-badge-name">{clinicName}</div>
                    <div className="clinic-badge-status">
                        <span className="status-dot" />
                        Faol klinika
                    </div>
                </div>
            )}

            {/* ─── Navigation ─── */}
            <div className="sidebar-content">
                <nav className="sidebar-nav">
                    {NAV_GROUPS.map((group, gi) => (
                        <div key={gi} className="nav-section">
                            {group.title && isOpen && (
                                <h3 className="section-title">{group.title}</h3>
                            )}
                            <ul>
                                {group.items.map((item) => (
                                    <li key={item.key} className="nav-item">
                                        <a
                                            href="#"
                                            className={`nav-link ${isActive(item.path) ? 'active' : ''}`}
                                            onClick={(e) => { e.preventDefault(); navigate(item.path); }}
                                            title={!isOpen ? item.label : undefined}
                                        >
                                            <span className="icon">{item.icon}</span>
                                            {isOpen && <span className="label text-truncate">{item.label}</span>}
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </nav>
            </div>

            {/* ─── Bottom: User + Logout ─── */}
            <div className="clinic-sidebar-footer">
                {isOpen ? (
                    <div className="clinic-user-row">
                        <div className="clinic-user-avatar">
                            {userFullName ? userFullName[0].toUpperCase() : 'A'}
                        </div>
                        <div className="clinic-user-info">
                            <span className="clinic-user-name">{userFullName || 'Admin'}</span>
                            <span className="clinic-user-role">Klinika Admin</span>
                        </div>
                        <button
                            className="clinic-logout-btn"
                            onClick={handleLogout}
                            title="Chiqish"
                        >
                            <LogOut size={16} />
                        </button>
                    </div>
                ) : (
                    <button
                        className="clinic-logout-btn-mini"
                        onClick={handleLogout}
                        title="Chiqish"
                    >
                        <LogOut size={18} />
                    </button>
                )}
            </div>
        </aside>
    );
}
