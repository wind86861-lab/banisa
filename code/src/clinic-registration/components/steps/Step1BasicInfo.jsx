import React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Box, TextField, MenuItem, Typography } from '@mui/material';
import { motion } from 'framer-motion';
import { step1Schema } from '../../utils/validation';
import { CLINIC_TYPES } from '../../utils/constants';
import FileDropzone from '../../../shared/components/FileDropzone';
import NavButtons from '../NavButtons';

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
};
const rowVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
};

export default function Step1BasicInfo({ data, onNext, onPrev, currentStep, isSubmitting }) {
  const { control, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(step1Schema),
    defaultValues: {
      nameUz: data.nameUz || '',
      nameRu: data.nameRu || '',
      nameEn: data.nameEn || '',
      clinicType: data.clinicType || '',
      foundedYear: data.foundedYear
        ? (typeof data.foundedYear === 'number' ? `${data.foundedYear}-01-01` : data.foundedYear)
        : '',
      descriptionUz: data.descriptionUz || '',
      descriptionRu: data.descriptionRu || '',
    },
  });

  const [logo, setLogo] = React.useState(data.logo || null);

  const onSubmit = (values) => {
    onNext({ ...values, logo });
  };

  return (
    <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
      {/* Step header */}
      <Box sx={{ mb: 3, pb: 3, borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
        <Box sx={{
          width: 44, height: 44, borderRadius: '12px', flexShrink: 0,
          background: 'linear-gradient(135deg, rgba(10,36,99,0.08), rgba(62,146,204,0.12))',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.375rem',
        }}>🏥</Box>
        <Box>
          <Typography sx={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '1.5rem', fontWeight: 700, color: '#0A2463', lineHeight: 1.2 }}>
            Asosiy Ma'lumotlar
          </Typography>
          <Typography sx={{ fontSize: '0.875rem', color: '#8892B0', mt: 0.5 }}>
            Klinikangiz haqida asosiy ma'lumotlarni kiriting
          </Typography>
        </Box>
      </Box>

      <motion.div variants={containerVariants} initial="hidden" animate="visible">
        {/* Row 1 — 3 columns: clinic names */}
        <motion.div variants={rowVariants}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: '16px', mb: 2 }}>
            <Controller name="nameUz" control={control} render={({ field }) => (
              <TextField {...field} label="Klinika nomi (O'zbekcha) *" error={!!errors.nameUz} helperText={errors.nameUz?.message} />
            )} />
            <Controller name="nameRu" control={control} render={({ field }) => (
              <TextField {...field} label="Klinika nomi (Ruscha)" error={!!errors.nameRu} helperText={errors.nameRu?.message} />
            )} />
            <Controller name="nameEn" control={control} render={({ field }) => (
              <TextField {...field} label="Klinika nomi (Inglizcha)" />
            )} />
          </Box>
        </motion.div>

        {/* Row 2 — 2 columns: type + year */}
        <motion.div variants={rowVariants}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: '16px', mb: 2 }}>
            <Controller name="clinicType" control={control} render={({ field }) => (
              <TextField {...field} select label="Klinika turi *" error={!!errors.clinicType} helperText={errors.clinicType?.message}>
                {CLINIC_TYPES.map(ct => (
                  <MenuItem key={ct.value} value={ct.value}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <span>{ct.icon}</span> {ct.label}
                    </Box>
                  </MenuItem>
                ))}
              </TextField>
            )} />
            <Controller name="foundedYear" control={control} render={({ field }) => (
              <TextField {...field} type="date" label="Tashkil etilgan yil"
                InputLabelProps={{ shrink: true }}
                error={!!errors.foundedYear} helperText={errors.foundedYear?.message} />
            )} />
          </Box>
        </motion.div>

        {/* Row 3 — 2 columns: descriptions */}
        <motion.div variants={rowVariants}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: '16px', mb: 2 }}>
            <Box>
              <Controller name="descriptionUz" control={control} render={({ field }) => (
                <TextField {...field} label="Tavsif (O'zbekcha) *" multiline minRows={4}
                  placeholder="Klinikangiz haqida batafsil ma'lumot bering (kamida 50 ta belgi)..."
                  error={!!errors.descriptionUz} helperText={errors.descriptionUz?.message}
                  inputProps={{ maxLength: 1000 }} />
              )} />
              <Typography sx={{ fontSize: '0.75rem', color: '#8892B0', mt: 0.5, textAlign: 'right' }}>
                Kamida 50 ta belgi talab qilinadi
              </Typography>
            </Box>
            <Controller name="descriptionRu" control={control} render={({ field }) => (
              <TextField {...field} label="Tavsif (Ruscha)" multiline minRows={4}
                placeholder="Описание клиники на русском языке..." />
            )} />
          </Box>
        </motion.div>

        {/* Row 4 — Logo upload full width */}
        <motion.div variants={rowVariants}>
          <FileDropzone
            label="Klinika logotipi"
            accept={{ 'image/*': ['.jpg', '.jpeg', '.png', '.svg', '.webp'] }}
            maxSize={2 * 1024 * 1024}
            value={logo}
            onChange={setLogo}
            hint="JPG, PNG  ·  Maksimal: 2MB"
          />
        </motion.div>
      </motion.div>

      <NavButtons currentStep={currentStep} onPrev={onPrev} onNext={handleSubmit(onSubmit)} isSubmitting={isSubmitting} />
    </Box>
  );
}
