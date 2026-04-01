import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { useUserAuth } from './UserAuthContext';
import HomePage from '../../pages/home/HomePage';

const AuthLoading = () => (
  <div style={{
    width: '100vw', height: '100vh',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: '#F0F4FF',
  }}>
    <div style={{ color: '#0A2463', fontFamily: 'sans-serif', fontSize: 16 }}>
      Yuklanmoqda...
    </div>
  </div>
);

const PENDING_STATUSES = ['PENDING', 'IN_REVIEW', 'REJECTED', 'SUSPENDED'];

// ─── ROOT REDIRECT ────────────────────────────────────────────────────────
// "/" always shows public HomePage — users access dashboards via direct links
export const RootRedirect = () => {
  return <HomePage />;
};

// ─── SUPER ADMIN ──────────────────────────────────────────────────────────
// Protects /admin/* routes — only SUPER_ADMIN can enter
export const SuperAdminGuard = ({ children }) => {
  const { user, isLoading } = useAuth();
  const location = useLocation();
  if (isLoading) return <AuthLoading />;
  if (!user) return <Navigate to="/admin/login" state={{ from: location }} replace />;
  if (user.role !== 'SUPER_ADMIN') return <Navigate to="/403" replace />;
  return children;
};

// ─── ADMIN PUBLIC ONLY ────────────────────────────────────────────────────
// For /admin/login — if already logged in as SUPER_ADMIN go to admin dashboard;
// any other logged-in user is sent to their own area (not the admin login form)
export const AdminPublicOnlyGuard = ({ children }) => {
  const { user, isLoading } = useAuth();
  if (isLoading) return <AuthLoading />;
  if (!user) return children;
  if (user.role === 'SUPER_ADMIN') return <Navigate to="/admin/dashboard" replace />;
  // Clinic admin who accidentally hits /admin/login → back to clinic login
  return <Navigate to="/login" replace />;
};

// ─── CLINIC PUBLIC ONLY ───────────────────────────────────────────────────
// For /login — if already logged in redirect to the right place;
// super admin must never be shown the clinic login form
export const ClinicPublicOnlyGuard = ({ children }) => {
  const { user, isLoading } = useAuth();
  if (isLoading) return <AuthLoading />;
  if (!user) return children;
  if (user.role === 'SUPER_ADMIN') return <Navigate to="/admin/dashboard" replace />;
  if (user.role === 'PENDING_CLINIC') return <Navigate to="/status" replace />;
  if (PENDING_STATUSES.includes(user.status)) return <Navigate to="/status" replace />;
  if (user.role === 'CLINIC_ADMIN') return <Navigate to="/clinic/dashboard" replace />;
  return children;
};

// ─── CLINIC GUARD ─────────────────────────────────────────────────────────
// Protects /clinic/* routes — only approved CLINIC_ADMIN can enter
export const ClinicGuard = ({ children }) => {
  const { user, isLoading } = useAuth();
  const location = useLocation();
  if (isLoading) return <AuthLoading />;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  if (user.role === 'SUPER_ADMIN') return <Navigate to="/403" replace />;
  if (user.role === 'PENDING_CLINIC') return <Navigate to="/status" replace />;
  if (user.role !== 'CLINIC_ADMIN') return <Navigate to="/403" replace />;
  if (PENDING_STATUSES.includes(user.status)) return <Navigate to="/status" replace />;
  return children;
};

// ─── STATUS GUARD ─────────────────────────────────────────────────────────
// For /status and /welcome — requires clinic admin login; approved clinic admin goes to panel
export const StatusGuard = ({ children }) => {
  const { user, isLoading } = useAuth();
  const { user: patientUser } = useUserAuth();

  if (isLoading) return <AuthLoading />;

  // If patient is logged in, redirect to patient dashboard
  if (patientUser?.role === 'PATIENT') return <Navigate to="/user/dashboard" replace />;

  // If no clinic admin user, redirect to login
  if (!user) return <Navigate to="/login" replace />;

  // Super admin should not see status page
  if (user.role === 'SUPER_ADMIN') return <Navigate to="/admin/dashboard" replace />;

  // Allow PENDING_CLINIC to see status page
  if (user.role === 'PENDING_CLINIC') return children;

  // Approved CLINIC_ADMIN should go to dashboard
  if (user.role === 'CLINIC_ADMIN' && user.status === 'APPROVED') return <Navigate to="/clinic/dashboard" replace />;

  return children;
};

// ─── USER (PATIENT) GUARD ─────────────────────────────────────────────────
// Protects /user/* routes — only authenticated PATIENT can enter
export const UserGuard = ({ children }) => {
  const { user, isLoading } = useUserAuth();
  const location = useLocation();
  if (isLoading) return <AuthLoading />;
  if (!user) return <Navigate to="/user/login" state={{ from: location.pathname }} replace />;
  if (user.role !== 'PATIENT') return <Navigate to="/403" replace />;
  return children;
};

// ─── USER PUBLIC ONLY GUARD ───────────────────────────────────────────────
// For /user/login and /user/signup — redirect already-logged-in users
export const UserPublicOnlyGuard = ({ children }) => {
  const { user: clinicUser, isLoading: clinicLoading } = useAuth();
  const { user: patientUser, isLoading: patientLoading } = useUserAuth();
  if (clinicLoading || patientLoading) return <AuthLoading />;
  // Already logged in — redirect to correct dashboard
  if (patientUser?.role === 'PATIENT') return <Navigate to="/user/dashboard" replace />;
  if (clinicUser?.role === 'SUPER_ADMIN') return <Navigate to="/admin/dashboard" replace />;
  if (clinicUser?.role === 'CLINIC_ADMIN') return <Navigate to="/clinic/dashboard" replace />;
  return children;
};
