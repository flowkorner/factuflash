import type { Appearance, CssFontSource } from '@stripe/stripe-js';
import { colors } from '@/theme/tokens';

/** Le formulaire Stripe reprend la charte FactuFlash (Inter, bleu, coins arrondis, champs hauts). */
export const STRIPE_APPEARANCE: Appearance = {
  theme: 'stripe',
  variables: {
    colorPrimary: colors.primary,
    colorText: colors.text,
    colorTextSecondary: colors.textSecondary,
    colorDanger: colors.error,
    colorBackground: colors.surface,
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSizeBase: '16px',
    borderRadius: '12px',
    spacingUnit: '4px',
  },
  rules: {
    '.Input': {
      border: `1px solid ${colors.inputBorder}`,
      padding: '14px 16px',
      boxShadow: 'none',
    },
    '.Input:focus': { borderColor: colors.primary, boxShadow: `0 0 0 1px ${colors.primary}` },
    '.Label': { color: colors.label, fontWeight: '500', fontSize: '14px' },
  },
};

export const STRIPE_FONTS: CssFontSource[] = [
  { cssSrc: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap' },
];
