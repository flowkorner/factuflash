'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const INTERVAL_MS = 3000;
const MAX_ATTEMPTS = 10;

/**
 * Retour de Stripe : la page ne déduit RIEN de l'URL. Elle relit le statut en base
 * toutes les 3 s (30 s max) jusqu'à ce que le webhook l'ait mis à jour.
 */
export function usePaymentConfirmation(waiting: boolean): { timedOut: boolean } {
  const router = useRouter();
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    if (!waiting || attempts >= MAX_ATTEMPTS) return undefined;
    const id = window.setTimeout(() => {
      router.refresh();
      setAttempts((count) => count + 1);
    }, INTERVAL_MS);
    return () => window.clearTimeout(id);
  }, [waiting, attempts, router]);

  return { timedOut: waiting && attempts >= MAX_ATTEMPTS };
}
