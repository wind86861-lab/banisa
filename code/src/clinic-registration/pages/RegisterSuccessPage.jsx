import React, { useEffect } from 'react';
import { Box, Typography, Button, Paper } from '@mui/material';
import { motion } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle, Clock, Phone, ArrowRight } from 'lucide-react';
import confetti from 'canvas-confetti';

const STEPS = [
  { icon: '✅', label: 'Ariza qabul qilindi', desc: 'Barcha ma\'lumotlaringiz saqlandi' },
  { icon: '🔍', label: 'Ko\'rib chiqilmoqda', desc: '1–3 ish kuni ichida javob beramiz' },
  { icon: '📱', label: 'SMS xabar', desc: 'Qaror haqida telefonga xabar yuboriladi' },
  { icon: '🚀', label: 'Panel ochiladi', desc: 'Klinika admin paneliga kirish imkoni' },
];

export default function RegisterSuccessPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const phone = location.state?.phone || '';

  useEffect(() => {
    const end = Date.now() + 2500;
    const frame = () => {
      confetti({ particleCount: 3, angle: 60, spread: 55, origin: { x: 0 }, colors: ['#00C9A7', '#3E92CC', '#0A2463', '#FFD700'] });
      confetti({ particleCount: 3, angle: 120, spread: 55, origin: { x: 1 }, colors: ['#00C9A7', '#3E92CC', '#0A2463', '#FFD700'] });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
  }, []);

  return (
    <Box sx={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #F8FAFF 0%, #EFF6FF 50%, #F0FDF4 100%)',
      p: 3,
    }}>
      <Box sx={{ maxWidth: 560, width: '100%', textAlign: 'center' }}>

        {/* Animated checkmark */}
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
        >
          <Box sx={{
            width: 100, height: 100, borderRadius: '50%', margin: '0 auto 28px',
            background: 'linear-gradient(135deg, #00C9A7, #0A9E82)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 16px 48px rgba(0,201,167,0.3)',
          }}>
            <CheckCircle size={48} color="white" strokeWidth={1.5} />
          </Box>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Typography sx={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: { xs: '1.75rem', md: '2.25rem' }, fontWeight: 800, color: '#0A2463', mb: 1,
          }}>
            Ariza yuborildi! 🎉
          </Typography>
          <Typography sx={{ fontSize: '1rem', color: '#64748B', mb: 1 }}>
            Arizangiz muvaffaqiyatli qabul qilindi
          </Typography>

          {/* Important notice */}
          <Box sx={{
            display: 'inline-block',
            bgcolor: 'rgba(255,193,7,0.08)', borderRadius: 2,
            px: 2.5, py: 1.5, mb: 3, border: '1px solid rgba(255,193,7,0.3)',
            maxWidth: 420,
          }}>
            <Typography sx={{ fontSize: '0.875rem', fontWeight: 600, color: '#F59E0B', mb: 0.5 }}>
              ⚠️ Muhim eslatma
            </Typography>
            <Typography sx={{ fontSize: '0.8125rem', color: '#92400E', lineHeight: 1.6 }}>
              Tizimga kirish uchun arizangiz admin tomonidan tasdiqlanishi kerak.
              Tasdiqlangandan so'ng SMS xabar olasiz.
            </Typography>
          </Box>

          {/* Login phone display */}
          {phone && (
            <Box sx={{
              display: 'inline-flex', alignItems: 'center', gap: 1,
              bgcolor: 'rgba(62,146,204,0.08)', borderRadius: 2,
              px: 2, py: 0.75, mb: 3, border: '1px solid rgba(62,146,204,0.2)',
            }}>
              <Phone size={15} color="#3E92CC" />
              <Typography sx={{ fontSize: '0.875rem', fontWeight: 600, color: '#3E92CC' }}>
                Login telefon: {phone}
              </Typography>
            </Box>
          )}
        </motion.div>

        {/* Timeline */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <Paper sx={{ p: 3, mb: 4, textAlign: 'left', borderRadius: '16px', boxShadow: '0 4px 24px rgba(10,36,99,0.08)' }}>
            <Typography sx={{ fontWeight: 700, color: '#0A2463', mb: 2.5, fontSize: '0.9375rem', display: 'flex', alignItems: 'center', gap: 1 }}>
              <Clock size={16} /> Ko'rib chiqish jarayoni
            </Typography>
            {STEPS.map((step, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 + idx * 0.12 }}
              >
                <Box sx={{ display: 'flex', gap: 2, position: 'relative' }}>
                  {idx < STEPS.length - 1 && (
                    <Box sx={{ position: 'absolute', left: 16, top: 34, bottom: 0, width: 2, bgcolor: '#E2E8F0' }} />
                  )}
                  <Box sx={{
                    width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                    bgcolor: idx === 0 ? 'rgba(0,201,167,0.12)' : '#F8FAFF',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1rem', zIndex: 1,
                    border: idx === 0 ? '1px solid rgba(0,201,167,0.3)' : '1px solid #E8EDF5',
                  }}>
                    {step.icon}
                  </Box>
                  <Box sx={{ pb: idx < STEPS.length - 1 ? 2.5 : 0, pt: 0.5 }}>
                    <Typography sx={{ fontSize: '0.875rem', fontWeight: 700, color: '#1E293B' }}>{step.label}</Typography>
                    <Typography sx={{ fontSize: '0.75rem', color: '#94A3B8' }}>{step.desc}</Typography>
                  </Box>
                </Box>
              </motion.div>
            ))}
          </Paper>
        </motion.div>

        {/* CTA */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.1 }}>
          <Button
            onClick={() => navigate('/login')}
            size="large"
            endIcon={<ArrowRight size={18} />}
            sx={{
              height: 52, px: 4, borderRadius: '14px',
              background: 'linear-gradient(135deg, #0A2463, #3E92CC)',
              color: 'white', fontSize: '1rem', fontWeight: 700, textTransform: 'none',
              fontFamily: "'DM Sans', sans-serif",
              '&:hover': { background: 'linear-gradient(135deg, #0d2d7a, #4a9dd9)', transform: 'translateY(-1px)' },
              transition: 'all 0.2s',
            }}
          >
            Ariza holatini ko'rish
          </Button>
          <Typography sx={{ mt: 2, fontSize: '0.75rem', color: '#94A3B8' }}>
            Savol bo'lsa: <strong>support@banisa.uz</strong>
          </Typography>
        </motion.div>
      </Box>
    </Box>
  );
}
