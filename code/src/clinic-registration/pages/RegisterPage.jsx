import React from 'react';
import { Box, Typography, useMediaQuery, useTheme } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import StepIndicator from '../components/StepIndicator';
import SuccessScreen from '../components/SuccessScreen';
import Step1BasicInfo from '../components/steps/Step1BasicInfo';
import Step2Location from '../components/steps/Step2Location';
import Step3Contacts from '../components/steps/Step3Contacts';
import Step4WorkingHours from '../components/steps/Step4WorkingHours';
import Step5Services from '../components/steps/Step5Services';
import Step6AdminPerson from '../components/steps/Step6AdminPerson';
import Step7Documents from '../components/steps/Step7Documents';
import Step8Payment from '../components/steps/Step8Payment';
import { useRegistrationForm } from '../hooks/useRegistrationForm';
import { STEPS } from '../utils/constants';

const STEP_COMPONENTS = [
  Step1BasicInfo, Step2Location, Step3Contacts, Step4WorkingHours,
  Step5Services, Step6AdminPerson, Step7Documents, Step8Payment,
];

const stepVariants = {
  enter: (dir) => ({ x: dir > 0 ? 40 : -40, opacity: 0, scale: 0.98 }),
  center: {
    x: 0, opacity: 1, scale: 1,
    transition: { duration: 0.35, ease: [0.4, 0, 0.2, 1] },
  },
  exit: (dir) => ({
    x: dir > 0 ? -40 : 40, opacity: 0, scale: 0.98,
    transition: { duration: 0.25, ease: [0.4, 0, 0.2, 1] },
  }),
};

export default function RegisterPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const directionRef = React.useRef(1);
  const [tick, setTick] = React.useState(0);
  const [showCelebration, setShowCelebration] = React.useState(false);

  const {
    currentStep, formData, stepErrors, completedSteps,
    isSubmitting, submitProgress, isSubmitted, submittedEmail,
    nextStep, prevStep, goToStep, submitForm,
  } = useRegistrationForm();

  if (isSubmitted) return <SuccessScreen email={submittedEmail} />;

  const CurrentStep = STEP_COMPONENTS[currentStep - 1];
  const progress = (completedSteps.size / 8) * 100;
  const currentStepInfo = STEPS[currentStep - 1];

  const handleNext = async (stepData) => {
    directionRef.current = 1;
    setTick(t => t + 1);
    if (currentStep < 8) {
      nextStep(stepData);
    } else {
      setShowCelebration(true);
      try {
        await submitForm(stepData);
        const firstPhone = stepData?.persons?.[0]?.phone || formData?.persons?.[0]?.phone || '';
        navigate('/register/success', { state: { phone: firstPhone } });
      } catch (err) {
        setShowCelebration(false);
        alert(err.message || "Xatolik yuz berdi. Qayta urinib ko'ring.");
      }
    }
  };

  const handlePrev = () => {
    directionRef.current = -1;
    setTick(t => t + 1);
    prevStep();
  };

  const handleGoToStep = (step) => {
    directionRef.current = step > currentStep ? 1 : -1;
    setTick(t => t + 1);
    goToStep(step);
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#F0F4FF', display: 'flex', maxWidth: 1400, mx: 'auto' }}>

      {/* ── SIDEBAR (desktop only) ──────────────────────────────────── */}
      {!isMobile && (
        <Box sx={{
          width: 300, flexShrink: 0,
          position: 'sticky', top: 0, height: '100vh',
          overflow: 'hidden',
          background: 'linear-gradient(180deg, #0A2463 0%, #1a3a7a 100%)',
          display: 'flex', flexDirection: 'column',
          p: '32px 24px',
        }}>
          {/* Logo row */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
            <Box sx={{
              width: 48, height: 48, borderRadius: '50%', flexShrink: 0,
              background: 'rgba(255,255,255,0.15)',
              backdropFilter: 'blur(10px)',
              border: '1.5px solid rgba(255,255,255,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Typography sx={{ fontSize: '1.2rem', fontWeight: 700, color: 'white', lineHeight: 1, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                B
              </Typography>
            </Box>
            <Box>
              <Typography sx={{ color: 'white', fontWeight: 700, fontSize: '1.0625rem', lineHeight: 1.2, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                Banisa
              </Typography>
              <Typography sx={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem', mt: 0.25 }}>
                Klinika platformasi
              </Typography>
            </Box>
          </Box>

          {/* Divider */}
          <Box sx={{ height: '1px', bgcolor: 'rgba(255,255,255,0.15)', mb: 3 }} />

          {/* Progress bar */}
          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.75rem', fontWeight: 500 }}>
                Jarayon
              </Typography>
              <Typography sx={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.75rem', fontWeight: 700 }}>
                {Math.round(progress)}%
              </Typography>
            </Box>
            <Box sx={{ height: 4, bgcolor: 'rgba(255,255,255,0.2)', borderRadius: 99, overflow: 'hidden' }}>
              <motion.div
                style={{ height: '100%', background: 'linear-gradient(90deg, #00C9A7, #3E92CC)', borderRadius: 99 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
              />
            </Box>
          </Box>

          {/* Step list */}
          <Box sx={{ flex: 1, overflowY: 'auto', mx: -1, px: 1, '&::-webkit-scrollbar': { display: 'none' } }}>
            <StepIndicator
              currentStep={currentStep}
              completedSteps={completedSteps}
              stepErrors={stepErrors}
              onStepClick={handleGoToStep}
            />
          </Box>

          {/* Auto-save notice */}
          <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <Typography component="span" sx={{ fontSize: '0.875rem' }}>💾</Typography>
            <Typography sx={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.6875rem' }}>
              Ma'lumotlar avtomatik saqlanadi
            </Typography>
          </Box>
        </Box>
      )}

      {/* ── MOBILE TOP BAR ─────────────────────────────────────────── */}
      {isMobile && (
        <Box sx={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
          bgcolor: '#0A2463', px: '20px', pt: '16px', pb: '14px',
        }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.25 }}>
            <Typography sx={{ color: 'white', fontSize: '0.875rem', fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              {currentStepInfo?.icon} {currentStepInfo?.label}
            </Typography>
            <Typography sx={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8125rem', fontWeight: 500 }}>
              {currentStep} / 8
            </Typography>
          </Box>
          <Box sx={{ height: 3, bgcolor: 'rgba(255,255,255,0.2)', borderRadius: 99, overflow: 'hidden' }}>
            <motion.div
              style={{ height: '100%', background: 'linear-gradient(90deg, #00C9A7, #3E92CC)', borderRadius: 99 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.6 }}
            />
          </Box>
        </Box>
      )}

      {/* ── FORM AREA ──────────────────────────────────────────────── */}
      <Box sx={{ flex: 1, minWidth: 0, px: { xs: '20px', md: '56px' }, pt: { xs: '84px', md: '48px' }, pb: { xs: '32px', md: '48px' } }}>

        {/* Page title — desktop */}
        {!isMobile && (
          <Box sx={{ mb: 4 }}>
            <Typography sx={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '2.25rem', fontWeight: 800, color: '#0A2463', lineHeight: 1.2 }}>
              Klinikangizni Ro'yxatdan O'tkazing
            </Typography>
            <Typography sx={{ fontSize: '0.9375rem', color: '#8892B0', mt: 1 }}>
              Barcha 8 qadamni to'ldiring va arizangizni yuboring
            </Typography>
          </Box>
        )}

        {/* Form card */}
        <Box sx={{
          bgcolor: '#FFFFFF',
          borderRadius: '24px',
          p: { xs: '28px 20px', md: '40px 48px' },
          boxShadow: '0 4px 24px rgba(10,36,99,0.08), 0 1px 4px rgba(10,36,99,0.04)',
          border: '1px solid rgba(10,36,99,0.06)',
          position: 'relative',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0, left: 0, right: 0,
            height: '3px',
            background: 'linear-gradient(90deg, #0A2463, #3E92CC, #00C9A7)',
            borderRadius: '24px 24px 0 0',
          },
        }}>
          <AnimatePresence mode="wait" custom={directionRef.current}>
            <motion.div
              key={currentStep}
              custom={directionRef.current}
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
            >
              <CurrentStep
                data={formData}
                onNext={handleNext}
                onPrev={handlePrev}
                currentStep={currentStep}
                isSubmitting={isSubmitting}
                submitProgress={submitProgress}
              />
            </motion.div>
          </AnimatePresence>
        </Box>
      </Box>

      {/* Celebration confetti animation */}
      {showCelebration && (
        <Box sx={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          pointerEvents: 'none', zIndex: 9999, overflow: 'hidden',
        }}>
          {Array.from({ length: 50 }).map((_, i) => (
            <motion.div
              key={i}
              initial={{
                x: Math.random() * window.innerWidth,
                y: -20,
                rotate: Math.random() * 360,
                scale: Math.random() * 0.5 + 0.5,
              }}
              animate={{
                y: window.innerHeight + 100,
                rotate: Math.random() * 720 - 360,
              }}
              transition={{
                duration: Math.random() * 2 + 3,
                delay: Math.random() * 0.5,
                ease: 'linear',
              }}
              style={{
                position: 'absolute',
                width: 10,
                height: 10,
                background: ['#0A2463', '#3E92CC', '#00C9A7', '#FFD700', '#FF6B9D'][i % 5],
                borderRadius: i % 3 === 0 ? '50%' : '2px',
              }}
            />
          ))}
        </Box>
      )}
    </Box>
  );
}
