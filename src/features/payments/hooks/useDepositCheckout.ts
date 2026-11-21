'use client';

import { useCallback, useEffect, useState } from 'react';
import { startDepositCheckout } from '../actions/startDepositCheckout';

export type DepositCheckoutState =
  | { status: 'loading' }
  | { status: 'ready'; clientSecret: string }
  | { status: 'error'; message: string };

/** Crée la session Stripe à l'ouverture du formulaire de paiement ; `retry` en relance une. */
export function useDepositCheckout(token: string): {
  state: DepositCheckoutState;
  retry: () => void;
} {
  const [state, setState] = useState<DepositCheckoutState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const cancelled = { current: false };
    startDepositCheckout(token)
      .then((result) => {
        if (cancelled.current) return;
        setState(
          result.ok
            ? { status: 'ready', clientSecret: result.clientSecret }
            : { status: 'error', message: result.message },
        );
      })
      .catch(() => {
        if (!cancelled.current) {
          setState({
            status: 'error',
            message: 'Le paiement n’a pas pu démarrer. Vérifiez votre connexion.',
          });
        }
      });
    return () => {
      cancelled.current = true;
    };
  }, [token, attempt]);

  const retry = useCallback(() => {
    setState({ status: 'loading' });
    setAttempt((count) => count + 1);
  }, []);

  return { state, retry };
}
