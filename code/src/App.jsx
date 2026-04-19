import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './shared/auth/AuthContext';
import { UserAuthProvider } from './shared/auth/UserAuthContext';
import { CartProvider } from './contexts/CartContext';
import { SuperAdminGuard, AdminPublicOnlyGuard, ClinicPublicOnlyGuard, ClinicGuard, StatusGuard, RootRedirect, UserGuard, UserPublicOnlyGuard } from './shared/auth/guards';
import ScrollToTop from './components/ScrollToTop';

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
import AdminClinicDetailPage from './admin/pages/clinics/ClinicDetailPage';
import HomepageSettings from './admin/pages/HomepageSettings';
import AppointmentsPage from './admin/pages/AppointmentsPage';
import Users from './pages/Users';

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
import ClinicNotifications from './clinic/pages/ClinicNotifications';

import HomePage from './pages/home/HomePage';
import XizmatlarPage from './pages/home/XizmatlarPage';
import XizmatDetailPage from './pages/home/XizmatDetailPage';
import ClinicsPage from './pages/home/ClinicsPage';
import ClinicDetailPage from './pages/home/ClinicDetailPage';
import UserLoginPage from './pages/user/UserLoginPage';
import UserSignupPage from './pages/user/UserSignupPage';
import UserDashboard from './user/pages/UserDashboard';
import UserProfilePage from './user/pages/UserProfile';
import UserAppointments from './user/pages/UserAppointments';
import BookingPage from './user/pages/BookingPage';
import CheckoutPage from './user/pages/CheckoutPage';
import BookingSuccessPage from './user/pages/BookingSuccessPage';
import AppointmentDetailPage from './user/pages/AppointmentDetailPage';
import ClinicQRScanner from './clinic/pages/ClinicQRScanner';
import PaymePage from './pages/payment/PaymePage';
import PaymentResultPage from './pages/payment/PaymentResultPage';
import CartPage from './pages/CartPage';
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
                <ScrollToTop />
                <AuthProvider>
                    <UserAuthProvider>
                        <CartProvider>
                            <Routes>

                                {/* ─── PUBLIC HOME PAGE ────────────────────────── */}
                                <Route path="/" element={<HomePage />} />
                                <Route path="/home" element={<HomePage />} />

                                {/* ─── PUBLIC PAGES ────────────────────────────── */}
                                <Route path="/xizmatlar" element={<XizmatlarPage />} />
                                <Route path="/xizmatlar/:id" element={<XizmatDetailPage />} />
                                <Route path="/klinikalar" element={<ClinicsPage />} />
                                <Route path="/klinikalar/:id" element={<ClinicDetailPage />} />

                                {/* ─── USER AUTH ROUTES (PATIENT) ──────────────── */}
                                <Route path="/user/login" element={<UserPublicOnlyGuard><UserLoginPage /></UserPublicOnlyGuard>} />
                                <Route path="/user/signup" element={<UserPublicOnlyGuard><UserSignupPage /></UserPublicOnlyGuard>} />

                                {/* ─── USER PROTECTED ROUTES (PATIENT) ─────────── */}
                                <Route path="/user/dashboard" element={<UserGuard><UserDashboard /></UserGuard>} />
                                <Route path="/user/profile" element={<UserGuard><UserProfilePage /></UserGuard>} />
                                <Route path="/user/appointments" element={<UserGuard><UserAppointments /></UserGuard>} />
                                <Route path="/user/appointments/:id" element={<UserGuard><AppointmentDetailPage /></UserGuard>} />
                                <Route path="/user/cart" element={<UserGuard><CartPage /></UserGuard>} />
                                <Route path="/user/book/:serviceId" element={<UserGuard><BookingPage /></UserGuard>} />
                                <Route path="/user/checkout" element={<UserGuard><CheckoutPage /></UserGuard>} />
                                <Route path="/user/booking-success" element={<UserGuard><BookingSuccessPage /></UserGuard>} />

                                {/* ─── PAYMENT (PAYME) ─────────────────────────── */}
                                <Route path="/payment" element={<PaymePage />} />
                                <Route path="/payment/result" element={<PaymentResultPage />} />

                                {/* ─── CLINIC REGISTRATION ─────────────────────── */}
                                <Route path="/register" element={
                                    <ClinicPublicOnlyGuard><RegisterPage /></ClinicPublicOnlyGuard>
                                } />
                                <Route path="/register/success" element={<RegisterSuccessPage />} />
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
                                    <Route path="scan" element={<ClinicQRScanner />} />
                                    <Route path="discounts" element={<ClinicDiscounts />} />
                                    <Route path="staff" element={<ClinicStaff />} />
                                    <Route path="reports" element={<ClinicReports />} />
                                    <Route path="notifications" element={<ClinicNotifications />} />
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
                                    <Route path="users" element={<Users />} />
                                    <Route path="services" element={<Services />} />
                                    <Route path="clinics" element={<Clinics />} />
                                    <Route path="appointments" element={<AppointmentsPage />} />
                                    <Route path="clinics/:id" element={<AdminClinicDetailPage />} />
                                    <Route path="packages" element={<CheckupPackages />} />
                                    <Route path="clinic-packages" element={<ClinicCheckupPackages />} />
                                    <Route path="public-packages" element={<PublicCheckupPackages />} />
                                    <Route path="profile" element={<AdminProfile />} />
                                    <Route path="homepage" element={<HomepageSettings />} />
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
                        </CartProvider>
                    </UserAuthProvider>
                </AuthProvider>
            </Router>
        </QueryClientProvider>
    );
}

export default App;
