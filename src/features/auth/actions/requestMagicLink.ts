'use server';

import { getSiteUrl } from '@/lib/env';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { MagicLinkResult } from '../types';
import { isValidEmail } from '../utils/email';

/**
 * Envoie le lien magique Supabase. Crée le compte s'il n'existe pas (inscription = connexion).
 * Le lien de l'email pointe vers `<site>/auth/confirm` (voir supabase/templates).
 */
export async function requestMagicLink(email: string): Promise<MagicLinkResult> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!isValidEmail(normalizedEmail)) {
    return { ok: false, reason: 'invalid_email' };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: normalizedEmail,
    options: { emailRedirectTo: getSiteUrl(), shouldCreateUser: true },
  });

  if (!error) {
    return { ok: true };
  }
  if (error.status === 429 || error.code?.startsWith('over_')) {
    return { ok: false, reason: 'rate_limited' };
  }
  console.error('[auth] signInWithOtp a échoué', { status: error.status, code: error.code });
  return { ok: false, reason: 'unknown' };
}
