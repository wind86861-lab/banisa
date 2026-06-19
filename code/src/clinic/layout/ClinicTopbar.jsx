import { useLocation, useNavigate } from 'react-router-dom';
import { Menu, Sun, Moon, LogOut } from 'lucide-react';
import { useAuth } from '../../shared/auth/AuthContext';
import NotificationBell from '../components/NotificationBell';
import '../../components/Header.css';
import './ClinicTopbar.css';

const PAGE_TITLES = {
    '/clinic/dashboard':  'Dashboard',
    '/clinic/services':   'Xizmatlar va Narxlar',
    '/clinic/profile':    'Klinika Profili',
    '/clinic/bookings':   'Bronlar',
    '/clinic/reports':    'Hisobotlar',
    '/clinic/notifications': 'Bildirishnomalar',
    '/clinic/cashier':    'Kassir navbati',
    '/clinic/checkin-qr': 'Check-in QR',
};

export default function ClinicTopbar({ toggleSidebar, isSidebarOpen, isDarkMode, toggleTheme }) {
    const location = useLocation();
    const navigate = useNavigate();
    const { user, logout } = useAuth();

    // Show the page-specific title where we know one (Dashboard, Bronlar…),
    // otherwise fall back to the clinic's own name so the operator always
    // sees a meaningful label at the top — never "Klinika Paneli" generic.
    const clinicName = user?.clinicName || 'Klinika';
    const pageTitle = PAGE_TITLES[location.pathname] || clinicName;
    // Adaptive font: shrink for long clinic names so they don't push the
    // hamburger off-screen on narrow viewports. Buckets are tuned for the
    // longest existing clinic names in production (~40 chars).
    const titleFontSize =
        pageTitle.length > 42 ? 11 :
        pageTitle.length > 32 ? 13 :
        pageTitle.length > 24 ? 14 : 16;
    const userFullName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : 'Admin';
    const userInitial = userFullName ? userFullName[0].toUpperCase() : 'A';

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    return (
        <header className="main-header clinic-topbar">
            {/* Left: Menu + Page Title */}
            <div className="header-left" style={{ gap: 16, display: 'flex', alignItems: 'center' }}>
                <button className="sidebar-toggle" onClick={toggleSidebar} title="Menyu">
                    <Menu size={20} />
                </button>
                <div className="clinic-page-title">
                    <span style={{ fontSize: titleFontSize }} title={pageTitle}>{pageTitle}</span>
                </div>
            </div>

            {/* Center: empty */}
            <div className="header-center" />

            {/* Right: Actions + User */}
            <div className="header-right">
                <div className="header-actions">
                    {/* Theme Toggle */}
                    <button className="action-btn" onClick={toggleTheme} title="Tema">
                        {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
                    </button>

                    {/* Notifications */}
                    <NotificationBell />
                </div>

                {/* User info */}
                <div className="user-menu clinic-user-menu">
                    <div className="clinic-topbar-avatar">{userInitial}</div>
                    <div className="user-details">
                        <span className="user-name">{userFullName}</span>
                        <span className="user-role">Klinika Admin</span>
                    </div>
                </div>

                {/* Logout */}
                <button className="action-btn clinic-topbar-logout" onClick={handleLogout} title="Chiqish">
                    <LogOut size={18} />
                </button>
            </div>
        </header>
    );
}
