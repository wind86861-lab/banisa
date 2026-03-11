import React from 'react';
import { Box, CircularProgress } from '@mui/material';
import { ChevronLeft, ChevronRight, Send } from 'lucide-react';
import { motion } from 'framer-motion';

export default function NavButtons({
  currentStep,
  totalSteps = 8,
  onPrev,
  onNext,
  isSubmitting = false,
  submitProgress = 0,
  isLastStep = false,
}) {
  const isFirst = currentStep === 1;

  return (
    <Box sx={{
      position: 'sticky',
      bottom: 0,
      mt: 4,
      mx: { xs: '-20px', md: '-48px' },
      mb: { xs: '-28px', md: '-40px' },
      px: { xs: '20px', md: '48px' },
      py: '16px',
      bgcolor: 'rgba(255,255,255,0.96)',
      backdropFilter: 'blur(12px)',
      borderTop: '1px solid rgba(10,36,99,0.08)',
      borderRadius: '0 0 24px 24px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      zIndex: 10,
    }}>

      {/* Back button — invisible on step 1 to preserve layout */}
      <motion.button
        onClick={!isFirst && !isSubmitting ? onPrev : undefined}
        whileHover={!isFirst && !isSubmitting ? { x: -2 } : {}}
        whileTap={!isFirst && !isSubmitting ? { scale: 0.97 } : {}}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '10px 20px',
          borderRadius: 12,
          border: '1.5px solid #E8EDF5',
          background: 'transparent',
          color: '#4A5568',
          fontSize: '0.9375rem',
          fontWeight: 600,
          cursor: isFirst || isSubmitting ? 'default' : 'pointer',
          opacity: isFirst ? 0 : 1,
          pointerEvents: isFirst ? 'none' : 'auto',
          fontFamily: 'inherit',
          transition: 'all 0.2s ease',
        }}
      >
        <ChevronLeft size={18} />
        <span>Orqaga</span>
      </motion.button>

      {/* Step dots */}
      <Box sx={{ display: { xs: 'none', sm: 'flex' }, alignItems: 'center', gap: '6px' }}>
        {Array.from({ length: totalSteps }).map((_, i) => {
          const n = i + 1;
          const isActive = n === currentStep;
          const isCompleted = n < currentStep;
          return (
            <motion.div
              key={i}
              animate={{
                width: isActive ? 24 : isCompleted ? 6 : 8,
                height: isActive ? 8 : isCompleted ? 6 : 8,
                backgroundColor: isActive ? '#0A2463' : isCompleted ? '#00C9A7' : '#E8EDF5',
              }}
              style={{ borderRadius: 99 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
            />
          );
        })}
      </Box>

      {/* Next / Submit button */}
      <motion.button
        onClick={!isSubmitting ? onNext : undefined}
        whileHover={!isSubmitting ? { y: -1 } : {}}
        whileTap={!isSubmitting ? { y: 0, scale: 0.98 } : {}}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 28px',
          borderRadius: 12,
          border: 'none',
          background: isLastStep
            ? 'linear-gradient(135deg, #00C9A7, #0A9981)'
            : 'linear-gradient(135deg, #0A2463, #3E92CC)',
          color: 'white',
          fontSize: '0.9375rem',
          fontWeight: 700,
          cursor: isSubmitting ? 'not-allowed' : 'pointer',
          boxShadow: isLastStep
            ? '0 4px 12px rgba(0,201,167,0.35)'
            : '0 4px 12px rgba(10,36,99,0.3)',
          fontFamily: 'inherit',
          opacity: isSubmitting ? 0.85 : 1,
          transition: 'box-shadow 0.2s ease, opacity 0.2s ease',
        }}
      >
        {isSubmitting ? (
          <>
            <CircularProgress size={16} sx={{ color: 'white' }} />
            <span>Yuborilmoqda...</span>
          </>
        ) : isLastStep ? (
          <>
            <span>So'rov yuborish</span>
            <Send size={16} />
          </>
        ) : (
          <>
            <span>Keyingi</span>
            <ChevronRight size={18} />
          </>
        )}
      </motion.button>
    </Box>
  );
}
