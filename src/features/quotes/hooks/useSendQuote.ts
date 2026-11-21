'use client';

import { useCallback, useState, useTransition } from 'react';
import type { ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import { sendQuote } from '../actions/sendQuote';
import { DEFAULT_DEPOSIT_PERCENT, isDepositPercent } from '../domain/deposit';

export interface UseSendQuote {
  isOpen: boolean;
  email: string;
  emailError: string | null;
  error: string | null;
  isSending: boolean;
  depositPercent: number;
  open: (quoteId: string, email: string) => void;
  close: () => void;
  onEmailChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onDepositChange: (event: ChangeEvent<HTMLSelectElement>) => void;
  confirm: () => void;
}

/** Fenêtre d'envoi : email du client (modifiable), envoi, puis écran du devis envoyé. */
export function useSendQuote(): UseSendQuote {
  const [quoteId, setQuoteId] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [depositPercent, setDepositPercent] = useState(DEFAULT_DEPOSIT_PERCENT);
  const [isSending, startTransition] = useTransition();
  const router = useRouter();

  const open = useCallback((id: string, initialEmail: string) => {
    setQuoteId(id);
    setEmail(initialEmail);
    setEmailError(null);
    setError(null);
  }, []);

  const close = useCallback(() => {
    if (!isSending) setQuoteId(null);
  }, [isSending]);

  const onEmailChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setEmail(event.target.value);
    setEmailError(null);
  }, []);

  const onDepositChange = useCallback((event: ChangeEvent<HTMLSelectElement>) => {
    const value = Number(event.target.value);
    if (isDepositPercent(value)) setDepositPercent(value);
  }, []);

  const confirm = useCallback(() => {
    if (!quoteId) return;
    const id = quoteId;
    startTransition(async () => {
      try {
        const result = await sendQuote({ quoteId: id, email, depositPercent });
        if (result.ok) {
          setQuoteId(null);
          router.replace(`/devis/${id}?envoye=1`);
          router.refresh();
          return;
        }
        if (result.field === 'email') {
          setEmailError(result.message);
          return;
        }
        if (result.sentButEmailFailed) {
          // Devis verrouillé mais email non parti : l'écran du devis envoyé propose « Renvoyer ».
          setQuoteId(null);
          router.replace(`/devis/${id}?echec-email=1`);
          router.refresh();
          return;
        }
        setError(result.message);
      } catch {
        setError('L’envoi a échoué. Vérifiez votre connexion et réessayez.');
      }
    });
  }, [quoteId, email, depositPercent, router]);

  return {
    isOpen: quoteId !== null,
    email,
    emailError,
    error,
    isSending,
    depositPercent,
    open,
    close,
    onEmailChange,
    onDepositChange,
    confirm,
  };
}
