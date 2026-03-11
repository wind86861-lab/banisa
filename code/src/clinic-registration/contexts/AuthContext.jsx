import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../../services/api';
import { setAccessToken } from '../../shared/api/axios';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const data = await authApi.me();
      setUser(data?.data || data);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (phone, password) => {
    const data = await authApi.loginWithPhone(phone, password);
    setUser(data.user);

    if (['PENDING', 'IN_REVIEW', 'REJECTED'].includes(data.user.status)) {
      navigate('/status');
    } else if (data.user.status === 'APPROVED') {
      const welcomeSeen = localStorage.getItem(`welcome_seen_${data.user.clinicId}`);
      navigate(welcomeSeen ? '/dashboard' : '/welcome');
    }

    return data;
  };

  const loginWithTokens = (accessToken, userData) => {
    setAccessToken(accessToken);
    setUser(userData);
    if (['PENDING', 'IN_REVIEW', 'REJECTED'].includes(userData.status)) {
      navigate('/status');
    } else if (userData.status === 'APPROVED') {
      const welcomeSeen = localStorage.getItem(`welcome_seen_${userData.clinicId}`);
      navigate(welcomeSeen ? '/dashboard' : '/welcome');
    } else {
      navigate('/status');
    }
  };

  const logout = async () => {
    try { await authApi.logout(); } catch { /* ignore */ }
    setUser(null);
    navigate('/login');
  };

  const refetchStatus = async () => {
    try {
      const data = await authApi.me();
      const updated = data?.data || data;
      setUser(updated);
      return updated;
    } catch {
      return null;
    }
  };

  const value = {
    user,
    loading,
    login,
    loginWithTokens,
    logout,
    refetchStatus,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
