'use client';

import { useCallback, useState, useTransition } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { acceptPublicQuote } from '../actions/acceptPublicQuote';

export interface Acceptance {
  acceptedAt: string;
  acceptedByName: string;
}

export interface UseAcceptQuote {
  name: string;
  agreed: boolean;
  canSubmit: boolean;
  isSubmitting: boolean;
  error: string | null;
  accepted: Acceptance | null;
  onNameChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onAgreedChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

export function useAcceptQuote(token: string, initial: Acceptance | null): UseAcceptQuote {
  const [name, setName] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accepted, setAccepted] = useState<Acceptance | null>(initial);
  const [isSubmitting, startTransition] = useTransition();
  const canSubmit = name.trim().length >= 2 && agreed && !isSubmitting;

  const onNameChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setName(event.target.value);
    setError(null);
  }, []);

  const onAgreedChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setAgreed(event.target.checked);
    setError(null);
  }, []);

  const onSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!canSubmit) return;
      startTransition(async () => {
        try {
          const result = await acceptPublicQuote({ token, name, agreed });
          if (result.ok) {
            setAccepted({ acceptedAt: result.acceptedAt, acceptedByName: result.acceptedByName });
            return;
          }
          setError(result.message);
        } catch {
          setError(
            'L’acceptation n’a pas pu être enregistrée. Vérifiez votre connexion et réessayez.',
          );
        }
      });
    },
    [canSubmit, token, name, agreed],
  );

  return {
    name,
    agreed,
    canSubmit,
    isSubmitting,
    error,
    accepted,
    onNameChange,
    onAgreedChange,
    onSubmit,
  };
}
