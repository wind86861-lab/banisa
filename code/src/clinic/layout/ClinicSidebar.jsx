import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import {
    Home, Briefcase, Calendar, Tag, QrCode,
    Building2, Users, BarChart2,
    LogOut, ChevronDown, Activity, Bell,
} from 'lucide-react';
import { useAuth } from '../../shared/auth/AuthContext';
import api from '../../shared/api/axios';
import '../../components/Sidebar.css';
import './ClinicSidebar.css';

const NAV_GROUPS = [
    {
        title: 'ASOSIY',
        items: [
            { key: 'dashboard', label: 'Dashboard', path: '/clinic/dashboard', icon: <Home size={20} /> },
            { key: 'services', label: 'Xizmatlar', path: '/clinic/services', icon: <Briefcase size={20} /> },
            { key: 'bookings', label: 'Bronlar', path: '/clinic/bookings', icon: <Calendar size={20} /> },
            { key: 'scan', label: 'QR Skaner', path: '/clinic/scan', icon: <QrCode size={20} /> },
            { key: 'discounts', label: 'Chegirmalar', path: '/clinic/discounts', icon: <Tag size={20} /> },
        ],
    },
    {
        title: 'BOSHQARUV',
        items: [
            { key: 'profile', label: 'Klinika Profili', path: '/clinic/profile', icon: <Building2 size={20} /> },
            { key: 'staff', label: 'Xodimlar', path: '/clinic/staff', icon: <Users size={20} /> },
            { key: 'notifications', label: 'Bildirishnomalar', path: '/clinic/notifications', icon: <Bell size={20} /> },
            { key: 'reports', label: 'Hisobotlar', path: '/clinic/reports', icon: <BarChart2 size={20} /> },
        ],
    },
];

function useUnreadCount() {
    return useQuery({
        queryKey: ['clinic', 'notifications', 'unread-count'],
        queryFn: async () => {
            try {
                const { data } = await api.get('/clinic/notifications', { params: { isRead: false, limit: 1 } });
                return data.data?.unreadCount ?? 0;
            } catch { return 0; }
        },
        refetchInterval: 60_000,
        staleTime: 30_000,
    });
}

export default function ClinicSidebar({ isOpen, toggleSidebar }) {
    const navigate = useNavigate();
    const location = useLocation();
    const { user, logout } = useAuth();
    const { data: unreadCount = 0 } = useUnreadCount();

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
                                            <span className="icon" style={{ position: 'relative' }}>
                                                {item.icon}
                                                {item.key === 'notifications' && unreadCount > 0 && (
                                                    <span style={{
                                                        position: 'absolute', top: -4, right: -4,
                                                        background: '#ef4444', color: '#fff',
                                                        borderRadius: '50%', width: 14, height: 14,
                                                        fontSize: 9, fontWeight: 700,
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        lineHeight: 1,
                                                    }}>
                                                        {unreadCount > 9 ? '9+' : unreadCount}
                                                    </span>
                                                )}
                                            </span>
                                            {isOpen && <span className="label text-truncate">{item.label}</span>}
                                            {isOpen && item.key === 'notifications' && unreadCount > 0 && (
                                                <span style={{
                                                    marginLeft: 'auto', background: '#ef4444', color: '#fff',
                                                    borderRadius: 20, fontSize: 10, fontWeight: 700,
                                                    padding: '1px 6px', lineHeight: '16px',
                                                }}>
                                                    {unreadCount > 99 ? '99+' : unreadCount}
                                                </span>
                                            )}
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
