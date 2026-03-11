import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import ClinicSidebar from './ClinicSidebar';
import ClinicTopbar from './ClinicTopbar';
import '../pages/clinic-pages.css';
import '../pages/clinic-admin.css';

export default function ClinicLayout() {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [theme, setTheme] = useState(
        () => localStorage.getItem('clinic_theme') || 'dark'
    );

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('clinic_theme', theme);
    }, [theme]);

    return (
        <div className={`app-container ${theme} ${isSidebarOpen ? '' : 'sidebar-closed'}`}>
            <ClinicSidebar
                isOpen={isSidebarOpen}
                toggleSidebar={() => setIsSidebarOpen(p => !p)}
            />
            <div className="main-content">
                <ClinicTopbar
                    toggleSidebar={() => setIsSidebarOpen(p => !p)}
                    isSidebarOpen={isSidebarOpen}
                    isDarkMode={theme === 'dark'}
                    toggleTheme={() => setTheme(p => p === 'light' ? 'dark' : 'light')}
                />
                <div className="content-wrapper">
                    <Outlet />
                </div>
            </div>
        </div>
    );
}
