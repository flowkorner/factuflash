'use client';

import { loadStripe } from '@stripe/stripe-js';
import { CheckoutElementsProvider } from '@stripe/react-stripe-js/checkout';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import { getStripePublishableKey } from '@/lib/env';
import { useDepositCheckout } from '../hooks/useDepositCheckout';
import { STRIPE_APPEARANCE, STRIPE_FONTS } from '../stripeAppearance';
import { DepositPaymentForm } from './DepositPaymentForm';

// Chargé une seule fois, et seulement quand ce composant est affiché (import dynamique).
const stripePromise = loadStripe(getStripePublishableKey());

interface DepositPanelProps {
  token: string;
  amountLabel: string;
}

/** Paiement de l'acompte, intégré à la page du devis (Checkout Sessions + Payment Element). */
export default function DepositPanel({ token, amountLabel }: DepositPanelProps) {
  const { state: checkout, retry } = useDepositCheckout(token);

  if (checkout.status === 'loading') {
    return (
      <Box role="status" sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 2 }}>
        <CircularProgress size={22} aria-hidden="true" />
        <Typography>Préparation du paiement…</Typography>
      </Box>
    );
  }
  if (checkout.status === 'error') {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <Alert severity="error" role="alert" sx={{ borderRadius: '12px' }}>
          {checkout.message}
        </Alert>
        <Button variant="outlined" onClick={retry}>
          Réessayer
        </Button>
      </Box>
    );
  }

  return (
    <CheckoutElementsProvider
      stripe={stripePromise}
      options={{
        clientSecret: checkout.clientSecret,
        elementsOptions: { appearance: STRIPE_APPEARANCE, fonts: STRIPE_FONTS },
      }}
    >
      <DepositPaymentForm amountLabel={amountLabel} />
    </CheckoutElementsProvider>
  );
}
