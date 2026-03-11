import React, { useEffect } from 'react';
import { Box, Typography, Button } from '@mui/material';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../shared/auth/AuthContext';
import confetti from 'canvas-confetti';
import { Rocket, CheckCircle } from 'lucide-react';

const checklistItems = [
  { icon: '✅', text: 'Profilingiz tasdiqlandi' },
  { icon: '✅', text: 'Panel sizga ochiq' },
  { icon: '✅', text: 'Xizmatlarni sozlashingiz mumkin' },
];

const firstSteps = [
  '1. Xizmatlar va narxlarni kiriting',
  '2. Ish vaqtini sozlang',
  '3. Birinchi bronni qabul qiling',
];

export default function WelcomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user || user.status !== 'APPROVED') {
      navigate('/status');
      return;
    }

    // Trigger confetti
    const duration = 3000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#0A2463', '#3E92CC', '#00C9A7', '#FFD700', '#FF6B9D'],
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#0A2463', '#3E92CC', '#00C9A7', '#FFD700', '#FF6B9D'],
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };

    frame();
  }, [user, navigate]);

  const handleContinue = () => {
    if (user?.clinicId) {
      localStorage.setItem(`welcome_seen_${user.clinicId}`, 'true');
    }
    navigate('/dashboard');
  };

  if (!user) return null;

  return (
    <Box sx={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #F0F4FF, #E8F5FF)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      p: 3,
    }}>
      <Box sx={{ maxWidth: 600, width: '100%', textAlign: 'center' }}>
        {/* Animated emoji */}
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', duration: 0.8 }}
        >
          <Typography sx={{ fontSize: '5rem', mb: 2 }}>🎉</Typography>
        </motion.div>

        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Typography sx={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: { xs: '2rem', md: '2.5rem' },
            fontWeight: 800,
            color: '#0A2463',
            mb: 1,
          }}>
            Tabriklaymiz!
          </Typography>
          <Typography sx={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: { xs: '1.25rem', md: '1.5rem' },
            fontWeight: 700,
            color: '#3E92CC',
            mb: 1,
          }}>
            {user.firstName || 'Klinikangiz'}
          </Typography>
          <Typography sx={{
            fontSize: '1.125rem',
            color: '#64748B',
            mb: 4,
          }}>
            platformaga qo'shildi
          </Typography>
        </motion.div>

        {/* Checklist */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Box sx={{
            bgcolor: 'white',
            borderRadius: '20px',
            p: 3,
            mb: 3,
            boxShadow: '0 8px 32px rgba(10,36,99,0.1)',
          }}>
            {checklistItems.map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.7 + i * 0.1 }}
              >
                <Box sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  py: 1.5,
                  borderBottom: i < checklistItems.length - 1 ? '1px solid #F1F5F9' : 'none',
                }}>
                  <Box sx={{
                    width: 32,
                    height: 32,
                    borderRadius: '8px',
                    bgcolor: '#00C9A710',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <CheckCircle size={18} color="#00C9A7" />
                  </Box>
                  <Typography sx={{
                    fontSize: '1rem',
                    fontWeight: 600,
                    color: '#1E293B',
                    textAlign: 'left',
                  }}>
                    {item.text}
                  </Typography>
                </Box>
              </motion.div>
            ))}
          </Box>
        </motion.div>

        {/* CTA Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 }}
        >
          <Button
            onClick={handleContinue}
            size="large"
            sx={{
              height: 56,
              px: 4,
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #0A2463, #3E92CC)',
              color: 'white',
              fontSize: '1.125rem',
              fontWeight: 700,
              textTransform: 'none',
              fontFamily: "'DM Sans', sans-serif",
              mb: 4,
              '&:hover': {
                background: 'linear-gradient(135deg, #0d2d7a, #4a9dd9)',
                transform: 'translateY(-2px)',
                boxShadow: '0 8px 24px rgba(10,36,99,0.3)',
              },
              transition: 'all 0.2s',
            }}
          >
            <Rocket size={20} style={{ marginRight: 8 }} />
            Panelga o'tish
          </Button>
        </motion.div>

        {/* First Steps */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
        >
          <Typography sx={{
            fontSize: '0.875rem',
            fontWeight: 600,
            color: '#64748B',
            mb: 1.5,
          }}>
            Birinchi qadamlar:
          </Typography>
          {firstSteps.map((step, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1.3 + i * 0.1 }}
            >
              <Typography sx={{
                fontSize: '0.875rem',
                color: '#8892B0',
                mb: 0.5,
              }}>
                {step}
              </Typography>
            </motion.div>
          ))}
        </motion.div>
      </Box>
    </Box>
  );
}
