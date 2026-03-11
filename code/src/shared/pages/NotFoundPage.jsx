import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export default function NotFoundPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleGoHome = () => {
    if (!user) {
      navigate('/login');
    } else if (user.role === 'SUPER_ADMIN') {
      navigate('/admin/dashboard');
    } else if (user.role === 'CLINIC_ADMIN') {
      if (['PENDING', 'IN_REVIEW', 'REJECTED', 'SUSPENDED'].includes(user.status)) {
        navigate('/status');
      } else {
        navigate('/clinic/dashboard');
      }
    } else {
      navigate('/login');
    }
  };

  return (
    <div style={{
      width: '100vw', height: '100vh',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: '#070B14', color: '#F1F5F9',
      fontFamily: 'IBM Plex Sans, sans-serif',
    }}>
      <div style={{
        fontFamily: 'IBM Plex Mono, monospace',
        fontSize: 96, color: '#1A2235', fontWeight: 700, lineHeight: 1,
      }}>
        404
      </div>
      <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 24, fontWeight: 700, marginTop: 16 }}>
        Sahifa topilmadi
      </div>
      <div style={{ color: '#475569', marginTop: 8, fontSize: 14 }}>
        Siz qidirayotgan sahifa mavjud emas
      </div>
      <div style={{ display: 'flex', gap: 12, marginTop: 32 }}>
        <button onClick={handleGoHome} style={{
          padding: '10px 24px', borderRadius: 10,
          background: 'rgba(0,212,168,0.12)',
          border: '1px solid rgba(0,212,168,0.3)',
          color: '#00D4A8', fontSize: 14, cursor: 'pointer',
        }}>
          Bosh sahifa
        </button>
        {!user && (
          <Link to="/register" style={{
            padding: '10px 24px', borderRadius: 10,
            border: '1px solid rgba(255,255,255,0.1)',
            color: '#94A3B8', textDecoration: 'none', fontSize: 14,
          }}>
            Ro'yxatdan o'tish
          </Link>
        )}
      </div>
    </div>
  );
}
