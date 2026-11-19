'use client';

import { createTheme } from '@mui/material/styles';
import { colors } from './tokens';

export const theme = createTheme({
  palette: {
    primary: { main: colors.primary, dark: colors.primaryDark, contrastText: '#FFFFFF' },
    error: { main: colors.error },
    background: { default: colors.background, paper: colors.surface },
    text: { primary: colors.text, secondary: colors.textSecondary },
    divider: colors.border,
  },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily: 'var(--font-inter), system-ui, sans-serif',
    h1: { fontSize: 28, fontWeight: 700, lineHeight: 1.15, letterSpacing: '-0.02em' },
    h2: { fontSize: 20, fontWeight: 700, lineHeight: 1.25 },
    body1: { fontSize: 15, lineHeight: 1.5 },
    body2: { fontSize: 14, lineHeight: 1.45 },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { borderRadius: 14, fontSize: 15, minHeight: 52 },
        sizeLarge: { fontSize: 18, minHeight: 60 },
        outlined: {
          borderWidth: 1.5,
          borderColor: colors.inputBorder,
          backgroundColor: colors.surface,
          color: colors.text,
        },
      },
    },
    MuiFormLabel: {
      styleOverrides: {
        root: {
          fontSize: 14,
          fontWeight: 500,
          color: colors.label,
          '&.Mui-focused:not(.Mui-error)': { color: colors.label },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: { backgroundColor: colors.surface, borderRadius: 12, fontSize: 17 },
        input: { height: 54, boxSizing: 'border-box', padding: '0 16px' },
        notchedOutline: { borderColor: colors.inputBorder },
      },
    },
    MuiFormHelperText: {
      styleOverrides: { root: { marginLeft: 0, fontSize: 14 } },
    },
  },
});
