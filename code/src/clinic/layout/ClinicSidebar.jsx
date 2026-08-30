import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import {
    Home, Briefcase, Calendar, Tag,
    Building2, Users, BarChart2, Printer,
    LogOut, ChevronDown, Activity, Bell, Banknote,
    CreditCard, Ambulance, Link2, Loader2,
} from 'lucide-react';
import { useAuth } from '../../shared/auth/AuthContext';
import { useMyClinicMembership } from '../hooks/useMyClinicMembership';
import api from '../../shared/api/axios';
import '../../components/Sidebar.css';
import './ClinicSidebar.css';

// All nav items for CLINIC_ADMIN. DIRECTOR sees a stripped-down list
// (read-only essentials + the daily-report destination) — those keys are
// listed in DIRECTOR_NAV_KEYS below.
const NAV_GROUPS = [
    {
        title: 'ASOSIY',
        items: [
            { key: 'dashboard', label: 'Dashboard', path: '/clinic/dashboard', icon: <Home size={20} /> },
            { key: 'services', label: 'Xizmatlar', path: '/clinic/services', icon: <Briefcase size={20} /> },
            { key: 'bookings', label: 'Bronlar', path: '/clinic/bookings', icon: <Calendar size={20} /> },
            { key: 'cashier', label: 'Kassa navbati', path: '/clinic/cashier', icon: <Banknote size={20} /> },
            { key: 'skory-requests', label: 'Tez yordam', path: '/clinic/skory-requests', icon: <Ambulance size={20} /> },
            { key: 'checkin-qr', label: 'Check-in QR', path: '/clinic/checkin-qr', icon: <Printer size={20} /> },
            { key: 'payments', label: "To'lov tizimi", path: '/clinic/payments', icon: <CreditCard size={20} /> },
        ],
    },
    {
        title: 'BOSHQARUV',
        items: [
            { key: 'profile', label: 'Klinika Profili', path: '/clinic/profile', icon: <Building2 size={20} /> },
            { key: 'team', label: 'Jamoa', path: '/clinic/team', icon: <Users size={20} /> },
            { key: 'reports', label: 'Hisobotlar', path: '/clinic/reports', icon: <BarChart2 size={20} /> },
            { key: 'notifications', label: 'Bildirishnomalar', path: '/clinic/notifications', icon: <Bell size={20} /> },
            // External hand-off, not a route: mints a link ticket and redirects
            // to KlinikaTop. Not in DIRECTOR_NAV_KEYS, so only CLINIC_ADMIN (who
            // holds CLINIC_SETTINGS_EDIT) sees it — the backend enforces it too.
            { key: 'klinikatop', label: "KlinikaTop'ga ulanish", action: 'connect-klinikatop', icon: <Link2 size={20} /> },
        ],
    },
];

const DIRECTOR_NAV_KEYS = new Set(['dashboard', 'bookings', 'reports', 'notifications', 'team']);

function useUnreadCount() {
    return useQuery({
        queryKey: ['clinic', 'notifications', 'unread-count'],
        queryFn: async () => {
            try {
                // Dedicated count endpoint — avoids paging through full notif list.
                const { data } = await api.get('/clinic/notifications/unread-count');
                return data.data?.count ?? data.data?.unreadCount ?? 0;
            } catch { return 0; }
        },
        refetchInterval: 60_000,
        staleTime: 30_000,
    });
}

export default function ClinicSidebar({ isOpen, toggleSidebar, onNavigate }) {
    const navigate = useNavigate();
    const location = useLocation();
    const { user, logout } = useAuth();
    const { data: unreadCount = 0 } = useUnreadCount();
    const { isDirector, isLoading: membershipLoading } = useMyClinicMembership();

    // Fail closed: until the membership resolves, show the restricted set so a
    // DIRECTOR never flashes the full (admin-only) menu. Once known, non-directors
    // get the complete list. Expanding (never shrinking) is the safe direction.
    const restricted = membershipLoading || isDirector;
    const navGroups = restricted
        ? NAV_GROUPS.map(g => ({
            ...g,
            items: g.items.filter(i => DIRECTOR_NAV_KEYS.has(i.key)),
        })).filter(g => g.items.length > 0)
        : NAV_GROUPS;

    const isActive = (path) => path && (location.pathname === path || location.pathname.startsWith(path + '/'));

    // "Connect to KlinikaTop": mint a short-lived link ticket, then follow the
    // server-built redirect. The ticket is one-time + 60s, so we go straight to
    // KlinikaTop while it's fresh.
    const [connecting, setConnecting] = useState(false);
    const handleConnectKlinikatop = async () => {
        if (connecting) return;
        setConnecting(true);
        try {
            const { data } = await api.post('/partner/link-ticket');
            const url = data?.redirectUrl;
            if (!url) throw new Error('no redirect url');
            window.location.href = url;
        } catch (e) {
            setConnecting(false);
            alert(e?.response?.data?.message || "KlinikaTop'ga ulanishда xatolik. Qayta urinib ko'ring.");
        }
    };

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    const clinicName = user?.clinicName || 'Klinika Paneli';
    const userFullName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : '';
    // Adaptive font for the sidebar header logo label and the badge. Long
    // clinic names ("A'LO KO'Z KLINIKASI", "Medilux Medical Center" …)
    // were spilling out / clipping; shrink in 3 buckets so anything up
    // to ~35 chars stays readable without overflowing the sidebar.
    const headerNameSize =
        clinicName.length > 32 ? 11 :
        clinicName.length > 22 ? 13 : 16;
    const badgeNameSize =
        clinicName.length > 32 ? 12 :
        clinicName.length > 22 ? 14 : 16;

    return (
        <aside className={`sidebar clinic-sidebar ${!isOpen ? 'closed' : ''}`}>

            {/* ─── Header / Branding ─── */}
            <div className="sidebar-header">
                <a href="/clinic/dashboard" className="logo">
                    <img
                        src="/images/banisa-logo.png?v=3"
                        alt="Banisa"
                        className="logo-icon"
                        style={{
                            width: 44, height: 44, borderRadius: 12,
                            objectFit: 'cover', display: 'block',
                            border: 'none', outline: 'none',
                            filter: 'drop-shadow(0 0 14px rgba(0,189,224,0.35))',
                        }}
                    />
                    {isOpen && (
                        <span
                            title={clinicName}
                            style={{
                                fontSize: headerNameSize,
                                lineHeight: 1.2,
                                display: 'inline-block',
                                maxWidth: 180,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                            }}
                        >
                            {clinicName}
                        </span>
                    )}
                </a>
            </div>

            {/* ─── Clinic Info Badge (only when open) ─── */}
            {isOpen && user && (
                <div className="clinic-badge">
                    <div
                        className="clinic-badge-name"
                        title={clinicName}
                        style={{
                            fontSize: badgeNameSize,
                            lineHeight: 1.25,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            display: 'block',
                        }}
                    >
                        {clinicName}
                    </div>
                    <div className="clinic-badge-status">
                        <span className="status-dot" />
                        Faol klinika
                    </div>
                </div>
            )}

            {/* ─── Navigation ─── */}
            <div className="sidebar-content">
                <nav className="sidebar-nav">
                    {navGroups.map((group, gi) => (
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
                                            onClick={(e) => {
                                                e.preventDefault();
                                                if (item.action === 'connect-klinikatop') { handleConnectKlinikatop(); return; }
                                                navigate(item.path); onNavigate?.();
                                            }}
                                            title={!isOpen ? item.label : undefined}
                                            aria-busy={item.action === 'connect-klinikatop' && connecting ? true : undefined}
                                        >
                                            <span className="icon" style={{ position: 'relative' }}>
                                                {item.action === 'connect-klinikatop' && connecting
                                                    ? <Loader2 size={20} className="ca-spin" />
                                                    : item.icon}
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
