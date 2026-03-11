import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../shared/auth/AuthContext';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { loginAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/admin/dashboard';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await loginAdmin(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      const errData = err.response?.data?.error;
      setError(
        typeof errData === 'string' ? errData :
          typeof errData?.message === 'string' ? errData.message :
            err.message || 'Invalid email or password'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    }}>
      <div style={{
        background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(20px)',
        border: '1px solid rgba(148, 163, 184, 0.1)',
        borderRadius: 20, padding: '48px 56px', width: '100%', maxWidth: 440,
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255,255,255,0.05)',
      }}>
        {/* Logo & Title */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{
            width: 64, height: 64, borderRadius: 16,
            background: 'linear-gradient(135deg, #06B6D4 0%, #3B82F6 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px', fontSize: 28, fontWeight: 700, color: '#fff',
            boxShadow: '0 8px 32px rgba(6, 182, 212, 0.3)',
          }}>B</div>
          <div style={{ color: '#F1F5F9', fontSize: 24, fontWeight: 700, marginBottom: 4 }}>
            Super Admin Portal
          </div>
          <div style={{ color: '#94A3B8', fontSize: 14 }}>
            Banisa Healthcare Management System
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {error && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 10, padding: '12px 16px', marginBottom: 20,
              color: '#FCA5A5', fontSize: 14, lineHeight: 1.5,
            }}>
              ⚠️ {error}
            </div>
          )}

          <div style={{ marginBottom: 20 }}>
            <label style={{
              display: 'block', color: '#CBD5E1', fontSize: 13, fontWeight: 600,
              marginBottom: 8, letterSpacing: 0.3,
            }}>
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="admin@medicare.uz"
              autoComplete="email"
              required
              style={{
                width: '100%', background: 'rgba(15, 23, 42, 0.6)',
                border: '1px solid rgba(148, 163, 184, 0.2)',
                borderRadius: 10, padding: '12px 16px', color: '#F1F5F9',
                fontSize: 15, outline: 'none', boxSizing: 'border-box',
                transition: 'all 0.2s',
              }}
              onFocus={e => e.target.style.borderColor = 'rgba(6, 182, 212, 0.5)'}
              onBlur={e => e.target.style.borderColor = 'rgba(148, 163, 184, 0.2)'}
            />
          </div>

          <div style={{ marginBottom: 28 }}>
            <label style={{
              display: 'block', color: '#CBD5E1', fontSize: 13, fontWeight: 600,
              marginBottom: 8, letterSpacing: 0.3,
            }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Enter your password"
              autoComplete="current-password"
              required
              style={{
                width: '100%', background: 'rgba(15, 23, 42, 0.6)',
                border: '1px solid rgba(148, 163, 184, 0.2)',
                borderRadius: 10, padding: '12px 16px', color: '#F1F5F9',
                fontSize: 15, outline: 'none', boxSizing: 'border-box',
                transition: 'all 0.2s',
              }}
              onFocus={e => e.target.style.borderColor = 'rgba(6, 182, 212, 0.5)'}
              onBlur={e => e.target.style.borderColor = 'rgba(148, 163, 184, 0.2)'}
            />
          </div>

          <button
            type="submit"
            disabled={loading || !email || !password}
            style={{
              width: '100%', padding: '14px 0',
              background: loading || !email || !password
                ? 'rgba(148, 163, 184, 0.1)'
                : 'linear-gradient(135deg, #06B6D4 0%, #3B82F6 100%)',
              border: 'none', borderRadius: 10,
              color: loading || !email || !password ? '#64748B' : '#fff',
              fontSize: 15, fontWeight: 700,
              cursor: loading || !email || !password ? 'not-allowed' : 'pointer',
              boxShadow: loading || !email || !password
                ? 'none'
                : '0 4px 14px rgba(6, 182, 212, 0.4)',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => {
              if (!loading && email && password) {
                e.target.style.transform = 'translateY(-1px)';
                e.target.style.boxShadow = '0 6px 20px rgba(6, 182, 212, 0.5)';
              }
            }}
            onMouseLeave={e => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = loading || !email || !password
                ? 'none'
                : '0 4px 14px rgba(6, 182, 212, 0.4)';
            }}
          >
            {loading ? '⏳ Signing in...' : '🔐 Sign In'}
          </button>
        </form>

        <div style={{
          marginTop: 24, paddingTop: 24, borderTop: '1px solid rgba(148, 163, 184, 0.1)',
          textAlign: 'center', color: '#64748B', fontSize: 12,
        }}>
          Default: admin@medicare.uz / admin123
        </div>
      </div>
    </div>
  );
}
