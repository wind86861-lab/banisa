import React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Box, TextField, Typography, Switch, FormControlLabel, Checkbox, Button } from '@mui/material';
import { motion } from 'framer-motion';
import { Copy } from 'lucide-react';
import { step4Schema } from '../../utils/validation';
import { DAYS_OF_WEEK, DEFAULT_WORKING_HOURS } from '../../utils/constants';
import NavButtons from '../NavButtons';

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05, delayChildren: 0.1 } },
};
const rowVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
};

export default function Step4WorkingHours({ data, onNext, onPrev, currentStep }) {
  const { control, handleSubmit, watch, setValue, formState: { errors } } = useForm({
    resolver: zodResolver(step4Schema),
    defaultValues: {
      workingHours: data.workingHours || DEFAULT_WORKING_HOURS,
      isAlwaysOpen: data.isAlwaysOpen || false,
      lunchBreakStart: data.lunchBreakStart || '',
      lunchBreakEnd: data.lunchBreakEnd || '',
      holidayNotes: data.holidayNotes || '',
    },
  });

  const isAlwaysOpen = watch('isAlwaysOpen');
  const workingHours = watch('workingHours');

  const applyMondayToAll = () => {
    const monday = workingHours.monday;
    DAYS_OF_WEEK.forEach(({ key }) => setValue(`workingHours.${key}`, { ...monday }));
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
        }}>🕐</Box>
        <Box>
          <Typography sx={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '1.5rem', fontWeight: 700, color: '#0A2463', lineHeight: 1.2 }}>
            Ish Vaqtlari
          </Typography>
          <Typography sx={{ fontSize: '0.875rem', color: '#8892B0', mt: 0.5 }}>
            Klinikangizning ish jadvalini belgilang
          </Typography>
        </Box>
      </Box>

      <motion.div variants={containerVariants} initial="hidden" animate="visible">
        {/* 24/7 toggle + apply-all button */}
        <motion.div variants={rowVariants}>
          <Box sx={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            p: '12px 16px', borderRadius: '12px', mb: 2,
            bgcolor: isAlwaysOpen ? 'rgba(0,201,167,0.06)' : '#F8FAFF',
            border: `1.5px solid ${isAlwaysOpen ? '#00C9A7' : '#E8EDF5'}`,
            transition: 'all 0.2s ease',
          }}>
            <Controller name="isAlwaysOpen" control={control} render={({ field }) => (
              <FormControlLabel
                control={<Switch checked={!!field.value} onChange={e => field.onChange(e.target.checked)} color="success" size="small" />}
                label={
                  <Box sx={{ ml: 0.5 }}>
                    <Typography sx={{ fontSize: '0.875rem', fontWeight: 600, color: '#0A2463', lineHeight: 1.2 }}>
                      24/7 ishlaydi
                    </Typography>
                    <Typography sx={{ fontSize: '0.75rem', color: '#8892B0' }}>
                      Yoqilsa, quyidagi jadval hisobga olinmaydi
                    </Typography>
                  </Box>
                }
                sx={{ m: 0 }}
              />
            )} />
            {!isAlwaysOpen && (
              <Button size="small" startIcon={<Copy size={13} />} onClick={applyMondayToAll}
                sx={{ fontSize: '0.75rem', color: '#3E92CC', border: '1px solid rgba(62,146,204,0.3)', borderRadius: '8px', px: 1.5, py: 0.5, textTransform: 'none', whiteSpace: 'nowrap' }}>
                Barchasiga ko'chir
              </Button>
            )}
          </Box>
        </motion.div>

        {/* Day rows */}
        {!isAlwaysOpen && DAYS_OF_WEEK.map(({ key, label, short }) => {
          const dayData = workingHours[key] || {};
          return (
            <motion.div key={key} variants={rowVariants}>
              <Box sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr 56px', md: '140px 56px 1fr 1fr 110px' },
                alignItems: 'center',
                gap: '12px',
                p: '12px 16px',
                borderRadius: '12px',
                mb: 1,
                bgcolor: dayData.isOpen ? '#FFFFFF' : '#F8FAFF',
                border: `1px solid ${dayData.isOpen ? 'rgba(62,146,204,0.2)' : 'transparent'}`,
                boxShadow: dayData.isOpen ? '0 2px 8px rgba(10,36,99,0.06)' : 'none',
                opacity: dayData.isOpen ? 1 : 0.55,
                transition: 'all 0.2s ease',
              }}>
                {/* Day name */}
                <Typography sx={{ fontSize: '0.875rem', fontWeight: 600, color: dayData.isOpen ? '#0A2463' : '#94A3B8' }}>
                  {label}
                </Typography>

                {/* Toggle */}
                <Controller name={`workingHours.${key}.isOpen`} control={control} render={({ field }) => (
                  <Switch checked={!!field.value} onChange={e => field.onChange(e.target.checked)} size="small" color="primary" />
                )} />

                {/* Time pickers — shown only when open and not 24h */}
                {dayData.isOpen && !dayData.isAroundClock ? (
                  <>
                    <Controller name={`workingHours.${key}.openTime`} control={control} render={({ field }) => (
                      <TextField {...field} type="time" label="Boshlanish" size="small" InputLabelProps={{ shrink: true }} />
                    )} />
                    <Controller name={`workingHours.${key}.closeTime`} control={control} render={({ field }) => (
                      <TextField {...field} type="time" label="Tugash" size="small" InputLabelProps={{ shrink: true }} />
                    )} />
                  </>
                ) : dayData.isOpen && dayData.isAroundClock ? (
                  <Box sx={{ gridColumn: { md: '3 / 5' }, display: 'flex', alignItems: 'center' }}>
                    <Typography sx={{ fontSize: '0.8125rem', color: '#00C9A7', fontWeight: 600 }}>
                      ✅ Kecha-kunduz ishlaydi
                    </Typography>
                  </Box>
                ) : (
                  <Box sx={{ gridColumn: { md: '3 / 5' } }}>
                    <Typography sx={{ fontSize: '0.8125rem', color: '#94A3B8' }}>Dam olish kuni</Typography>
                  </Box>
                )}

                {/* 24h checkbox */}
                {dayData.isOpen && (
                  <Controller name={`workingHours.${key}.isAroundClock`} control={control} render={({ field }) => (
                    <FormControlLabel
                      control={<Checkbox checked={!!field.value} onChange={e => field.onChange(e.target.checked)} size="small" />}
                      label={<Typography sx={{ fontSize: '0.75rem', fontWeight: 500, whiteSpace: 'nowrap' }}>24 soat</Typography>}
                      sx={{ m: 0 }}
                    />
                  )} />
                )}
              </Box>
            </motion.div>
          );
        })}

        {/* Lunch break */}
        {!isAlwaysOpen && (
          <motion.div variants={rowVariants}>
            <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: '#4A5568', textTransform: 'uppercase', letterSpacing: '0.8px', mt: 1, mb: 1.5 }}>
              Tushlik tanaffusi (ixtiyoriy)
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: '16px', mb: 2 }}>
              <Controller name="lunchBreakStart" control={control} render={({ field }) => (
                <TextField {...field} type="time" label="Tushlik boshlanishi" InputLabelProps={{ shrink: true }} />
              )} />
              <Controller name="lunchBreakEnd" control={control} render={({ field }) => (
                <TextField {...field} type="time" label="Tushlik tugashi" InputLabelProps={{ shrink: true }} />
              )} />
            </Box>
          </motion.div>
        )}

        {/* Holiday notes */}
        <motion.div variants={rowVariants}>
          <Controller name="holidayNotes" control={control} render={({ field }) => (
            <TextField {...field} label="Bayram kunlari va izohlar" multiline minRows={2}
              placeholder="Masalan: Qurbon hayit va Ramazon hayitda biz yopiq bo'lamiz..." />
          )} />
        </motion.div>
      </motion.div>

      <NavButtons currentStep={currentStep} onPrev={onPrev} onNext={handleSubmit(onSubmit)} />
    </Box>
  );
}
