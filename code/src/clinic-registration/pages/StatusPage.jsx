import React, { useState, useEffect } from 'react';
import {
  Box, Paper, Typography, Button, CircularProgress, Chip, Divider,
} from '@mui/material';
import { motion } from 'framer-motion';
import { CheckCircle, Clock, Search, XCircle, AlertCircle, RefreshCw, LogOut } from 'lucide-react';
import { useAuth } from '../../shared/auth/AuthContext';
import { useNavigate } from 'react-router-dom';

const maskPhone = (phone) => {
  if (!phone) return '—';
  return phone.replace(/(\+998)(\d{2})(\d{3})(\d{2})(\d{2})/, '$1 $2 *** ** $5');
};

const STATUS_CONFIG = {
  PENDING: {
    icon: <Clock size={28} />,
    label: "Ko'rib chiqilmoqda",
    color: '#F59E0B',
    bgColor: 'rgba(245,158,11,0.08)',
    desc: "Arizangiz qabul qilindi. 1-3 ish kuni ichida ko'rib chiqamiz. Natijani bu sahifadan kuzating.",
  },
  IN_REVIEW: {
    icon: <Search size={28} />,
    label: "Tekshirilmoqda",
    color: '#3E92CC',
    bgColor: 'rgba(62,146,204,0.08)',
    desc: "Hujjatlaringiz ko'rib chiqilmoqda. Tez orada javob beramiz.",
  },
  APPROVED: {
    icon: <CheckCircle size={28} />,
    label: "Tasdiqlandi",
    color: '#00C9A7',
    bgColor: 'rgba(0,201,167,0.08)',
    desc: "Tabriklaymiz! Arizangiz tasdiqlandi.",
  },
  REJECTED: {
    icon: <XCircle size={28} />,
    label: "Ariza rad etildi",
    color: '#EF4444',
    bgColor: 'rgba(239,68,68,0.08)',
    desc: "Afsuski, arizangiz rad etildi. Sababini quyida ko'ring.",
  },
};

const TIMELINE_STEPS = [
  { key: 'PENDING', label: "Yuborildi", icon: <CheckCircle size={16} /> },
  { key: 'IN_REVIEW', label: "Ko'rilmoqda", icon: <Search size={16} /> },
  { key: 'APPROVED', label: "Tasdiqlash", icon: <AlertCircle size={16} /> },
  { key: 'FINAL', label: "Kirish", icon: <CheckCircle size={16} /> },
];

const STATUS_ORDER = ['PENDING', 'IN_REVIEW', 'APPROVED'];

export default function StatusPage() {
  const { user, logout, refetchStatus } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [lastChecked, setLastChecked] = useState(new Date());

  useEffect(() => {
    if (user?.status === 'APPROVED') {
      navigate('/welcome');
    }
  }, [user?.status, navigate]);

  useEffect(() => {
    if (['PENDING', 'IN_REVIEW'].includes(user?.status)) {
      const interval = setInterval(async () => {
        const updated = await refetchStatus();
        setLastChecked(new Date());
        if (updated?.status === 'APPROVED') {
          navigate('/welcome');
        }
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [user?.status, refetchStatus, navigate]);

  const handleRefresh = async () => {
    setLoading(true);
    await refetchStatus();
    setLastChecked(new Date());
    setLoading(false);
  };

  if (!user) {
    navigate('/login');
    return null;
  }

  const statusInfo = STATUS_CONFIG[user.status] || STATUS_CONFIG.PENDING;
  const currentStatusIdx = STATUS_ORDER.indexOf(user.status);

  return (
    <Box sx={{
      minHeight: '100vh',
      bgcolor: '#F8FAFF',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      p: 3,
    }}>
      <Box sx={{ maxWidth: 640, width: '100%' }}>
        {/* Header with Logout */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box sx={{
                width: 44, height: 44, borderRadius: 2,
                background: 'linear-gradient(135deg, #0A2463, #3E92CC)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Typography sx={{ color: 'white', fontSize: '1.3rem' }}>🏥</Typography>
              </Box>
              <Box>
                <Typography variant="h6" fontWeight={800} color="#0A2463">Banisa</Typography>
                <Typography variant="caption" color="text.secondary">Ariza holati</Typography>
              </Box>
            </Box>
            <Button
              size="small"
              variant="outlined"
              startIcon={<LogOut size={14} />}
              onClick={logout}
              sx={{ fontSize: '0.75rem' }}
            >
              Chiqish
            </Button>
          </Box>
        </motion.div>

        <Paper sx={{ borderRadius: 4, overflow: 'hidden', boxShadow: '0 8px 32px rgba(10,36,99,0.10)' }}>
          {/* Status banner */}
          <Box sx={{ p: 3, bgcolor: statusInfo.bgColor, borderBottom: '1px solid #F1F5F9' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ color: statusInfo.color }}>{statusInfo.icon}</Box>
              <Box sx={{ flex: 1 }}>
                <Chip label={statusInfo.label} size="small"
                  sx={{ bgcolor: statusInfo.color, color: 'white', fontWeight: 700, mb: 0.5 }} />
                <Typography variant="body2" color="text.secondary">{statusInfo.desc}</Typography>
              </Box>
            </Box>
          </Box>

          <Box sx={{ p: 3 }}>
            {/* Clinic info */}
            <Typography variant="subtitle2" color="#0A2463" sx={{ mb: 2 }}>
              Ariza ma'lumotlari
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5, mb: 3 }}>
              {[
                { label: "Klinika nomi", value: user.firstName || '—' },
                { label: "Klinika turi", value: '🔬 Diagnostika markazi' },
                { label: "📱 Login telefon", value: maskPhone(user.phone) },
                { label: "Manzil", value: 'Toshkent, Yunusobod' },
              ].map(item => (
                <Box key={item.label} sx={{ p: 1.5, bgcolor: '#F8FAFF', borderRadius: 2 }}>
                  <Typography variant="caption" color="text.secondary" display="block">{item.label}</Typography>
                  <Typography variant="body2" fontWeight={600} color="#1E293B" noWrap>{item.value || '—'}</Typography>
                </Box>
              ))}
            </Box>

            {/* Rejection reason */}
            {user.status === 'REJECTED' && (
              <Box sx={{ p: 2, bgcolor: 'rgba(239,68,68,0.05)', borderRadius: 2, border: '1px solid rgba(239,68,68,0.2)', mb: 3 }}>
                <Typography variant="subtitle2" color="error" sx={{ mb: 0.5 }}>Rad etish sababi:</Typography>
                <Typography variant="body2" color="text.secondary">Litsenziya muddati o'tgan</Typography>
                <Button size="small" variant="contained" sx={{ mt: 2, bgcolor: '#EF4444' }}>
                  Qayta yuborish →
                </Button>
              </Box>
            )}

            <Divider sx={{ my: 2.5 }} />

            {/* Timeline */}
            <Typography variant="subtitle2" color="#0A2463" sx={{ mb: 2 }}>Ko'rib chiqish jarayoni</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {TIMELINE_STEPS.map((step, idx) => {
                const isDone = currentStatusIdx > idx || (currentStatusIdx === idx && user.status === 'APPROVED');
                const isActive = STATUS_ORDER[currentStatusIdx] === step.key;
                const isRejected = user.status === 'REJECTED' && isActive;

                return (
                  <Box key={step.key} sx={{ display: 'flex', gap: 2, position: 'relative' }}>
                    {idx < TIMELINE_STEPS.length - 1 && (
                      <Box sx={{
                        position: 'absolute', left: 15, top: 32, bottom: 0, width: 2,
                        bgcolor: isDone ? '#00C9A7' : '#E2E8F0',
                      }} />
                    )}
                    <Box sx={{
                      width: 32, height: 32, borderRadius: '50%', flexShrink: 0, zIndex: 1,
                      bgcolor: isDone ? '#00C9A7' : isActive ? (isRejected ? '#EF4444' : '#3E92CC') : '#E2E8F0',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: (isDone || isActive) ? 'white' : '#94A3B8',
                      boxShadow: isActive ? '0 0 0 4px rgba(62,146,204,0.2)' : 'none',
                    }}>
                      {isRejected ? <XCircle size={14} /> : step.icon}
                    </Box>
                    <Box sx={{ pb: idx < TIMELINE_STEPS.length - 1 ? 2.5 : 0, pt: 0.5 }}>
                      <Typography variant="body2" fontWeight={isActive ? 700 : 500}
                        color={isDone ? '#00C9A7' : isActive ? '#1E293B' : '#94A3B8'}>
                        {step.label}
                      </Typography>
                    </Box>
                  </Box>
                );
              })}
            </Box>
          </Box>

          {/* Footer */}
          <Box sx={{ px: 3, pb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {lastChecked && (
              <Typography variant="caption" color="text.secondary">
                Oxirgi yangilanish: {lastChecked.toLocaleTimeString('uz-UZ')}
              </Typography>
            )}
            <Button size="small" startIcon={loading ? <CircularProgress size={12} /> : <RefreshCw size={14} />}
              onClick={handleRefresh} disabled={loading} variant="outlined"
              sx={{ fontSize: '0.75rem' }}>
              Yangilash
            </Button>
          </Box>
        </Paper>

        <Box sx={{ mt: 3, textAlign: 'center' }}>
          <Typography variant="caption" color="text.secondary">
            Savol va muammo bo'lsa:{' '}
            <Box component="a" href="mailto:support@banisa.uz" sx={{ color: '#3E92CC', textDecoration: 'none' }}>
              support@banisa.uz
            </Box>
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
