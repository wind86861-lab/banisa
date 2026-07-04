import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import ClinicSidebar from './ClinicSidebar';
import ClinicTopbar from './ClinicTopbar';
import '../pages/clinic-pages.css';
import '../pages/clinic-admin.css';
import './clinic-responsive.css';

// Below this width the sidebar behaves as an off-canvas drawer and must start
// collapsed so it doesn't cover the content on load. Matches the 992px
// breakpoint in clinic-responsive.css / index.css.
const MOBILE_BREAKPOINT = 992;
const isMobileView = () =>
    typeof window !== 'undefined' && window.innerWidth <= MOBILE_BREAKPOINT;

export default function ClinicLayout() {
    // Open by default on desktop, collapsed (drawer hidden) on phones.
    const [isSidebarOpen, setIsSidebarOpen] = useState(() => !isMobileView());
    const [theme, setTheme] = useState(
        () => localStorage.getItem('clinic_theme') || 'dark'
    );

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('clinic_theme', theme);
    }, [theme]);

    // On navigation (mobile only) close the drawer so the page is visible.
    const handleNavigate = () => {
        if (isMobileView()) setIsSidebarOpen(false);
    };

    return (
        <div className={`app-container ${theme} ${isSidebarOpen ? '' : 'sidebar-closed'}`}>
            <ClinicSidebar
                isOpen={isSidebarOpen}
                toggleSidebar={() => setIsSidebarOpen(p => !p)}
                onNavigate={handleNavigate}
            />
            {/* Tap-to-close backdrop — only visible on mobile while the drawer is open. */}
            <div
                className="clinic-mobile-backdrop"
                onClick={() => setIsSidebarOpen(false)}
                aria-hidden="true"
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
