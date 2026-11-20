'use client';

import { useCallback, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { deleteQuoteDraft } from '../actions/deleteQuoteDraft';

export interface UseDeleteQuoteDraft {
  isOpen: boolean;
  isDeleting: boolean;
  error: string | null;
  open: () => void;
  close: () => void;
  confirm: () => void;
}

/**
 * Ouvre la confirmation, supprime, puis :
 * - `redirectTo` fourni (écran du devis) → on quitte l'écran ;
 * - sinon (carte de Mes devis) → la liste est rafraîchie.
 */
export function useDeleteQuoteDraft(quoteId: string, redirectTo?: string): UseDeleteQuoteDraft {
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, startTransition] = useTransition();
  const router = useRouter();

  const open = useCallback(() => {
    setError(null);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    if (!isDeleting) setIsOpen(false);
  }, [isDeleting]);

  const confirm = useCallback(() => {
    startTransition(async () => {
      try {
        const result = await deleteQuoteDraft(quoteId);
        if (!result.ok) {
          setError(result.message);
          return;
        }
        setIsOpen(false);
        if (redirectTo) router.replace(redirectTo);
        else router.refresh();
      } catch {
        setError('La suppression a échoué. Vérifiez votre connexion et réessayez.');
      }
    });
  }, [quoteId, redirectTo, router]);

  return { isOpen, isDeleting, error, open, close, confirm };
}
