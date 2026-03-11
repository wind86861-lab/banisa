import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './shared/auth/AuthContext';
import { SuperAdminGuard, AdminPublicOnlyGuard, ClinicPublicOnlyGuard, ClinicGuard, StatusGuard, RootRedirect } from './shared/auth/guards';

// Admin pages
import NotFoundPage from './shared/pages/NotFoundPage';
import ForbiddenPage from './shared/pages/ForbiddenPage';
import AdminLoginPage from './pages/AdminLoginPage';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import Services from './pages/Services';
import Clinics from './admin/pages/clinics/ClinicsPage';
import CheckupPackages from './pages/CheckupPackages';
import ClinicCheckupPackages from './pages/ClinicCheckupPackages';
import PublicCheckupPackages from './pages/PublicCheckupPackages';
import AdminProfile from './pages/AdminProfile';

// Clinic registration pages
import RegisterPage from './clinic-registration/pages/RegisterPage';
import RegisterSuccessPage from './clinic-registration/pages/RegisterSuccessPage';
import ClinicLoginPage from './clinic-registration/pages/LoginPage';
import StatusPage from './clinic-registration/pages/StatusPage';
import WelcomePage from './clinic-registration/pages/WelcomePage';

// Clinic admin panel
import ClinicLayout from './clinic/layout/ClinicLayout';
import ClinicDashboard from './clinic/pages/ClinicDashboard';
import ClinicServices from './clinic/pages/ClinicServices';
import ClinicProfile from './clinic/pages/ClinicProfile';
import ClinicBookings from './clinic/pages/ClinicBookings';
import ClinicDiscounts from './clinic/pages/ClinicDiscounts';
import ClinicStaff from './clinic/pages/ClinicStaff';
import ClinicReports from './clinic/pages/ClinicReports';

import './index.css';

const queryClient = new QueryClient({
    defaultOptions: { queries: { refetchOnWindowFocus: false, retry: false } },
});

function AdminLayout() {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    }, [theme]);

    return (
        <div className={`app-container ${theme} ${isSidebarOpen ? '' : 'sidebar-closed'}`}>
            <Sidebar isOpen={isSidebarOpen} toggleSidebar={() => setIsSidebarOpen(p => !p)} />
            <div className="main-content">
                <Header
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

function App() {
    return (
        <QueryClientProvider client={queryClient}>
            <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                <AuthProvider>
                    <Routes>

                        {/* ─── ROOT ────────────────────────────────────── */}
                        {/* Smart redirect: unauthenticated→/login, SUPER_ADMIN→/admin/dashboard, CLINIC_ADMIN→/clinic/dashboard */}
                        <Route index element={<RootRedirect />} />

                        {/* ─── CLINIC PUBLIC ROUTES (login shart emas) ─── */}
                        {/* /register — istalgan kishi kirishi mumkin */}
                        <Route path="/register" element={<RegisterPage />} />
                        <Route path="/register/success" element={<RegisterSuccessPage />} />

                        {/* /login — clinic admin login only */}
                        <Route path="/login" element={
                            <ClinicPublicOnlyGuard><ClinicLoginPage /></ClinicPublicOnlyGuard>
                        } />

                        {/* ─── CLINIC AUTH ROUTES ──────────────────────── */}
                        <Route path="/status" element={
                            <StatusGuard><StatusPage /></StatusGuard>
                        } />
                        <Route path="/welcome" element={
                            <ClinicGuard><WelcomePage /></ClinicGuard>
                        } />

                        {/* ─── CLINIC PANEL (APPROVED + CLINIC_ADMIN) ──── */}
                        <Route path="/clinic" element={
                            <ClinicGuard><ClinicLayout /></ClinicGuard>
                        }>
                            <Route index element={<Navigate to="dashboard" replace />} />
                            <Route path="dashboard" element={<ClinicDashboard />} />
                            <Route path="services" element={<ClinicServices />} />
                            <Route path="profile" element={<ClinicProfile />} />
                            <Route path="bookings" element={<ClinicBookings />} />
                            <Route path="discounts" element={<ClinicDiscounts />} />
                            <Route path="staff" element={<ClinicStaff />} />
                            <Route path="reports" element={<ClinicReports />} />
                        </Route>

                        {/* ─── ADMIN LOGIN ─────────────────────────────── */}
                        <Route path="/admin/login" element={
                            <AdminPublicOnlyGuard><AdminLoginPage /></AdminPublicOnlyGuard>
                        } />

                        {/* ─── ADMIN PANEL ─────────────────────────────── */}
                        <Route path="/admin" element={
                            <SuperAdminGuard><AdminLayout /></SuperAdminGuard>
                        }>
                            <Route index element={<Navigate to="dashboard" replace />} />
                            <Route path="dashboard" element={<Dashboard />} />
                            <Route path="services" element={<Services />} />
                            <Route path="clinics" element={<Clinics />} />
                            <Route path="packages" element={<CheckupPackages />} />
                            <Route path="clinic-packages" element={<ClinicCheckupPackages />} />
                            <Route path="public-packages" element={<PublicCheckupPackages />} />
                            <Route path="profile" element={<AdminProfile />} />
                            <Route path="clinic-registrations" element={<Navigate to="/admin/clinics" replace />} />
                        </Route>

                        {/* ─── LEGACY REDIRECTS ────────────────────────── */}
                        <Route path="/clinic-registration" element={<Navigate to="/register" replace />} />
                        <Route path="/services" element={<Navigate to="/admin/services" replace />} />
                        <Route path="/clinics" element={<Navigate to="/admin/clinics" replace />} />
                        <Route path="/packages" element={<Navigate to="/admin/packages" replace />} />
                        <Route path="/clinic-packages" element={<Navigate to="/admin/clinic-packages" replace />} />
                        <Route path="/public-packages" element={<Navigate to="/admin/public-packages" replace />} />
                        <Route path="/clinic-registrations" element={<Navigate to="/admin/clinics" replace />} />

                        {/* ─── ERROR PAGES ─────────────────────────────── */}
                        <Route path="/403" element={<ForbiddenPage />} />

                        {/* ─── 404 — MUST BE LAST ──────────────────────── */}
                        <Route path="*" element={<NotFoundPage />} />

                    </Routes>
                </AuthProvider>
            </Router>
        </QueryClientProvider>
    );
}

export default App;
