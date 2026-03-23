import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
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
  if (!user) return <Navigate to="/" state={{ from: location }} replace />;
  if (user.role === 'SUPER_ADMIN') return <Navigate to="/403" replace />;
  if (user.role === 'PENDING_CLINIC') return <Navigate to="/status" replace />;
  if (user.role !== 'CLINIC_ADMIN') return <Navigate to="/403" replace />;
  if (PENDING_STATUSES.includes(user.status)) return <Navigate to="/status" replace />;
  return children;
};

// ─── STATUS GUARD ─────────────────────────────────────────────────────────
// For /status and /welcome — requires login; approved clinic admin goes to panel
export const StatusGuard = ({ children }) => {
  const { user, isLoading } = useAuth();
  if (isLoading) return <AuthLoading />;
  if (!user) return <Navigate to="/" replace />;
  if (user.role === 'SUPER_ADMIN') return <Navigate to="/admin/dashboard" replace />;
  // Allow PENDING_CLINIC to see status page
  if (user.role === 'PENDING_CLINIC') return children;
  // Approved CLINIC_ADMIN should go to dashboard
  if (user.role === 'CLINIC_ADMIN' && user.status === 'APPROVED') return <Navigate to="/clinic/dashboard" replace />;
  return children;
};
