import React from 'react';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Box, TextField, MenuItem, Typography,
  Checkbox, FormControlLabel, Link, IconButton,
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Minus } from 'lucide-react';
import { step6Schema } from '../../utils/validation';
import { POSITIONS } from '../../utils/constants';
import PasswordField from '../../../shared/components/PasswordField';
import PhoneInput from '../../../shared/components/PhoneInput';
import NavButtons from '../NavButtons';

const EMPTY_PERSON = {
  firstName: '', lastName: '', middleName: '',
  position: '', phone: '', email: '',
  password: '', passwordConfirm: '',
};

function PersonCard({ index, control, errors, isLast, canRemove, onRemove }) {
  const personErrors = errors?.persons?.[index] || {};

  return (
    <Box sx={{
      border: '1.5px solid #E8EDF5',
      borderRadius: '16px',
      p: 3,
      bgcolor: '#F8FAFF',
      position: 'relative',
      transition: 'all 0.2s ease',
      '&:focus-within': {
        borderColor: 'rgba(62,146,204,0.3)',
        bgcolor: '#FFFFFF',
        boxShadow: '0 4px 16px rgba(10,36,99,0.06)',
      },
    }}>
      {/* Card header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography sx={{ fontSize: '0.9375rem', fontWeight: 700, color: '#0A2463' }}>
            Shaxs {index + 1}
          </Typography>
          {index === 0 && (
            <Box sx={{
              px: '10px', py: '3px', borderRadius: '99px',
              bgcolor: 'rgba(0,201,167,0.12)',
              fontSize: '0.6875rem', fontWeight: 600, color: '#00C9A7',
            }}>
              Asosiy
            </Box>
          )}
        </Box>
        <IconButton
          onClick={onRemove}
          disabled={!canRemove}
          size="small"
          sx={{
            width: 28, height: 28, borderRadius: '8px',
            border: '1.5px solid #E8EDF5',
            color: '#E63946',
            opacity: canRemove ? 1 : 0.3,
            cursor: canRemove ? 'pointer' : 'not-allowed',
            '&:hover': canRemove ? {
              bgcolor: 'rgba(230,57,70,0.08)',
              borderColor: '#E63946',
            } : {},
          }}
        >
          <Minus size={14} />
        </IconButton>
      </Box>

      {/* Row 1 — firstName, lastName, middleName */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: '12px', mb: 1.5 }}>
        <Controller name={`persons.${index}.firstName`} control={control} render={({ field }) => (
          <TextField {...field} label="Ism *" size="small"
            error={!!personErrors.firstName} helperText={personErrors.firstName?.message} />
        )} />
        <Controller name={`persons.${index}.lastName`} control={control} render={({ field }) => (
          <TextField {...field} label="Familiya *" size="small"
            error={!!personErrors.lastName} helperText={personErrors.lastName?.message} />
        )} />
        <Controller name={`persons.${index}.middleName`} control={control} render={({ field }) => (
          <TextField {...field} label="Otasining ismi" size="small" />
        )} />
      </Box>

      {/* Row 2 — position, phone */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: '12px', mb: 1.5 }}>
        <Controller name={`persons.${index}.position`} control={control} render={({ field }) => (
          <TextField {...field} select label="Lavozim *" size="small"
            error={!!personErrors.position} helperText={personErrors.position?.message}>
            {POSITIONS.map(p => <MenuItem key={p.value} value={p.value}>{p.label}</MenuItem>)}
          </TextField>
        )} />
        <Controller name={`persons.${index}.phone`} control={control} render={({ field }) => (
          <PhoneInput {...field} label="Telefon (login uchun) *" size="small"
            error={!!personErrors.phone}
            helperText={personErrors.phone?.message || "Bu raqam bilan tizimga kiriladi"} />
        )} />
      </Box>

      {/* Row 3 — email full width */}
      <Box sx={{ mb: 1.5 }}>
        <Controller name={`persons.${index}.email`} control={control} render={({ field }) => (
          <TextField {...field} label="Email (xabarnomalar uchun, ixtiyoriy)" type="email" size="small"
            error={!!personErrors.email} helperText={personErrors.email?.message}
            placeholder="example@clinic.uz" />
        )} />
      </Box>

      {/* Row 4 — passwords */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: '12px', mb: isLast ? 2.5 : 0 }}>
        <Controller name={`persons.${index}.password`} control={control} render={({ field }) => (
          <PasswordField {...field} label="Parol *" size="small"
            showStrengthBar={index === 0}
            error={!!personErrors.password} helperText={personErrors.password?.message} />
        )} />
        <Controller name={`persons.${index}.passwordConfirm`} control={control} render={({ field }) => (
          <PasswordField {...field} label="Parolni takrorlash *" size="small"
            error={!!personErrors.passwordConfirm} helperText={personErrors.passwordConfirm?.message} />
        )} />
      </Box>

      {/* Row 5 — agreements (last card only) */}
      {isLast && (
        <Box sx={{ p: '14px 16px', bgcolor: '#F0F4FF', borderRadius: '10px', border: '1px solid #E8EDF5' }}>
          <Agreement name="agreeTerms" control={control} errors={errors}
            label={<>Foydalanish shartlari</>}
            text=" bilan tanishib chiqdim va roziman *" />
          <Agreement name="agreePrivacy" control={control} errors={errors}
            label={<>Maxfiylik siyosati</>}
            text=" bilan tanishib chiqdim va roziman *" />
        </Box>
      )}
    </Box>
  );
}

function Agreement({ name, control, errors, label, text }) {
  return (
    <>
      <Controller name={name} control={control} render={({ field }) => (
        <FormControlLabel
          control={
            <Checkbox checked={!!field.value} onChange={e => field.onChange(e.target.checked)}
              size="small"
              sx={{ color: '#CBD5E0', '&.Mui-checked': { color: '#0A2463' }, p: '4px 8px' }} />
          }
          label={
            <Typography sx={{ fontSize: '0.8125rem', color: '#4A5568' }}>
              Men{' '}
              <Link href="#" target="_blank" sx={{ color: '#3E92CC', fontWeight: 600 }}>
                {label}
              </Link>
              {text}
            </Typography>
          }
          sx={{ display: 'flex', alignItems: 'flex-start', mb: 0.5 }}
        />
      )} />
      {errors?.[name] && (
        <Typography sx={{ fontSize: '0.6875rem', color: '#E63946', ml: 4, mb: 0.5 }}>
          {errors[name].message}
        </Typography>
      )}
    </>
  );
}

export default function Step6AdminPerson({ data, onNext, onPrev, currentStep }) {
  const defaultPersons = data.persons?.length > 0
    ? data.persons
    : [{ ...EMPTY_PERSON }];

  const { control, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(step6Schema),
    defaultValues: {
      persons: defaultPersons,
      agreeTerms: data.agreeTerms || false,
      agreePrivacy: data.agreePrivacy || false,
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'persons' });

  const onSubmit = (values) => onNext(values);

  return (
    <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
      {/* Step header */}
      <Box sx={{ mb: 3, pb: 3, borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
        <Box sx={{
          width: 44, height: 44, borderRadius: '12px', flexShrink: 0,
          background: 'linear-gradient(135deg, rgba(10,36,99,0.08), rgba(62,146,204,0.12))',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.375rem',
        }}>👤</Box>
        <Box>
          <Typography sx={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '1.5rem', fontWeight: 700, color: '#0A2463', lineHeight: 1.2 }}>
            Mas'ul Shaxslar
          </Typography>
          <Typography sx={{ fontSize: '0.875rem', color: '#8892B0', mt: 0.5 }}>
            Kamida 1, ko'pi bilan 3 ta mas'ul shaxs qo'shing
          </Typography>
        </Box>
      </Box>

      {/* Persons list */}
      <AnimatePresence initial={false}>
        {fields.map((field, index) => (
          <motion.div
            key={field.id}
            initial={{ opacity: 0, y: -16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.97 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            style={{ marginBottom: 16 }}
          >
            <PersonCard
              index={index}
              control={control}
              errors={errors}
              isLast={index === fields.length - 1}
              canRemove={fields.length > 1}
              onRemove={() => remove(index)}
            />
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Unique phone error */}
      {errors.persons?.root?.message && (
        <Typography sx={{ fontSize: '0.75rem', color: '#E63946', mb: 2 }}>
          {errors.persons.root.message}
        </Typography>
      )}

      {/* Add person button */}
      {fields.length < 3 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <Box
            component="button"
            type="button"
            onClick={() => append({ ...EMPTY_PERSON })}
            sx={{
              width: '100%', p: '14px',
              borderRadius: '12px',
              border: '2px dashed #CBD5E0',
              bgcolor: 'transparent',
              color: '#3E92CC',
              fontSize: '0.875rem', fontWeight: 600,
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1,
              transition: 'all 0.2s ease',
              mb: 2,
              '&:hover': {
                borderColor: '#3E92CC',
                bgcolor: 'rgba(62,146,204,0.04)',
              },
            }}
          >
            <Plus size={16} />
            Mas'ul shaxs qo'shish ({fields.length}/3)
          </Box>
        </motion.div>
      )}

      <NavButtons currentStep={currentStep} onPrev={onPrev} onNext={handleSubmit(onSubmit)} />
    </Box>
  );
}
