import React from 'react';
import { Box, Typography } from '@mui/material';
import { Check, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { STEPS } from '../utils/constants';

export default function StepIndicator({ currentStep, completedSteps, stepErrors, onStepClick }) {
  const getStepState = (step) => {
    if (completedSteps.has(step.id) && !stepErrors[step.id]) return 'completed';
    if (stepErrors[step.id]) return 'error';
    if (step.id === currentStep) return 'active';
    return 'upcoming';
  };

  const isClickable = (step) =>
    step.id < currentStep || completedSteps.has(step.id - 1) || step.id === currentStep;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
      {STEPS.map((step) => {
        const state = getStepState(step);
        const clickable = isClickable(step);

        return (
          <Box
            key={step.id}
            onClick={() => clickable && onStepClick(step.id)}
            sx={{
              display: 'flex', alignItems: 'center', gap: 1.5,
              p: '12px 16px', borderRadius: '12px',
              cursor: clickable ? 'pointer' : 'default',
              transition: 'all 0.2s ease',
              position: 'relative',
              mb: '2px',
              bgcolor: state === 'active' ? 'rgba(255,255,255,0.12)' : 'transparent',
              border: state === 'active' ? '1px solid rgba(255,255,255,0.2)' : '1px solid transparent',
              '&:hover': clickable && state !== 'active' ? { bgcolor: 'rgba(255,255,255,0.07)' } : {},
            }}
          >
            {/* Active left accent bar */}
            {state === 'active' && (
              <Box sx={{
                position: 'absolute', left: 0, top: '22%', bottom: '22%',
                width: 3, bgcolor: '#00C9A7', borderRadius: '0 3px 3px 0',
              }} />
            )}

            {/* Step circle */}
            <Box sx={{
              width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.3s ease',
              background: state === 'active'
                ? 'linear-gradient(135deg, #00C9A7, #3E92CC)'
                : state === 'completed' ? 'rgba(0,201,167,0.2)'
                  : state === 'error' ? 'rgba(230,57,70,0.2)'
                    : 'rgba(255,255,255,0.1)',
              border: state === 'active' ? 'none'
                : state === 'completed' ? '1.5px solid #00C9A7'
                  : state === 'error' ? '1.5px solid #E63946'
                    : '1.5px solid rgba(255,255,255,0.2)',
              boxShadow: state === 'active' ? '0 4px 12px rgba(0,201,167,0.4)' : 'none',
            }}>
              <AnimatePresence mode="wait">
                {state === 'completed' ? (
                  <motion.span
                    key="check"
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                    style={{ display: 'flex', alignItems: 'center' }}
                  >
                    <Check size={15} color="#00C9A7" strokeWidth={2.5} />
                  </motion.span>
                ) : state === 'error' ? (
                  <motion.span key="err" initial={{ scale: 0 }} animate={{ scale: 1 }} style={{ display: 'flex' }}>
                    <AlertTriangle size={15} color="#E63946" strokeWidth={2.5} />
                  </motion.span>
                ) : (
                  <motion.span key={`n${step.id}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <Typography sx={{
                      fontSize: '0.8rem', fontWeight: 700, lineHeight: 1,
                      color: state === 'active' ? 'white' : 'rgba(255,255,255,0.4)',
                    }}>
                      {step.id}
                    </Typography>
                  </motion.span>
                )}
              </AnimatePresence>
            </Box>

            {/* Step text */}
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{
                fontSize: '0.625rem', fontWeight: 500, lineHeight: 1, mb: 0.3,
                textTransform: 'uppercase', letterSpacing: '0.5px',
                color: state === 'active' ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.3)',
              }}>
                Qadam {step.id}
              </Typography>
              <Typography sx={{
                fontSize: '0.8125rem', lineHeight: 1.3,
                fontWeight: state === 'active' ? 700 : 600,
                color: state === 'active' ? 'white'
                  : state === 'completed' ? 'rgba(255,255,255,0.7)'
                    : state === 'error' ? '#E63946'
                      : 'rgba(255,255,255,0.35)',
              }}>
                {step.label}
              </Typography>
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}
