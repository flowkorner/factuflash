'use client';

import { useCallback, useReducer } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { sendMagicLink } from '../services/magicLink';
import { isValidEmail } from '../utils/email';

export type LoginStatus = 'idle' | 'sending' | 'sent';

interface LoginState {
  email: string;
  status: LoginStatus;
  error: string | null;
  resent: boolean;
}

type LoginAction =
  | { type: 'emailChanged'; email: string }
  | { type: 'sendStarted' }
  | { type: 'sendSucceeded' }
  | { type: 'sendFailed'; error: string }
  | { type: 'resent' }
  | { type: 'reset' };

const initialState: LoginState = { email: '', status: 'idle', error: null, resent: false };

export const LOGIN_ERRORS = {
  empty: 'Saisissez votre email.',
  invalid: 'Cet email ne semble pas valide. Exemple : vous@exemple.fr',
  network: 'L’envoi a échoué. Réessayez dans un instant.',
} as const;

function loginReducer(state: LoginState, action: LoginAction): LoginState {
  switch (action.type) {
    case 'emailChanged':
      return { ...state, email: action.email, error: null };
    case 'sendStarted':
      return { ...state, status: 'sending', error: null };
    case 'sendSucceeded':
      return { ...state, status: 'sent', resent: false };
    case 'sendFailed':
      return { ...state, status: 'idle', error: action.error };
    case 'resent':
      return { ...state, resent: true };
    case 'reset':
      return { ...state, status: 'idle', resent: false, error: null };
    default:
      return state;
  }
}

function validate(email: string): string | null {
  if (email.trim().length === 0) return LOGIN_ERRORS.empty;
  if (!isValidEmail(email)) return LOGIN_ERRORS.invalid;
  return null;
}

export interface UseMagicLinkLogin {
  email: string;
  status: LoginStatus;
  error: string | null;
  resent: boolean;
  onEmailChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onResend: () => Promise<void>;
  onChangeEmail: () => void;
}

export function useMagicLinkLogin(): UseMagicLinkLogin {
  const [state, dispatch] = useReducer(loginReducer, initialState);
  const { email } = state;

  const onEmailChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    dispatch({ type: 'emailChanged', email: event.target.value });
  }, []);

  const onSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const validationError = validate(email);
      if (validationError) {
        dispatch({ type: 'sendFailed', error: validationError });
        return;
      }
      dispatch({ type: 'sendStarted' });
      try {
        await sendMagicLink(email.trim());
        dispatch({ type: 'sendSucceeded' });
      } catch {
        dispatch({ type: 'sendFailed', error: LOGIN_ERRORS.network });
      }
    },
    [email],
  );

  const onResend = useCallback(async () => {
    try {
      await sendMagicLink(email.trim());
      dispatch({ type: 'resent' });
    } catch {
      dispatch({ type: 'sendFailed', error: LOGIN_ERRORS.network });
    }
  }, [email]);

  const onChangeEmail = useCallback(() => {
    dispatch({ type: 'reset' });
  }, []);

  return { ...state, onEmailChange, onSubmit, onResend, onChangeEmail };
}
