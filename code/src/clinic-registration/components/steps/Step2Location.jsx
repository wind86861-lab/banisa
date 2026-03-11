import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Box, TextField, MenuItem, Typography } from '@mui/material';
import { motion } from 'framer-motion';
import { step2Schema } from '../../utils/validation';
import { UZBEKISTAN_REGIONS, DISTRICTS_BY_REGION } from '../../utils/constants';
import NavButtons from '../NavButtons';

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
};
const rowVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
};

export default function Step2Location({ data, onNext, onPrev, currentStep }) {
  const [selectedRegion, setSelectedRegion] = useState(data.regionId || '');

  const { control, handleSubmit, setValue, formState: { errors } } = useForm({
    resolver: zodResolver(step2Schema),
    defaultValues: {
      regionId: data.regionId || '',
      districtId: data.districtId || '',
      streetAddress: data.streetAddress || '',
      addressUz: data.addressUz || '',
      addressRu: data.addressRu || '',
      zipCode: data.zipCode || '',
      googleMapsUrl: data.googleMapsUrl || '',
      landmark: data.landmark || '',
    },
  });

  const districts = selectedRegion ? (DISTRICTS_BY_REGION[selectedRegion] || []) : [];
  const onSubmit = (values) => onNext(values);

  return (
    <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
      {/* Step header */}
      <Box sx={{ mb: 3, pb: 3, borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
        <Box sx={{
          width: 44, height: 44, borderRadius: '12px', flexShrink: 0,
          background: 'linear-gradient(135deg, rgba(10,36,99,0.08), rgba(62,146,204,0.12))',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.375rem',
        }}>📍</Box>
        <Box>
          <Typography sx={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '1.5rem', fontWeight: 700, color: '#0A2463', lineHeight: 1.2 }}>
            Joylashuv
          </Typography>
          <Typography sx={{ fontSize: '0.875rem', color: '#8892B0', mt: 0.5 }}>
            Klinikangizning aniq joylashuvini kiriting
          </Typography>
        </Box>
      </Box>

      <motion.div variants={containerVariants} initial="hidden" animate="visible">
        {/* Row 1 — region + district */}
        <motion.div variants={rowVariants}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: '16px', mb: 2 }}>
            <Controller name="regionId" control={control} render={({ field }) => (
              <TextField {...field} select label="Viloyat *" error={!!errors.regionId} helperText={errors.regionId?.message}
                onChange={(e) => { field.onChange(e); setSelectedRegion(e.target.value); setValue('districtId', ''); }}>
                {UZBEKISTAN_REGIONS.map(r => <MenuItem key={r.id} value={r.id}>{r.name}</MenuItem>)}
              </TextField>
            )} />
            <Controller name="districtId" control={control} render={({ field }) => (
              <TextField {...field} select label="Tuman/Shahar *" error={!!errors.districtId}
                helperText={errors.districtId?.message} disabled={!selectedRegion}>
                {districts.length === 0
                  ? <MenuItem value="" disabled>Avval viloyat tanlang</MenuItem>
                  : districts.map(d => <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>)
                }
              </TextField>
            )} />
          </Box>
        </motion.div>

        {/* Row 2 — street address full width */}
        <motion.div variants={rowVariants}>
          <Box sx={{ mb: 2 }}>
            <Controller name="streetAddress" control={control} render={({ field }) => (
              <TextField {...field} label="Ko'cha, uy raqami *" error={!!errors.streetAddress}
                helperText={errors.streetAddress?.message}
                placeholder="Masalan: Amir Temur ko'chasi, 108-uy" />
            )} />
          </Box>
        </motion.div>

        {/* Row 3 — full addresses */}
        <motion.div variants={rowVariants}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: '16px', mb: 2 }}>
            <Controller name="addressUz" control={control} render={({ field }) => (
              <TextField {...field} label="To'liq manzil (O'zbekcha) *" multiline rows={2}
                error={!!errors.addressUz} helperText={errors.addressUz?.message}
                placeholder="Toshkent sh., Chilonzor t., Amir Temur ko'chasi, 108-uy" />
            )} />
            <Controller name="addressRu" control={control} render={({ field }) => (
              <TextField {...field} label="To'liq manzil (Ruscha)" multiline rows={2}
                placeholder="г.Ташкент, Чиланзарский р-н, ул.Амира Темура, д.108" />
            )} />
          </Box>
        </motion.div>

        {/* Row 4 — zip + landmark + maps */}
        <motion.div variants={rowVariants}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: '16px' }}>
            <Controller name="zipCode" control={control} render={({ field }) => (
              <TextField {...field} label="Pochta indeksi" error={!!errors.zipCode}
                helperText={errors.zipCode?.message} placeholder="100000" />
            )} />
            <Controller name="landmark" control={control} render={({ field }) => (
              <TextField {...field} label="Mo'ljal" placeholder="Metro Chilonzor yaqinida" />
            )} />
            <Controller name="googleMapsUrl" control={control} render={({ field }) => (
              <TextField {...field} label="Google Maps havolasi"
                placeholder="https://goo.gl/maps/..." error={!!errors.googleMapsUrl}
                helperText={errors.googleMapsUrl?.message} />
            )} />
          </Box>
        </motion.div>
      </motion.div>

      <NavButtons currentStep={currentStep} onPrev={onPrev} onNext={handleSubmit(onSubmit)} />
    </Box>
  );
}
