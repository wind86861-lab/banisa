import React, { forwardRef } from 'react';
import { TextField, InputAdornment } from '@mui/material';

const UZ_PHONE_PLACEHOLDER = '+998 XX XXX-XX-XX';

const formatUzbekPhone = (value) => {
  const digits = value.replace(/\D/g, '');
  let formatted = '';
  const d = digits.startsWith('998') ? digits.slice(3) : digits;
  if (d.length === 0) return '';
  if (d.length <= 2) formatted = d;
  else if (d.length <= 5) formatted = `${d.slice(0, 2)} ${d.slice(2)}`;
  else if (d.length <= 7) formatted = `${d.slice(0, 2)} ${d.slice(2, 5)}-${d.slice(5)}`;
  else formatted = `${d.slice(0, 2)} ${d.slice(2, 5)}-${d.slice(5, 7)}-${d.slice(7, 9)}`;
  return `+998 ${formatted}`;
};

const PhoneInput = forwardRef(function PhoneInput(
  { label, error, helperText, value, onChange, required, ...rest },
  ref
) {
  const handleChange = (e) => {
    const raw = e.target.value;
    const formatted = formatUzbekPhone(raw);
    onChange({ target: { value: formatted } });
  };

  return (
    <TextField
      ref={ref}
      label={label || "Telefon raqam"}
      placeholder={UZ_PHONE_PLACEHOLDER}
      value={value || ''}
      onChange={handleChange}
      error={error}
      helperText={helperText}
      required={required}
      inputMode="tel"
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <span style={{ fontSize: '1.2rem' }}>🇺🇿</span>
          </InputAdornment>
        ),
      }}
      inputProps={{ maxLength: 17 }}
      {...rest}
    />
  );
});

export default PhoneInput;
