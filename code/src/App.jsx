import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './shared/auth/AuthContext';
import { UserAuthProvider } from './shared/auth/UserAuthContext';
import { CartProvider } from './contexts/CartContext';
import { SuperAdminGuard, AdminPublicOnlyGuard, ClinicPublicOnlyGuard, ClinicGuard, StatusGuard, RootRedirect, UserGuard, UserPublicOnlyGuard, PatientSiteGuard } from './shared/auth/guards';
import ScrollToTop from './components/ScrollToTop';
import BetaBanner from './components/BetaBanner';
import MapSearchPage from './pages/MapSearchPage';
import { ToastProvider } from './shared/components/Toast';
import ErrorBoundary from './shared/components/ErrorBoundary';

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
import MetadataTemplates from './admin/pages/MetadataTemplates';
import OfertaPage from './admin/pages/OfertaPage';

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
import ClinicPayments from './clinic/pages/ClinicPayments';
import ClinicDoctors from './clinic/pages/ClinicDoctors';
import ClinicAmbulances from './clinic/pages/ClinicAmbulances';
import ClinicSkoryRequests from './clinic/pages/ClinicSkoryRequests';
import AdminPaymeOversight from './admin/pages/AdminPaymeOversight';
import AdminClickSplit from './admin/pages/AdminClickSplit';
import AdminSpecialties from './admin/pages/AdminSpecialties';
import FiscalSettings from './admin/pages/FiscalSettings';
import AmbulanceSettings from './admin/pages/AmbulanceSettings';
import ClinicTeam from './clinic/pages/ClinicTeam';
import ClinicReports from './clinic/pages/ClinicReports';
import ClinicNotifications from './clinic/pages/ClinicNotifications';

import HomePage from './pages/home/HomePage';
import XizmatlarPage from './pages/home/XizmatlarPage';
import XizmatlarCategoryPage from './pages/home/XizmatlarCategoryPage';
import XizmatDetailPage from './pages/home/XizmatDetailPage';
import ClinicsPage from './pages/home/ClinicsPage';
import DoctorsPage from './pages/home/DoctorsPage';
import DoctorProfilePage from './pages/home/DoctorProfilePage';
import DoctorBookingPage from './pages/home/DoctorBookingPage';
import SkoryPage from './pages/home/SkoryPage';
import SkoryOrderPage from './pages/skory/SkoryOrderPage';
import MiniAppBindFirst from './pages/MiniAppBindFirst';
import ClinicDetailPage from './pages/home/ClinicDetailPage';
import UserLoginPage from './pages/user/UserLoginPage';
import UserSignupPage from './pages/user/UserSignupPage';
import UserForgotPasswordPage from './pages/user/UserForgotPasswordPage';
import UserResetPasswordPage from './pages/user/UserResetPasswordPage';
import UserDashboard from './user/pages/UserDashboard';
import UserProfilePage from './user/pages/UserProfile';
import UserAppointments from './user/pages/UserAppointments';
import AppointmentDetailPage from './user/pages/AppointmentDetailPage';
import ClinicCheckInQR from './clinic/pages/ClinicCheckInQR';
import ClinicCashierQueue from './clinic/pages/ClinicCashierQueue';
import CheckInFab from './user/components/CheckInFab';
import UserFavoritesPage from './user/pages/UserFavoritesPage';
import UserNotificationsPage from './user/pages/UserNotificationsPage';
import UserNotificationSettings from './user/pages/UserNotificationSettings';
import PatientCheckInPage from './pages/checkin/PatientCheckInPage';
import ScanCheckInPage from './user/pages/ScanCheckInPage';
import PaymePage from './pages/payment/PaymePage';
import ClickPayPage from './pages/payment/ClickPayPage';
import AlifPayPage from './pages/payment/AlifPayPage';
import PaymentResultPage from './pages/payment/PaymentResultPage';
import CartPage from './pages/CartPage';
import CartCheckoutPage from './user/pages/CartCheckoutPage';
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
        <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
            <ToastProvider>
                <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                    <ScrollToTop />
                    <BetaBanner />
                    <AuthProvider>
                        <UserAuthProvider>
                            <CartProvider>
                                <Routes>

                                    {/* ─── PUBLIC HOME PAGE ────────────────────────── */}
                                    <Route path="/" element={<Navigate to="/xizmatlar" replace />} />
                                    <Route path="/home" element={<PatientSiteGuard><HomePage /></PatientSiteGuard>} />

                                    {/* ─── PATIENT SITE (login required — Mini App auto-logins) ── */}
                                    <Route path="/xizmatlar" element={<PatientSiteGuard><XizmatlarPage /></PatientSiteGuard>} />
                                    <Route path="/xarita" element={<PatientSiteGuard><MapSearchPage /></PatientSiteGuard>} />
                                    <Route path="/xizmatlar/category/:category" element={<PatientSiteGuard><XizmatlarCategoryPage /></PatientSiteGuard>} />
                                    <Route path="/xizmatlar/:id" element={<PatientSiteGuard><XizmatDetailPage /></PatientSiteGuard>} />
                                    <Route path="/klinikalar" element={<PatientSiteGuard><ClinicsPage /></PatientSiteGuard>} />
                                    <Route path="/klinikalar/:id" element={<PatientSiteGuard><ClinicDetailPage /></PatientSiteGuard>} />
                                    <Route path="/doktorlar" element={<PatientSiteGuard><DoctorsPage /></PatientSiteGuard>} />
                                    <Route path="/doktorlar/:id" element={<PatientSiteGuard><DoctorProfilePage /></PatientSiteGuard>} />
                                    <Route path="/doktorlar/:id/band/:clinicId" element={<PatientSiteGuard><DoctorBookingPage /></PatientSiteGuard>} />
                                    <Route path="/skory" element={<PatientSiteGuard><SkoryPage /></PatientSiteGuard>} />
                                    <Route path="/skory/order" element={<PatientSiteGuard><SkoryOrderPage /></PatientSiteGuard>} />
                                    <Route path="/mini-app-bind" element={<MiniAppBindFirst />} />

                                    {/* ─── USER AUTH ROUTES (PATIENT) ──────────────── */}
                                    <Route path="/user/login" element={<UserPublicOnlyGuard><UserLoginPage /></UserPublicOnlyGuard>} />
                                    <Route path="/user/signup" element={<UserPublicOnlyGuard><UserSignupPage /></UserPublicOnlyGuard>} />
                                    <Route path="/user/forgot-password" element={<UserForgotPasswordPage />} />
                                    <Route path="/user/reset-password" element={<UserResetPasswordPage />} />

                                    {/* ─── USER PROTECTED ROUTES (PATIENT) ─────────── */}
                                    <Route path="/user/dashboard" element={<UserGuard><UserDashboard /></UserGuard>} />
                                    <Route path="/user/profile" element={<UserGuard><UserProfilePage /></UserGuard>} />
                                    <Route path="/user/favorites" element={<UserGuard><UserFavoritesPage /></UserGuard>} />
                                    <Route path="/user/notifications" element={<UserGuard><UserNotificationsPage /></UserGuard>} />
                                    <Route path="/user/notification-settings" element={<UserGuard><UserNotificationSettings /></UserGuard>} />
                                    <Route path="/user/appointments" element={<UserGuard><UserAppointments /></UserGuard>} />
                                    <Route path="/user/appointments/:id" element={<UserGuard><AppointmentDetailPage /></UserGuard>} />
                                    <Route path="/user/cart" element={<UserGuard><CartPage /></UserGuard>} />
                                    <Route path="/cart" element={<Navigate to="/user/cart" replace />} />
                                    <Route path="/user/cart-checkout" element={<UserGuard><CartCheckoutPage /></UserGuard>} />

                                    {/* ─── PATIENT CHECK-IN (public — handles auth inside) ── */}
                                    <Route path="/user/scan-checkin" element={<UserGuard><ScanCheckInPage /></UserGuard>} />
                                    <Route path="/checkin/:clinicSecret" element={<PatientCheckInPage />} />

                                    {/* ─── PAYMENT (PAYME) ─────────────────────────── */}
                                    <Route path="/payment" element={<PaymePage />} />
                                    <Route path="/payment/click" element={<ClickPayPage />} />
                                    <Route path="/payment/alif" element={<AlifPayPage />} />
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
                                        <Route path="checkin-qr" element={<ClinicCheckInQR />} />
                                        <Route path="cashier" element={<ClinicCashierQueue />} />
                                        <Route path="payments" element={<ClinicPayments />} />
                                        <Route path="doctors" element={<ClinicDoctors />} />
                                        <Route path="ambulances" element={<ClinicAmbulances />} />
                                        <Route path="skory-requests" element={<ClinicSkoryRequests />} />
                                        <Route path="team" element={<ClinicTeam />} />
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
                                        <Route path="metadata-templates" element={<MetadataTemplates />} />
                                        <Route path="oferta" element={<OfertaPage />} />
                                        <Route path="payments" element={<AdminPaymeOversight />} />
                                        <Route path="click-split" element={<AdminClickSplit />} />
                                        <Route path="specialties" element={<AdminSpecialties />} />
                                        <Route path="fiscal" element={<FiscalSettings />} />
                                        <Route path="ambulance-settings" element={<AmbulanceSettings />} />
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
                                <CheckInFab />
                            </CartProvider>
                        </UserAuthProvider>
                    </AuthProvider>
                </Router>
            </ToastProvider>
        </QueryClientProvider>
        </ErrorBoundary>
    );
}

export default App;
