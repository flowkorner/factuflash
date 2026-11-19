'use client';

import { useCallback, useReducer } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { requestMagicLink } from '../actions/requestMagicLink';
import type { MagicLinkFailure } from '../types';
import { isValidEmail } from '../utils/email';
import { useCountdown } from './useCountdown';

export type LoginStatus = 'idle' | 'sending' | 'sent';

/** Supabase impose 60 s entre deux envois pour une même adresse. */
export const RESEND_DELAY_SECONDS = 60;

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
  rateLimited: 'Trop de demandes. Réessayez dans quelques minutes.',
  network: 'L’envoi a échoué. Réessayez dans un instant.',
} as const;

const FAILURE_MESSAGES: Record<MagicLinkFailure, string> = {
  invalid_email: LOGIN_ERRORS.invalid,
  rate_limited: LOGIN_ERRORS.rateLimited,
  unknown: LOGIN_ERRORS.network,
};

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

/** Appelle la Server Action ; toute exception réseau devient un message lisible. */
async function send(email: string): Promise<string | null> {
  try {
    const result = await requestMagicLink(email.trim());
    return result.ok ? null : FAILURE_MESSAGES[result.reason];
  } catch {
    return LOGIN_ERRORS.network;
  }
}

export interface UseMagicLinkLogin {
  email: string;
  status: LoginStatus;
  error: string | null;
  resent: boolean;
  /** Secondes avant de pouvoir renvoyer un lien. */
  resendIn: number;
  onEmailChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  onResend: () => Promise<void>;
  onChangeEmail: () => void;
}

export function useMagicLinkLogin(): UseMagicLinkLogin {
  const [state, dispatch] = useReducer(loginReducer, initialState);
  const { remaining, start } = useCountdown();
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
      const error = await send(email);
      if (error) {
        dispatch({ type: 'sendFailed', error });
        return;
      }
      start(RESEND_DELAY_SECONDS);
      dispatch({ type: 'sendSucceeded' });
    },
    [email, start],
  );

  const onResend = useCallback(async () => {
    const error = await send(email);
    if (error) {
      dispatch({ type: 'sendFailed', error });
      return;
    }
    start(RESEND_DELAY_SECONDS);
    dispatch({ type: 'resent' });
  }, [email, start]);

  const onChangeEmail = useCallback(() => {
    dispatch({ type: 'reset' });
  }, []);

  return { ...state, resendIn: remaining, onEmailChange, onSubmit, onResend, onChangeEmail };
}
