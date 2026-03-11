import React, { useState, forwardRef } from 'react';
import { TextField, InputAdornment, IconButton, Box, LinearProgress, Typography } from '@mui/material';
import { Eye, EyeOff } from 'lucide-react';

const getStrength = (password) => {
  if (!password) return { score: 0, label: '', color: 'transparent' };
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) return { score: 20, label: 'Juda zaif', color: '#EF4444' };
  if (score === 2) return { score: 40, label: 'Zaif', color: '#F59E0B' };
  if (score === 3) return { score: 60, label: "O'rta", color: '#F59E0B' };
  if (score === 4) return { score: 80, label: 'Kuchli', color: '#10B981' };
  return { score: 100, label: 'Juda kuchli', color: '#00C9A7' };
};

const PasswordField = forwardRef(({
  label,
  showStrengthBar = false,
  error,
  helperText,
  value,
  onChange,
  required,
  ...rest
}, ref) => {
  const [show, setShow] = useState(false);
  const strength = showStrengthBar ? getStrength(value || '') : null;

  return (
    <Box>
      <TextField
        ref={ref}
        type={show ? 'text' : 'password'}
        label={label || "Parol"}
        value={value || ''}
        onChange={onChange}
        error={error}
        helperText={helperText}
        required={required}
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              <IconButton onClick={() => setShow(!show)} edge="end" size="small">
                {show ? <EyeOff size={18} /> : <Eye size={18} />}
              </IconButton>
            </InputAdornment>
          ),
        }}
        {...rest}
      />
      {showStrengthBar && value && (
        <Box sx={{ mt: 1, px: 0.5 }}>
          <LinearProgress
            variant="determinate"
            value={strength.score}
            sx={{
              height: 4,
              borderRadius: 2,
              bgcolor: '#E2E8F0',
              '& .MuiLinearProgress-bar': {
                bgcolor: strength.color,
                borderRadius: 2,
              },
            }}
          />
          <Typography variant="caption" sx={{ color: strength.color, fontWeight: 600, mt: 0.5, display: 'block' }}>
            {strength.label}
          </Typography>
        </Box>
      )}
    </Box>
  );
});

PasswordField.displayName = 'PasswordField';

export default PasswordField;
