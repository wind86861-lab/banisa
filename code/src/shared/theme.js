import { createTheme } from '@mui/material/styles';

export const registrationTheme = createTheme({
  palette: {
    primary:   { main: '#0A2463' },
    secondary: { main: '#3E92CC' },
    success:   { main: '#00C9A7' },
    warning:   { main: '#F59E0B' },
    error:     { main: '#EF4444' },
    background: { default: '#F8FAFF', paper: '#FFFFFF' },
    text: {
      primary: '#0F172A',
      secondary: '#64748B',
    },
  },
  typography: {
    fontFamily: '"DM Sans", sans-serif',
    h1: { fontFamily: '"Plus Jakarta Sans", sans-serif', fontWeight: 800 },
    h2: { fontFamily: '"Plus Jakarta Sans", sans-serif', fontWeight: 700 },
    h3: { fontFamily: '"Plus Jakarta Sans", sans-serif', fontWeight: 700 },
    h4: { fontFamily: '"Plus Jakarta Sans", sans-serif', fontWeight: 600 },
    h5: { fontFamily: '"Plus Jakarta Sans", sans-serif', fontWeight: 600 },
    h6: { fontFamily: '"Plus Jakarta Sans", sans-serif', fontWeight: 600 },
    subtitle1: { fontWeight: 500 },
    subtitle2: { fontWeight: 600 },
    body1: { lineHeight: 1.7 },
    body2: { lineHeight: 1.6 },
  },
  shape: { borderRadius: 12 },
  shadows: [
    'none',
    '0 1px 3px rgba(10,36,99,0.06)',
    '0 4px 12px rgba(10,36,99,0.08)',
    '0 8px 24px rgba(10,36,99,0.10)',
    '0 8px 32px rgba(10,36,99,0.12)',
    '0 16px 48px rgba(10,36,99,0.14)',
    ...Array(19).fill('none'),
  ],
  components: {
    MuiTextField: {
      defaultProps: { variant: 'outlined', fullWidth: true, size: 'medium' },
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 10,
            backgroundColor: '#FAFBFF',
            transition: 'all 0.2s ease',
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: '#3E92CC',
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: '#3E92CC',
              borderWidth: 2,
              boxShadow: '0 0 0 3px rgba(62,146,204,0.12)',
            },
            '&.Mui-focused': {
              backgroundColor: '#FFFFFF',
            },
          },
          '& .MuiInputLabel-root.Mui-focused': {
            color: '#3E92CC',
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          borderRadius: 10,
          fontSize: '0.9375rem',
          padding: '10px 24px',
          transition: 'all 0.2s ease',
        },
        containedPrimary: {
          background: 'linear-gradient(135deg, #0A2463 0%, #3E92CC 100%)',
          boxShadow: '0 4px 15px rgba(10,36,99,0.25)',
          '&:hover': {
            background: 'linear-gradient(135deg, #081d4f 0%, #2d7ab5 100%)',
            boxShadow: '0 6px 20px rgba(10,36,99,0.35)',
            transform: 'translateY(-1px)',
          },
          '&:active': { transform: 'translateY(0)' },
        },
        outlinedPrimary: {
          borderColor: '#3E92CC',
          color: '#0A2463',
          '&:hover': {
            backgroundColor: 'rgba(62,146,204,0.06)',
            borderColor: '#0A2463',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { borderRadius: 16 },
        elevation1: { boxShadow: '0 4px 12px rgba(10,36,99,0.08)' },
        elevation2: { boxShadow: '0 8px 24px rgba(10,36,99,0.10)' },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: 8, fontWeight: 500 },
      },
    },
    MuiSelect: {
      styleOverrides: {
        outlined: {
          borderRadius: 10,
          backgroundColor: '#FAFBFF',
        },
      },
    },
    MuiCheckbox: {
      styleOverrides: {
        root: {
          color: '#94A3B8',
          '&.Mui-checked': { color: '#3E92CC' },
        },
      },
    },
    MuiSwitch: {
      styleOverrides: {
        switchBase: {
          '&.Mui-checked': {
            color: '#3E92CC',
            '& + .MuiSwitch-track': { backgroundColor: '#3E92CC' },
          },
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: { borderRadius: 4, backgroundColor: 'rgba(62,146,204,0.12)' },
        bar: { borderRadius: 4, background: 'linear-gradient(90deg, #0A2463, #3E92CC)' },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: { borderRadius: 10 },
      },
    },
  },
});
