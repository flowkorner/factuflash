'use client';

import { useCallback, useState } from 'react';
import type { FormEvent } from 'react';
import { PaymentElement, useCheckoutElements } from '@stripe/react-stripe-js/checkout';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';

interface DepositPaymentFormProps {
  amountLabel: string;
}

/** Formulaire de carte (Payment Element) ; la confirmation renvoie vers la page du devis. */
export function DepositPaymentForm({ amountLabel }: DepositPaymentFormProps) {
  const checkoutState = useCheckoutElements();
  const [error, setError] = useState<string | null>(null);
  const [isPaying, setIsPaying] = useState(false);

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (checkoutState.type !== 'success') return;
      setIsPaying(true);
      setError(null);
      // En cas de succès, Stripe redirige vers return_url : le statut y sera lu en base.
      const result = await checkoutState.checkout.confirm();
      if (result.type === 'error') {
        setError(result.error.message);
        setIsPaying(false);
      }
    },
    [checkoutState],
  );

  if (checkoutState.type === 'loading') {
    return (
      <Box role="status" sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 2 }}>
        <CircularProgress size={22} aria-hidden="true" />
        <Typography>Chargement du paiement sécurisé…</Typography>
      </Box>
    );
  }
  if (checkoutState.type === 'error') {
    return (
      <Alert severity="error" sx={{ borderRadius: '12px' }}>
        {checkoutState.error.message}
      </Alert>
    );
  }

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      noValidate
      sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
    >
      <PaymentElement options={{ layout: 'tabs' }} />
      {error ? (
        <Alert severity="error" role="alert" sx={{ borderRadius: '12px' }}>
          {error}
        </Alert>
      ) : null}
      <Button
        type="submit"
        variant="contained"
        size="large"
        fullWidth
        disabled={isPaying}
        aria-busy={isPaying}
      >
        {isPaying ? 'Paiement en cours…' : `Payer ${amountLabel}`}
      </Button>
      <Typography
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 0.75,
          fontSize: 13,
          color: 'text.secondary',
        }}
      >
        <LockOutlinedIcon sx={{ fontSize: 16 }} aria-hidden="true" />
        Paiement sécurisé par Stripe. FactuFlash ne voit jamais votre carte.
      </Typography>
    </Box>
  );
}
