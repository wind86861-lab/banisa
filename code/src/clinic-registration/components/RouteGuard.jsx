import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../shared/auth/AuthContext';
import { Box, CircularProgress } from '@mui/material';

export default function RouteGuard({ children, requireStatus = 'APPROVED', requireRole = null }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <Box sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: '#F0F4FF',
      }}>
        <CircularProgress size={40} sx={{ color: '#3E92CC' }} />
      </Box>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Check status requirement
  if (requireStatus && user.status !== requireStatus) {
    // PENDING, IN_REVIEW, REJECTED → status page
    if (['PENDING', 'IN_REVIEW', 'REJECTED'].includes(user.status)) {
      return <Navigate to="/status" replace />;
    }
    // APPROVED but trying to access non-approved route
    if (user.status === 'APPROVED' && requireStatus !== 'APPROVED') {
      return <Navigate to="/dashboard" replace />;
    }
  }

  // Check role requirement
  if (requireRole && user.role !== requireRole) {
    // PENDING_CLINIC can only access status page
    if (user.role === 'PENDING_CLINIC') {
      return <Navigate to="/status" replace />;
    }
    // CLINIC_ADMIN trying to access admin-only routes
    if (requireRole === 'SUPER_ADMIN' && user.role !== 'SUPER_ADMIN') {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return children;
}
