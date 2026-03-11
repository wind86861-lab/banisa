import React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Box, TextField, MenuItem, Typography } from '@mui/material';
import { motion } from 'framer-motion';
import { step8Schema } from '../../utils/validation';
import { BANKS, PAYMENT_METHODS } from '../../utils/constants';
import NavButtons from '../NavButtons';

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
};
const rowVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
};

export default function Step8Payment({ data, onNext, onPrev, currentStep, isSubmitting, submitProgress }) {
  const { control, handleSubmit, watch, setValue, formState: { errors } } = useForm({
    resolver: zodResolver(step8Schema),
    defaultValues: {
      bankName: data.bankName || '',
      bankAccountNumber: data.bankAccountNumber || '',
      mfo: data.mfo || '',
      oked: data.oked || '',
      vatNumber: data.vatNumber || '',
      paymentMethods: data.paymentMethods || [],
      invoiceEmail: data.invoiceEmail || '',
    },
  });

  const selectedMethods = watch('paymentMethods') || [];

  const togglePayment = (method) => {
    const next = selectedMethods.includes(method)
      ? selectedMethods.filter(m => m !== method)
      : [...selectedMethods, method];
    setValue('paymentMethods', next, { shouldValidate: true });
  };

  const onSubmit = (values) => onNext(values);

  return (
    <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
      {/* Step header */}
      <Box sx={{ mb: 3, pb: 3, borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
        <Box sx={{
          width: 44, height: 44, borderRadius: '12px', flexShrink: 0,
          background: 'linear-gradient(135deg, rgba(10,36,99,0.08), rgba(62,146,204,0.12))',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.375rem',
        }}>🏦</Box>
        <Box>
          <Typography sx={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '1.5rem', fontWeight: 700, color: '#0A2463', lineHeight: 1.2 }}>
            To'lov Ma'lumotlari
          </Typography>
          <Typography sx={{ fontSize: '0.875rem', color: '#8892B0', mt: 0.5 }}>
            Moliyaviy hisob-kitob ma'lumotlarini kiriting
          </Typography>
        </Box>
      </Box>

      <motion.div variants={containerVariants} initial="hidden" animate="visible">
        {/* Row 1 — bank + account number */}
        <motion.div variants={rowVariants}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: '16px', mb: 2 }}>
            <Controller name="bankName" control={control} render={({ field }) => (
              <TextField {...field} select label="Bank nomi *" error={!!errors.bankName} helperText={errors.bankName?.message}>
                <MenuItem value=""><em>Tanlang...</em></MenuItem>
                {BANKS.map(b => <MenuItem key={b.value} value={b.value}>{b.label}</MenuItem>)}
              </TextField>
            )} />
            <Controller name="bankAccountNumber" control={control} render={({ field }) => (
              <TextField {...field} label="Hisob raqami *" error={!!errors.bankAccountNumber}
                helperText={errors.bankAccountNumber?.message}
                placeholder="00000000000000000000" inputProps={{ maxLength: 20 }} />
            )} />
          </Box>
        </motion.div>

        {/* Row 2 — MFO + OKED + VAT */}
        <motion.div variants={rowVariants}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: '16px', mb: 2 }}>
            <Controller name="mfo" control={control} render={({ field }) => (
              <TextField {...field} label="MFO *" error={!!errors.mfo}
                helperText={errors.mfo?.message} placeholder="00000" inputProps={{ maxLength: 5 }} />
            )} />
            <Controller name="oked" control={control} render={({ field }) => (
              <TextField {...field} label="OKED" placeholder="86100" />
            )} />
            <Controller name="vatNumber" control={control} render={({ field }) => (
              <TextField {...field} label="QQS raqami" placeholder="301000000" />
            )} />
          </Box>
        </motion.div>

        {/* Row 3 — payment method toggle cards */}
        <motion.div variants={rowVariants}>
          <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600, color: '#4A5568', mb: 1 }}>
            To'lov usullari *
          </Typography>
          {errors.paymentMethods && (
            <Typography sx={{ fontSize: '0.75rem', color: '#E63946', mb: 1 }}>
              {errors.paymentMethods.message}
            </Typography>
          )}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
            {PAYMENT_METHODS.map(pm => {
              const isSelected = selectedMethods.includes(pm.value);
              return (
                <Box
                  key={pm.value}
                  onClick={() => togglePayment(pm.value)}
                  sx={{
                    display: 'inline-flex', alignItems: 'center', gap: 1,
                    px: '20px', py: '12px', borderRadius: '12px', cursor: 'pointer',
                    border: `1.5px solid ${isSelected ? '#0A2463' : '#E8EDF5'}`,
                    bgcolor: isSelected ? 'rgba(10,36,99,0.05)' : '#FFFFFF',
                    transition: 'all 0.15s ease',
                    '&:hover': { borderColor: '#0A2463' },
                  }}
                >
                  <Typography component="span" sx={{ fontSize: '1rem', lineHeight: 1 }}>{pm.icon}</Typography>
                  <Typography sx={{
                    fontSize: '0.875rem',
                    fontWeight: isSelected ? 700 : 400,
                    color: isSelected ? '#0A2463' : '#4A5568',
                  }}>
                    {pm.label}
                  </Typography>
                </Box>
              );
            })}
          </Box>
        </motion.div>

        {/* Row 4 — invoice email */}
        <motion.div variants={rowVariants}>
          <Box sx={{ mb: 2 }}>
            <Controller name="invoiceEmail" control={control} render={({ field }) => (
              <TextField {...field} label="Hisob-faktura emaili (ixtiyoriy)" type="email"
                error={!!errors.invoiceEmail} helperText={errors.invoiceEmail?.message}
                placeholder="finance@klinika.uz" />
            )} />
          </Box>
        </motion.div>

        {/* Info box */}
        <motion.div variants={rowVariants}>
          <Box sx={{
            p: '16px 20px', borderRadius: '12px',
            bgcolor: 'rgba(10,36,99,0.03)',
            border: '1px solid rgba(10,36,99,0.1)',
          }}>
            <Typography sx={{ fontSize: '0.875rem', fontWeight: 700, color: '#0A2463', mb: 0.5 }}>
              ℹ️ Ariza yuborishdan oldin
            </Typography>
            <Typography sx={{ fontSize: '0.8125rem', color: '#64748B', lineHeight: 1.6 }}>
              Barcha ma'lumotlar to'g'riligini tekshiring. Ariza yuborilgandan so'ng, adminlar 1–3 ish kuni ichida ko'rib chiqadi va email orqali javob berishadi.
            </Typography>
          </Box>
        </motion.div>
      </motion.div>

      <NavButtons
        currentStep={currentStep}
        onPrev={onPrev}
        onNext={handleSubmit(onSubmit)}
        isLastStep
        isSubmitting={isSubmitting}
        submitProgress={submitProgress}
      />
    </Box>
  );
}
