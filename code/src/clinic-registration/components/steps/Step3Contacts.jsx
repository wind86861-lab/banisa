import React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Box, TextField, Typography, InputAdornment } from '@mui/material';
import { motion } from 'framer-motion';
import { step3Schema } from '../../utils/validation';
import PhoneInput from '../../../shared/components/PhoneInput';
import NavButtons from '../NavButtons';

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
};
const rowVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
};

const SectionLabel = ({ children }) => (
  <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: '#4A5568', textTransform: 'uppercase', letterSpacing: '0.8px', mb: 1.5, mt: 0.5 }}>
    {children}
  </Typography>
);

export default function Step3Contacts({ data, onNext, onPrev, currentStep }) {
  const { control, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(step3Schema),
    defaultValues: {
      primaryPhone: data.primaryPhone || '',
      secondaryPhone: data.secondaryPhone || '',
      emergencyPhone: data.emergencyPhone || '',
      email: data.email || '',
      website: data.website || '',
      telegram: data.telegram || '',
      instagram: data.instagram || '',
      facebook: data.facebook || '',
      youtube: data.youtube || '',
    },
  });

  const onSubmit = (values) => onNext(values);

  return (
    <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
      {/* Step header */}
      <Box sx={{ mb: 3, pb: 3, borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
        <Box sx={{
          width: 44, height: 44, borderRadius: '12px', flexShrink: 0,
          background: 'linear-gradient(135deg, rgba(10,36,99,0.08), rgba(62,146,204,0.12))',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.375rem',
        }}>📞</Box>
        <Box>
          <Typography sx={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '1.5rem', fontWeight: 700, color: '#0A2463', lineHeight: 1.2 }}>
            Aloqa Ma'lumotlari
          </Typography>
          <Typography sx={{ fontSize: '0.875rem', color: '#8892B0', mt: 0.5 }}>
            Mijozlar siz bilan qanday bog'lanishi mumkinligi haqida ma'lumot bering
          </Typography>
        </Box>
      </Box>

      <motion.div variants={containerVariants} initial="hidden" animate="visible">
        {/* Row 1 — 3 phones */}
        <motion.div variants={rowVariants}>
          <SectionLabel>Telefon raqamlar</SectionLabel>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: '16px', mb: 3 }}>
            <Controller name="primaryPhone" control={control} render={({ field }) => (
              <PhoneInput {...field} label="Asosiy telefon *" error={!!errors.primaryPhone} helperText={errors.primaryPhone?.message} />
            )} />
            <Controller name="secondaryPhone" control={control} render={({ field }) => (
              <PhoneInput {...field} label="Qo'shimcha telefon" error={!!errors.secondaryPhone} helperText={errors.secondaryPhone?.message} />
            )} />
            <Controller name="emergencyPhone" control={control} render={({ field }) => (
              <PhoneInput {...field} label="Favqulodda telefon" error={!!errors.emergencyPhone} helperText={errors.emergencyPhone?.message} />
            )} />
          </Box>
        </motion.div>

        {/* Row 2 — email + website */}
        <motion.div variants={rowVariants}>
          <SectionLabel>Internet aloqa</SectionLabel>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: '16px', mb: 3 }}>
            <Controller name="email" control={control} render={({ field }) => (
              <TextField {...field} label="Email manzil *" type="email"
                error={!!errors.email} helperText={errors.email?.message} placeholder="info@klinika.uz" />
            )} />
            <Controller name="website" control={control} render={({ field }) => (
              <TextField {...field} label="Veb-sayt" error={!!errors.website}
                helperText={errors.website?.message} placeholder="https://klinika.uz" />
            )} />
          </Box>
        </motion.div>

        {/* Row 3 — Telegram + Instagram */}
        <motion.div variants={rowVariants}>
          <SectionLabel>Ijtimoiy tarmoqlar</SectionLabel>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: '16px', mb: 2 }}>
            <Controller name="telegram" control={control} render={({ field }) => (
              <TextField {...field} label="Telegram" placeholder="@klinika_uz"
                InputProps={{ startAdornment: <InputAdornment position="start">✈️</InputAdornment> }} />
            )} />
            <Controller name="instagram" control={control} render={({ field }) => (
              <TextField {...field} label="Instagram" placeholder="https://instagram.com/klinika_uz"
                InputProps={{ startAdornment: <InputAdornment position="start">📸</InputAdornment> }} />
            )} />
          </Box>
        </motion.div>

        {/* Row 4 — Facebook + YouTube */}
        <motion.div variants={rowVariants}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: '16px' }}>
            <Controller name="facebook" control={control} render={({ field }) => (
              <TextField {...field} label="Facebook" placeholder="https://facebook.com/klinika.uz"
                InputProps={{ startAdornment: <InputAdornment position="start">📘</InputAdornment> }} />
            )} />
            <Controller name="youtube" control={control} render={({ field }) => (
              <TextField {...field} label="YouTube" placeholder="https://youtube.com/@klinika"
                InputProps={{ startAdornment: <InputAdornment position="start">▶️</InputAdornment> }} />
            )} />
          </Box>
        </motion.div>
      </motion.div>

      <NavButtons currentStep={currentStep} onPrev={onPrev} onNext={handleSubmit(onSubmit)} />
    </Box>
  );
}
