import React from 'react';
import { Box, Typography, Button, Paper } from '@mui/material';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Mail, Clock, Search, ThumbsUp } from 'lucide-react';

const TIMELINE = [
  { icon: <CheckCircle size={18} />, label: "Ariza qabul qilindi", desc: "Sizning arizangiz muvaffaqiyatli yuborildi", color: '#00C9A7' },
  { icon: <Search size={18} />, label: "Ko'rib chiqilmoqda", desc: "Adminlar arizangizni ko'rib chiqishmoqda", color: '#3E92CC' },
  { icon: <Mail size={18} />, label: "Email yuboriladi", desc: "Qaror haqida emailga xabar beriladi", color: '#F59E0B' },
  { icon: <ThumbsUp size={18} />, label: "Ruxsat beriladi", desc: "Klinika panelga kirish imkoni ochiladi", color: '#0A2463' },
];

export default function SuccessScreen({ email }) {
  const navigate = useNavigate();
  return (
    <Box sx={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #F8FAFF 0%, #EFF6FF 50%, #F0FDF4 100%)',
      p: 3,
    }}>
      <Box sx={{ maxWidth: 600, width: '100%', textAlign: 'center' }}>
        {/* Animated checkmark */}
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
        >
          <Box sx={{
            width: 120, height: 120, borderRadius: '50%', margin: '0 auto 32px',
            background: 'linear-gradient(135deg, #00C9A7, #0A9E82)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 20px 60px rgba(0,201,167,0.3)',
          }}>
            <CheckCircle size={56} color="white" strokeWidth={1.5} />
          </Box>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Typography variant="h3" fontWeight={800} sx={{ color: '#0A2463', mb: 1 }}>
            Tabriklaymiz! 🎉
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ mb: 1, fontWeight: 400 }}>
            Arizangiz muvaffaqiyatli yuborildi
          </Typography>
          {email && (
            <Box sx={{
              display: 'inline-flex', alignItems: 'center', gap: 1,
              bgcolor: 'rgba(62,146,204,0.08)', borderRadius: 2,
              px: 2, py: 0.75, mb: 4,
            }}>
              <Mail size={16} color="#3E92CC" />
              <Typography variant="body2" fontWeight={500} color="#3E92CC">{email}</Typography>
            </Box>
          )}
        </motion.div>

        {/* Approval timeline */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
          <Paper elevation={1} sx={{ p: 3, mb: 4, textAlign: 'left' }}>
            <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 3, color: '#0A2463' }}>
              ⏳ Ko'rib chiqish jarayoni
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {TIMELINE.map((item, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.7 + idx * 0.15 }}
                >
                  <Box sx={{ display: 'flex', gap: 2, position: 'relative' }}>
                    {/* Connector line */}
                    {idx < TIMELINE.length - 1 && (
                      <Box sx={{
                        position: 'absolute', left: 18, top: 36, bottom: 0,
                        width: 2, bgcolor: '#E2E8F0', zIndex: 0,
                      }} />
                    )}
                    {/* Icon circle */}
                    <Box sx={{
                      width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                      bgcolor: `${item.color}15`, display: 'flex',
                      alignItems: 'center', justifyContent: 'center',
                      color: item.color, zIndex: 1,
                      border: `2px solid ${item.color}30`,
                    }}>
                      {item.icon}
                    </Box>
                    <Box sx={{ pb: idx < TIMELINE.length - 1 ? 3 : 0, pt: 0.5 }}>
                      <Typography variant="body2" fontWeight={700} sx={{ color: '#1E293B', lineHeight: 1.3 }}>
                        {item.label}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {item.desc}
                      </Typography>
                    </Box>
                  </Box>
                </motion.div>
              ))}
            </Box>
          </Paper>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }}>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              onClick={() => navigate('/login?registered=1')}
              startIcon={<Clock size={18} />}
              sx={{ background: 'linear-gradient(135deg, #0A2463, #3E92CC)' }}
            >
              Tizimga kirish →
            </Button>
          </Box>

          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 3 }}>
            Savol va muammo bo'lsa: <strong>support@banisa.uz</strong> yoki{' '}
            <strong>+998 71 123-45-67</strong>
          </Typography>
        </motion.div>
      </Box>
    </Box>
  );
}
