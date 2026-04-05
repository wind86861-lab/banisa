import { Menu, Search, Sun, Moon, Maximize, Grid, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AdminNotifications from './AdminNotifications';
import { useAuth } from '../shared/auth/AuthContext';
import './Header.css';

const Header = ({ toggleSidebar, isSidebarOpen, isDarkMode, toggleTheme }) => {
    const navigate = useNavigate();
    const { user, logout } = useAuth();

    const displayName = user?.name || user?.fullName || user?.email?.split('@')[0] || 'Admin';
    const roleLabel = user?.role === 'SUPER_ADMIN' ? 'Super Admin'
        : user?.role === 'CLINIC_ADMIN' ? 'Klinika Admin'
            : user?.role || 'Administrator';
    const initials = displayName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

    const handleLogout = async (e) => {
        e.stopPropagation();
        await logout();
        navigate('/admin/login');
    };

    return (
        <header className="main-header">
            <div className="header-left">
                <button className="sidebar-toggle" onClick={toggleSidebar}>
                    <Menu size={20} />
                </button>
            </div>

            <div className="header-center">
                <div className="search-box">
                    <Search size={18} className="search-icon" />
                    <input type="text" placeholder="Qidirish..." />
                </div>
            </div>

            <div className="header-right">
                <div className="header-actions">
                    <button className="action-btn" onClick={toggleTheme} title="Mavzu almashtirish">
                        {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
                    </button>
                    <AdminNotifications />
                    <button className="action-btn" title="Chiqish" onClick={handleLogout}>
                        <LogOut size={18} />
                    </button>
                </div>

                <div className="user-menu" onClick={() => navigate('/admin/profile')}>
                    <div className="user-avatar-initials">{initials}</div>
                    <div className="user-details">
                        <span className="user-name">{displayName}</span>
                        <span className="user-role">{roleLabel}</span>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;
