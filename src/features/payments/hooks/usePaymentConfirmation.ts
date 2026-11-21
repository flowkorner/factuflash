'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export const CONFIRMATION_INTERVAL_MS = 3000;
/** Au-delà, on arrête de relire et on l'explique au client (le webhook peut arriver plus tard). */
export const CONFIRMATION_DEADLINE_MS = 90_000;

export interface PaymentConfirmation {
  timedOut: boolean;
  /** Relance une période d'attente (bouton « Vérifier à nouveau »). */
  retry: () => void;
}

/**
 * Retour de Stripe : la page ne déduit RIEN de l'URL. Elle relit le statut en base toutes les 3 s
 * jusqu'à ce que le webhook l'ait mis à jour, pendant 90 s au plus (temps réel, et non nombre
 * d'essais : une relecture lente ne prolonge pas l'attente).
 */
export function usePaymentConfirmation(waiting: boolean): PaymentConfirmation {
  const router = useRouter();
  const [startedAt, setStartedAt] = useState(() => Date.now());
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (!waiting || timedOut) return undefined;
    const id = window.setInterval(() => {
      if (Date.now() - startedAt >= CONFIRMATION_DEADLINE_MS) {
        setTimedOut(true);
        return;
      }
      router.refresh();
    }, CONFIRMATION_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [waiting, timedOut, startedAt, router]);

  const retry = useCallback(() => {
    setStartedAt(Date.now());
    setTimedOut(false);
    router.refresh();
  }, [router]);

  return { timedOut: waiting && timedOut, retry };
}
