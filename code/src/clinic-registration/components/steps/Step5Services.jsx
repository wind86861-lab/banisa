import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Box, Typography, Checkbox, TextField, InputAdornment, Accordion, AccordionSummary, AccordionDetails, Button } from '@mui/material';
import { Search, ChevronDown } from 'lucide-react';
import { motion } from 'framer-motion';
import { step5Schema } from '../../utils/validation';
import { SERVICES_BY_CLINIC_TYPE } from '../../utils/constants';
import NavButtons from '../NavButtons';

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
};
const rowVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
};

export default function Step5Services({ data, onNext, onPrev, currentStep }) {
  const clinicType = data.clinicType || '';
  const [searchQuery, setSearchQuery] = useState('');

  const allServices = React.useMemo(() => {
    const base = SERVICES_BY_CLINIC_TYPE[clinicType] || [];
    const common = ['Laboratoriya tahlillari', 'UZI tekshiruvi', 'Checkup paketlari'];
    return Array.from(new Set([...base, ...common]));
  }, [clinicType]);

  const groupedServices = React.useMemo(() => {
    const groups = {
      'Asosiy xizmatlar': allServices.filter(s => ['Laboratoriya tahlillari', 'UZI tekshiruvi', 'Checkup paketlari'].includes(s)),
      'Ixtisoslashgan xizmatlar': allServices.filter(s => !['Laboratoriya tahlillari', 'UZI tekshiruvi', 'Checkup paketlari'].includes(s)),
    };
    return Object.entries(groups).filter(([, items]) => items.length > 0);
  }, [allServices]);

  const filtered = allServices.filter(s => s.toLowerCase().includes(searchQuery.toLowerCase()));

  const { control, handleSubmit, watch, setValue, formState: { errors } } = useForm({
    resolver: zodResolver(step5Schema),
    defaultValues: { selectedServices: data.selectedServices || [] },
  });

  const selected = watch('selectedServices') || [];

  const toggleService = (service) => {
    const next = selected.includes(service) ? selected.filter(s => s !== service) : [...selected, service];
    setValue('selectedServices', next, { shouldValidate: true });
  };

  const selectAll = (services) => {
    const allSel = services.every(s => selected.includes(s));
    setValue('selectedServices', allSel ? selected.filter(s => !services.includes(s)) : Array.from(new Set([...selected, ...services])));
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
        }}>💊</Box>
        <Box sx={{ flex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography sx={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '1.5rem', fontWeight: 700, color: '#0A2463', lineHeight: 1.2 }}>
              Xizmatlar
            </Typography>
            {selected.length > 0 && (
              <Box sx={{
                display: 'flex', alignItems: 'center', gap: 1,
                background: 'linear-gradient(135deg, #0A2463, #3E92CC)',
                borderRadius: 99, px: 1.75, py: 0.5,
              }}>
                <Typography sx={{ color: 'white', fontSize: '0.8125rem', fontWeight: 600 }}>
                  {selected.length} ta tanlandi
                </Typography>
                <Box
                  component="button" type="button"
                  onClick={() => setValue('selectedServices', [])}
                  sx={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.8)', cursor: 'pointer', fontSize: '0.75rem', p: 0, '&:hover': { color: 'white' } }}
                >
                  Tozala
                </Box>
              </Box>
            )}
          </Box>
          <Typography sx={{ fontSize: '0.875rem', color: '#8892B0', mt: 0.5 }}>
            Klinikangizda ko'rsatiladigan xizmatlarni tanlang
          </Typography>
        </Box>
      </Box>

      <motion.div variants={containerVariants} initial="hidden" animate="visible">
        {/* Search bar */}
        <motion.div variants={rowVariants}>
          <Box sx={{ position: 'relative', mb: 2 }}>
            <Box sx={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#8892B0', display: 'flex' }}>
              <Search size={17} />
            </Box>
            <TextField
              placeholder="Xizmat qidirish..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              sx={{ '& .MuiInputBase-input': { pl: '44px' } }}
            />
          </Box>
        </motion.div>

        {errors.selectedServices && (
          <Typography sx={{ fontSize: '0.75rem', color: '#E63946', display: 'block', mb: 1.5 }}>
            {errors.selectedServices.message}
          </Typography>
        )}

        {/* Search results — flat */}
        {searchQuery ? (
          <motion.div variants={rowVariants}>
            <Box sx={{ p: 2, bgcolor: '#F8FAFF', borderRadius: '12px', border: '1px solid #E8EDF5' }}>
              {filtered.length === 0 ? (
                <Typography sx={{ fontSize: '0.875rem', color: '#8892B0', textAlign: 'center', py: 2 }}>
                  Hech narsa topilmadi
                </Typography>
              ) : (
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1 }}>
                  {filtered.map(service => (
                    <ServiceCheckItem key={service} service={service} checked={selected.includes(service)} onToggle={() => toggleService(service)} />
                  ))}
                </Box>
              )}
            </Box>
          </motion.div>
        ) : (
          groupedServices.map(([groupName, services]) => (
            <motion.div key={groupName} variants={rowVariants}>
              <Accordion defaultExpanded disableGutters elevation={0} sx={{
                mb: 1.5, borderRadius: '12px !important', overflow: 'hidden',
                border: '1px solid #E8EDF5',
                '&:before': { display: 'none' },
              }}>
                <AccordionSummary expandIcon={<ChevronDown size={18} color="#4A5568" />}
                  sx={{ bgcolor: '#F8FAFF', px: 2.5, py: 1, minHeight: 'auto', '&.Mui-expanded': { minHeight: 'auto' }, '& .MuiAccordionSummary-content': { my: 0 } }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', pr: 1 }}>
                    <Typography sx={{ fontSize: '0.9375rem', fontWeight: 600, color: '#0A2463' }}>{groupName}</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ bgcolor: '#0A2463', color: 'white', fontSize: '0.75rem', fontWeight: 600, borderRadius: 99, px: 1.25, py: 0.25 }}>
                        {services.filter(s => selected.includes(s)).length}/{services.length}
                      </Box>
                      <Box
                        component="span"
                        onClick={(e) => { e.stopPropagation(); selectAll(services); }}
                        sx={{
                          fontSize: '0.75rem', color: '#3E92CC', py: 0.25, px: 1,
                          cursor: 'pointer', userSelect: 'none',
                          '&:hover': { textDecoration: 'underline' },
                        }}
                      >
                        {services.every(s => selected.includes(s)) ? 'Bekor' : 'Barchasini'}
                      </Box>
                    </Box>
                  </Box>
                </AccordionSummary>
                <AccordionDetails sx={{ p: '16px 20px 20px', display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1 }}>
                  {services.map(service => (
                    <ServiceCheckItem key={service} service={service} checked={selected.includes(service)} onToggle={() => toggleService(service)} />
                  ))}
                </AccordionDetails>
              </Accordion>
            </motion.div>
          ))
        )}
      </motion.div>

      <NavButtons currentStep={currentStep} onPrev={onPrev} onNext={handleSubmit(onSubmit)} />
    </Box>
  );
}

function ServiceCheckItem({ service, checked, onToggle }) {
  return (
    <Box
      onClick={onToggle}
      sx={{
        display: 'flex', alignItems: 'center', gap: 1,
        p: '10px 14px', borderRadius: '10px', cursor: 'pointer',
        border: `1.5px solid ${checked ? '#3E92CC' : '#E8EDF5'}`,
        bgcolor: checked ? 'rgba(62,146,204,0.06)' : '#FFFFFF',
        transition: 'all 0.15s ease',
        '&:hover': { borderColor: '#3E92CC' },
      }}
    >
      <Checkbox
        checked={checked}
        size="small"
        disableRipple
        sx={{ p: 0, color: '#CBD5E0', '&.Mui-checked': { color: '#3E92CC' } }}
        onClick={e => e.stopPropagation()}
        onChange={onToggle}
      />
      <Typography sx={{ fontSize: '0.875rem', fontWeight: checked ? 600 : 400, color: checked ? '#0A2463' : '#4A5568', lineHeight: 1.4 }}>
        {service}
      </Typography>
    </Box>
  );
}
