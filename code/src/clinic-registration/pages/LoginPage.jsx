import React, { useState } from 'react';
import { Box, TextField, Button, Typography, InputAdornment, IconButton } from '@mui/material';
import { Phone, Eye, EyeOff, ArrowRight, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../shared/auth/AuthContext';
import PhoneInput from '../../shared/components/PhoneInput';

const statCards = [
  { icon: '🏥', label: '500+ Klinikalar', color: '#00C9A7' },
  { icon: '👥', label: '50,000+ Bemorlar', color: '#3E92CC' },
  { icon: '📍', label: '8 ta viloyat', color: '#FFD700' },
];

export default function LoginPage() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { loginClinic } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const justRegistered = new URLSearchParams(location.search).get('registered') === '1';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const user = await loginClinic(phone, password);
      // Navigate based on user status after successful login
      if (['PENDING', 'IN_REVIEW', 'REJECTED', 'SUSPENDED'].includes(user.status)) {
        navigate('/status');
      } else if (user.status === 'APPROVED' && user.role === 'CLINIC_ADMIN') {
        navigate('/clinic/dashboard');
      } else {
        navigate('/status');
      }
    } catch (err) {
      let errorMsg = 'Telefon yoki parol noto\'g\'ri';

      if (err.response?.data?.error) {
        const errorData = err.response.data.error;
        if (typeof errorData === 'object' && errorData.message) {
          errorMsg = errorData.message;
        } else if (typeof errorData === 'string') {
          errorMsg = errorData;
        }
      } else if (err.message) {
        errorMsg = err.message;
      }

      if ((err.response?.status === 400 || err.response?.status === 401) && justRegistered) {
        errorMsg = 'Arizangiz hali tasdiqlanmagan. Admin tasdiqlashini kuting va qayta urinib ko\'ring.';
      }

      setError(errorMsg);
      const form = document.getElementById('login-form');
      form?.classList.add('shake');
      setTimeout(() => form?.classList.remove('shake'), 500);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#F0F4FF' }}>
      {/* Left Panel - Decorative (desktop only) */}
      <Box sx={{
        display: { xs: 'none', md: 'flex' },
        width: '50%',
        background: 'linear-gradient(145deg, #0A2463 0%, #1a3a7a 60%, #0d4a8a 100%)',
        position: 'relative',
        overflow: 'hidden',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        p: 6,
      }}>
        {/* Logo */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <Box sx={{
            width: 56, height: 56, borderRadius: '50%',
            border: '3px solid white',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            bgcolor: 'rgba(255,255,255,0.1)',
            mb: 2,
          }}>
            <Typography sx={{ fontSize: '1.75rem' }}>🏥</Typography>
          </Box>
        </motion.div>

        {/* Tagline */}
        <Typography sx={{
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontSize: '1.5rem',
          fontWeight: 700,
          color: 'white',
          textAlign: 'center',
          mb: 6,
          maxWidth: 400,
        }}>
          O'zbekistonning eng yirik tibbiy platformasi
        </Typography>

        {/* Floating stat cards */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, width: '100%', maxWidth: 400 }}>
          {statCards.map((card, i) => (
            <motion.div
              key={i}
              initial={{ x: -50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.2 + i * 0.1, duration: 0.5 }}
            >
              <Box sx={{
                bgcolor: 'white',
                borderRadius: '16px',
                p: 2.5,
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                backdropFilter: 'blur(10px)',
              }}>
                <Box sx={{
                  width: 48, height: 48,
                  borderRadius: '12px',
                  bgcolor: `${card.color}15`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.5rem',
                }}>
                  {card.icon}
                </Box>
                <Typography sx={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: '1.125rem',
                  fontWeight: 600,
                  color: '#0A2463',
                }}>
                  {card.label}
                </Typography>
              </Box>
            </motion.div>
          ))}
        </Box>
      </Box>

      {/* Right Panel - Login Form */}
      <Box sx={{
        width: { xs: '100%', md: '50%' },
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 3,
      }}>
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
          style={{ width: '100%', maxWidth: 400 }}
        >
          <Box
            id="login-form"
            component="form"
            onSubmit={handleSubmit}
            sx={{
              bgcolor: 'white',
              borderRadius: '24px',
              p: 5,
              boxShadow: '0 8px 32px rgba(10,36,99,0.1)',
              '@keyframes shake': {
                '0%, 100%': { transform: 'translateX(0)' },
                '25%': { transform: 'translateX(-10px)' },
                '75%': { transform: 'translateX(10px)' },
              },
              '&.shake': {
                animation: 'shake 0.5s',
              },
            }}
          >
            {/* Header */}
            <Typography sx={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontSize: '1.75rem',
              fontWeight: 800,
              color: '#0A2463',
              mb: 0.5,
            }}>
              Xush kelibsiz
            </Typography>
            <Typography sx={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: '0.875rem',
              color: '#8892B0',
              mb: 4,
            }}>
              Hisobingizga kiring
            </Typography>

            {/* Registration success banner */}
            {justRegistered && (
              <Box sx={{
                display: 'flex', alignItems: 'center', gap: 1.5,
                p: '12px 16px', mb: 3,
                bgcolor: 'rgba(0,201,167,0.08)',
                border: '1px solid rgba(0,201,167,0.3)',
                borderRadius: '12px',
              }}>
                <CheckCircle size={18} color="#00C9A7" />
                <Typography sx={{ fontSize: '0.8125rem', color: '#00C9A7', fontWeight: 600 }}>
                  Ariza yuborildi! Tizimga kiring.
                </Typography>
              </Box>
            )}

            {/* Error */}
            {error && (
              <Box sx={{
                p: '10px 14px', mb: 2,
                bgcolor: 'rgba(239,68,68,0.06)',
                border: '1px solid rgba(239,68,68,0.2)',
                borderRadius: '10px',
              }}>
                <Typography sx={{ fontSize: '0.8125rem', color: '#EF4444' }}>{error}</Typography>
              </Box>
            )}

            {/* Phone Input */}
            <PhoneInput
              label="Telefon raqam"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+998 (90) 123-45-67"
              error={!!error}
              sx={{ mb: 2 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Phone size={18} color="#8892B0" />
                  </InputAdornment>
                ),
              }}
            />

            {/* Password Input */}
            <TextField
              label="Parol"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={!!error}
              fullWidth
              sx={{ mb: 3 }}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                      size="small"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            {/* Submit Button */}
            <Button
              type="submit"
              fullWidth
              disabled={loading || !phone || !password}
              sx={{
                height: 48,
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #0A2463, #3E92CC)',
                color: 'white',
                fontSize: '1rem',
                fontWeight: 700,
                textTransform: 'none',
                fontFamily: "'DM Sans', sans-serif",
                '&:hover': {
                  background: 'linear-gradient(135deg, #0d2d7a, #4a9dd9)',
                },
                '&:disabled': {
                  background: '#E8EDF5',
                  color: '#8892B0',
                },
              }}
            >
              {loading ? 'Kirish...' : 'Kirish'}
              {!loading && <ArrowRight size={18} style={{ marginLeft: 8 }} />}
            </Button>

            {/* Registration Link */}
            <Box sx={{ textAlign: 'center', mt: 3 }}>
              <Typography sx={{ fontSize: '0.875rem', color: '#64748B' }}>
                Klinikangiz yo'qmi?{' '}
                <Link
                  to="/register"
                  style={{
                    color: '#3E92CC',
                    textDecoration: 'none',
                    fontWeight: 600,
                  }}
                >
                  Ro'yxatdan o'ting →
                </Link>
              </Typography>
            </Box>
          </Box>
        </motion.div>
      </Box>
    </Box>
  );
}
