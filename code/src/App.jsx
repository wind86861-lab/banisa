import React, { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './shared/auth/AuthContext';
import { UserAuthProvider } from './shared/auth/UserAuthContext';
import { CartProvider } from './contexts/CartContext';
import { SuperAdminGuard, AdminPublicOnlyGuard, ClinicPublicOnlyGuard, ClinicGuard, StatusGuard, RootRedirect, UserGuard, UserPublicOnlyGuard, PatientPublic } from './shared/auth/guards';
import ScrollToTop from './components/ScrollToTop';
import BetaBanner from './components/BetaBanner';
import { ToastProvider } from './shared/components/Toast';
import ErrorBoundary from './shared/components/ErrorBoundary';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import CheckInFab from './user/components/CheckInFab';
import BanisaLoader from './shared/components/BanisaLoader';

// ── Route pages are lazy-loaded → each area (patient / admin / clinic /
// payments / maps) ships as its own on-demand chunk. A patient opening the
// Mini App no longer downloads the admin & clinic panels; the initial payload
// drops from one ~3.4MB bundle to a small patient chunk.
const MapSearchPage = lazy(() => import('./pages/MapSearchPage'));
const NotFoundPage = lazy(() => import('./shared/pages/NotFoundPage'));
const ForbiddenPage = lazy(() => import('./shared/pages/ForbiddenPage'));
const AdminLoginPage = lazy(() => import('./pages/AdminLoginPage'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Services = lazy(() => import('./pages/Services'));
const Clinics = lazy(() => import('./admin/pages/clinics/ClinicsPage'));
const CheckupPackages = lazy(() => import('./pages/CheckupPackages'));
const ClinicCheckupPackages = lazy(() => import('./pages/ClinicCheckupPackages'));
const PublicCheckupPackages = lazy(() => import('./pages/PublicCheckupPackages'));
const AdminProfile = lazy(() => import('./pages/AdminProfile'));
const AdminClinicDetailPage = lazy(() => import('./admin/pages/clinics/ClinicDetailPage'));
const HomepageSettings = lazy(() => import('./admin/pages/HomepageSettings'));
const AppointmentsPage = lazy(() => import('./admin/pages/AppointmentsPage'));
const Users = lazy(() => import('./pages/Users'));
const MetadataTemplates = lazy(() => import('./admin/pages/MetadataTemplates'));
const OfertaPage = lazy(() => import('./admin/pages/OfertaPage'));
const RegisterPage = lazy(() => import('./clinic-registration/pages/RegisterPage'));
const RegisterSuccessPage = lazy(() => import('./clinic-registration/pages/RegisterSuccessPage'));
const ClinicLoginPage = lazy(() => import('./clinic-registration/pages/LoginPage'));
const StatusPage = lazy(() => import('./clinic-registration/pages/StatusPage'));
const WelcomePage = lazy(() => import('./clinic-registration/pages/WelcomePage'));
const ClinicLayout = lazy(() => import('./clinic/layout/ClinicLayout'));
const ClinicDashboard = lazy(() => import('./clinic/pages/ClinicDashboard'));
const ClinicServices = lazy(() => import('./clinic/pages/ClinicServices'));
const ClinicProfile = lazy(() => import('./clinic/pages/ClinicProfile'));
const ClinicBookings = lazy(() => import('./clinic/pages/ClinicBookings'));
const ClinicPayments = lazy(() => import('./clinic/pages/ClinicPayments'));
const ClinicDoctors = lazy(() => import('./clinic/pages/ClinicDoctors'));
const ClinicAmbulances = lazy(() => import('./clinic/pages/ClinicAmbulances'));
const ClinicSkoryRequests = lazy(() => import('./clinic/pages/ClinicSkoryRequests'));
const AdminPaymeOversight = lazy(() => import('./admin/pages/AdminPaymeOversight'));
const AdminClickSplit = lazy(() => import('./admin/pages/AdminClickSplit'));
const AdminSpecialties = lazy(() => import('./admin/pages/AdminSpecialties'));
const FiscalSettings = lazy(() => import('./admin/pages/FiscalSettings'));
const AmbulanceSettings = lazy(() => import('./admin/pages/AmbulanceSettings'));
const ClinicTeam = lazy(() => import('./clinic/pages/ClinicTeam'));
const ClinicReports = lazy(() => import('./clinic/pages/ClinicReports'));
const ClinicNotifications = lazy(() => import('./clinic/pages/ClinicNotifications'));
const HomePage = lazy(() => import('./pages/home/HomePage'));
const XizmatlarPage = lazy(() => import('./pages/home/XizmatlarPage'));
const XizmatlarCategoryPage = lazy(() => import('./pages/home/XizmatlarCategoryPage'));
const XizmatDetailPage = lazy(() => import('./pages/home/XizmatDetailPage'));
const ClinicsPage = lazy(() => import('./pages/home/ClinicsPage'));
const DoctorsPage = lazy(() => import('./pages/home/DoctorsPage'));
const DoctorProfilePage = lazy(() => import('./pages/home/DoctorProfilePage'));
const DoctorBookingPage = lazy(() => import('./pages/home/DoctorBookingPage'));
const SkoryPage = lazy(() => import('./pages/home/SkoryPage'));
const SkoryOrderPage = lazy(() => import('./pages/skory/SkoryOrderPage'));
const SkoryPaymentPage = lazy(() => import('./pages/skory/SkoryPaymentPage'));
const MiniAppBindFirst = lazy(() => import('./pages/MiniAppBindFirst'));
const ClinicDetailPage = lazy(() => import('./pages/home/ClinicDetailPage'));
const UserLoginPage = lazy(() => import('./pages/user/UserLoginPage'));
const UserSignupPage = lazy(() => import('./pages/user/UserSignupPage'));
const UserForgotPasswordPage = lazy(() => import('./pages/user/UserForgotPasswordPage'));
const UserResetPasswordPage = lazy(() => import('./pages/user/UserResetPasswordPage'));
const UserDashboard = lazy(() => import('./user/pages/UserDashboard'));
const UserProfilePage = lazy(() => import('./user/pages/UserProfile'));
const UserAppointments = lazy(() => import('./user/pages/UserAppointments'));
const AppointmentDetailPage = lazy(() => import('./user/pages/AppointmentDetailPage'));
const ClinicCheckInQR = lazy(() => import('./clinic/pages/ClinicCheckInQR'));
const ClinicCashierQueue = lazy(() => import('./clinic/pages/ClinicCashierQueue'));
const UserFavoritesPage = lazy(() => import('./user/pages/UserFavoritesPage'));
const UserNotificationsPage = lazy(() => import('./user/pages/UserNotificationsPage'));
const UserNotificationSettings = lazy(() => import('./user/pages/UserNotificationSettings'));
const PatientCheckInPage = lazy(() => import('./pages/checkin/PatientCheckInPage'));
const ScanCheckInPage = lazy(() => import('./user/pages/ScanCheckInPage'));
const PaymePage = lazy(() => import('./pages/payment/PaymePage'));
const ClickPayPage = lazy(() => import('./pages/payment/ClickPayPage'));
const AlifPayPage = lazy(() => import('./pages/payment/AlifPayPage'));
const PaymentResultPage = lazy(() => import('./pages/payment/PaymentResultPage'));
const CartPage = lazy(() => import('./pages/CartPage'));
const CartCheckoutPage = lazy(() => import('./user/pages/CartCheckoutPage'));
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
                                <Suspense fallback={<BanisaLoader message="Yuklanmoqda..." />}>
                                <Routes>

                                    {/* ─── PUBLIC HOME PAGE ────────────────────────── */}
                                    <Route path="/" element={<Navigate to="/xizmatlar" replace />} />
                                    <Route path="/home" element={<PatientPublic><HomePage /></PatientPublic>} />

                                    {/* ─── PATIENT SITE (PUBLIC browse — login only at action points) ── */}
                                    <Route path="/xizmatlar" element={<PatientPublic><XizmatlarPage /></PatientPublic>} />
                                    <Route path="/xarita" element={<PatientPublic><MapSearchPage /></PatientPublic>} />
                                    <Route path="/xizmatlar/category/:category" element={<PatientPublic><XizmatlarCategoryPage /></PatientPublic>} />
                                    <Route path="/xizmatlar/:id" element={<PatientPublic><XizmatDetailPage /></PatientPublic>} />
                                    <Route path="/klinikalar" element={<PatientPublic><ClinicsPage /></PatientPublic>} />
                                    <Route path="/klinikalar/:id" element={<PatientPublic><ClinicDetailPage /></PatientPublic>} />
                                    <Route path="/doktorlar" element={<PatientPublic><DoctorsPage /></PatientPublic>} />
                                    <Route path="/doktorlar/:id" element={<PatientPublic><DoctorProfilePage /></PatientPublic>} />
                                    {/* Booking + calling an ambulance are ACTIONS → login required. */}
                                    <Route path="/doktorlar/:id/band/:clinicId" element={<UserGuard><DoctorBookingPage /></UserGuard>} />
                                    <Route path="/skory" element={<PatientPublic><SkoryPage /></PatientPublic>} />
                                    <Route path="/skory/order" element={<UserGuard><SkoryOrderPage /></UserGuard>} />
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
                                    <Route path="/skory/pay/:id" element={<SkoryPaymentPage />} />
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
                                </Suspense>
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
