import React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Box, TextField, MenuItem, Typography } from '@mui/material';
import { motion } from 'framer-motion';
import { step7Schema } from '../../utils/validation';
import { LEGAL_FORMS } from '../../utils/constants';
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

export default function Step7Documents({ data, onNext, onPrev, currentStep }) {
  const [licenseFile, setLicenseFile] = React.useState(data.licenseFile || null);
  const [certificates, setCertificates] = React.useState(data.certificates || []);

  const { control, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(step7Schema),
    defaultValues: {
      licenseNumber: data.licenseNumber || '',
      licenseExpiry: data.licenseExpiry || '',
      inn: data.inn || '',
      legalName: data.legalName || '',
      legalAddress: data.legalAddress || '',
      legalForm: data.legalForm || '',
    },
  });

  const onSubmit = (values) => {
    if (!licenseFile) { alert('Litsenziya faylini yuklang'); return; }
    onNext({ ...values, licenseFile, certificates });
  };

  return (
    <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
      {/* Step header */}
      <Box sx={{ mb: 3, pb: 3, borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
        <Box sx={{
          width: 44, height: 44, borderRadius: '12px', flexShrink: 0,
          background: 'linear-gradient(135deg, rgba(10,36,99,0.08), rgba(62,146,204,0.12))',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.375rem',
        }}>📄</Box>
        <Box>
          <Typography sx={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '1.5rem', fontWeight: 700, color: '#0A2463', lineHeight: 1.2 }}>
            Hujjatlar
          </Typography>
          <Typography sx={{ fontSize: '0.875rem', color: '#8892B0', mt: 0.5 }}>
            Klinikangizning rasmiy hujjatlarini yuklang
          </Typography>
        </Box>
      </Box>

      <motion.div variants={containerVariants} initial="hidden" animate="visible">
        {/* Row 1 — license number + expiry */}
        <motion.div variants={rowVariants}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: '16px', mb: 2 }}>
            <Controller name="licenseNumber" control={control} render={({ field }) => (
              <TextField {...field} label="Litsenziya raqami *" error={!!errors.licenseNumber}
                helperText={errors.licenseNumber?.message} placeholder="LA-0012345" />
            )} />
            <Controller name="licenseExpiry" control={control} render={({ field }) => (
              <TextField {...field} type="date" label="Litsenziya muddati *"
                InputLabelProps={{ shrink: true }}
                error={!!errors.licenseExpiry} helperText={errors.licenseExpiry?.message} />
            )} />
          </Box>
        </motion.div>

        {/* Row 2 — license file upload */}
        <motion.div variants={rowVariants}>
          <Box sx={{ mb: 2 }}>
            <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600, color: '#4A5568', mb: 1 }}>
              Litsenziya fayli *
            </Typography>
            <FileDropzone
              accept={{ 'application/pdf': ['.pdf'], 'image/*': ['.jpg', '.jpeg', '.png'] }}
              maxSize={10 * 1024 * 1024}
              value={licenseFile}
              onChange={setLicenseFile}
              hint="PDF, JPG, PNG  ·  Maksimal: 10MB"
            />
          </Box>
        </motion.div>

        {/* Row 3 — INN + legal name + legal form */}
        <motion.div variants={rowVariants}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: '16px', mb: 2 }}>
            <Controller name="inn" control={control} render={({ field }) => (
              <TextField {...field} label="INN/STIR *" error={!!errors.inn}
                helperText={errors.inn?.message} placeholder="123456789"
                inputProps={{ maxLength: 9 }} />
            )} />
            <Controller name="legalName" control={control} render={({ field }) => (
              <TextField {...field} label="Yuridik nomi *" error={!!errors.legalName}
                helperText={errors.legalName?.message} placeholder={'"Sog\'liq" MChJ'} />
            )} />
            <Controller name="legalForm" control={control} render={({ field }) => (
              <TextField {...field} select label="Huquqiy shakl">
                <MenuItem value=""><em>Tanlang...</em></MenuItem>
                {LEGAL_FORMS.map(f => <MenuItem key={f.value} value={f.value}>{f.label}</MenuItem>)}
              </TextField>
            )} />
          </Box>
        </motion.div>

        {/* Row 4 — legal address full width */}
        <motion.div variants={rowVariants}>
          <Box sx={{ mb: 2 }}>
            <Controller name="legalAddress" control={control} render={({ field }) => (
              <TextField {...field} label="Yuridik manzil *" multiline rows={2}
                error={!!errors.legalAddress} helperText={errors.legalAddress?.message}
                placeholder="Yuridik ro'yxatdan o'tgan manzil" />
            )} />
          </Box>
        </motion.div>

        {/* Row 5 — certificates multi-upload */}
        <motion.div variants={rowVariants}>
          <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600, color: '#4A5568', mb: 0.5 }}>
            Sertifikatlar (ixtiyoriy)
          </Typography>
          <Typography sx={{ fontSize: '0.75rem', color: '#8892B0', mb: 1 }}>
            Akkreditatsiya, sertifikatlar, mukofotlar — maksimal 10 ta fayl
          </Typography>
          <FileDropzone
            accept={{ 'application/pdf': ['.pdf'], 'image/*': ['.jpg', '.jpeg', '.png'] }}
            maxSize={5 * 1024 * 1024}
            maxFiles={10}
            value={certificates}
            onChange={setCertificates}
            hint="Maksimal 10 ta fayl, har biri 5 MB gacha"
          />
        </motion.div>
      </motion.div>

      <NavButtons currentStep={currentStep} onPrev={onPrev} onNext={handleSubmit(onSubmit)} />
    </Box>
  );
}
