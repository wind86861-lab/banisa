import { useLocation, useNavigate } from 'react-router-dom';
import { Menu, Sun, Moon, Bell, LogOut } from 'lucide-react';
import { useAuth } from '../../shared/auth/AuthContext';
import '../../components/Header.css';
import './ClinicTopbar.css';

const PAGE_TITLES = {
    '/clinic/dashboard':  'Dashboard',
    '/clinic/services':   'Xizmatlar va Narxlar',
    '/clinic/profile':    'Klinika Profili',
    '/clinic/bookings':   'Bronlar',
    '/clinic/discounts':  'Chegirmalar',
    '/clinic/staff':      'Xodimlar',
    '/clinic/reports':    'Hisobotlar',
};

export default function ClinicTopbar({ toggleSidebar, isSidebarOpen, isDarkMode, toggleTheme }) {
    const location = useLocation();
    const navigate = useNavigate();
    const { user, logout } = useAuth();

    const pageTitle = PAGE_TITLES[location.pathname] || 'Klinika Paneli';
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
                    <span>{pageTitle}</span>
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

                    {/* Notifications (mock) */}
                    <button className="action-btn clinic-notif-btn" title="Bildirishnomalar">
                        <Bell size={20} />
                        <span className="badge">3</span>
                    </button>
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
