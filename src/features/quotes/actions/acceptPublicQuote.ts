'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { isPublicTokenShape } from '../document/publicToken';

export interface AcceptQuoteInput {
  token: string;
  name: string;
  agreed: boolean;
}

export type AcceptQuoteResult =
  | { ok: true; acceptedAt: string; acceptedByName: string }
  | { ok: false; message: string; field?: 'name' | 'agreed' };

const DB_ERRORS: Record<string, string> = {
  not_found: 'Ce devis est introuvable. Le lien a peut-être été remplacé par un plus récent.',
  expired:
    'Ce devis a dépassé sa date de validité. Contactez l’entreprise pour en recevoir un nouveau.',
  invalid_name: 'Indiquez votre nom et prénom.',
};

/** Acceptation par le client (page publique, sans compte). Le serveur revérifie tout. */
export async function acceptPublicQuote({
  token,
  name,
  agreed,
}: AcceptQuoteInput): Promise<AcceptQuoteResult> {
  const cleanName = name.trim().replace(/\s+/g, ' ');
  if (!isPublicTokenShape(token)) return { ok: false, message: DB_ERRORS.not_found ?? '' };
  if (cleanName.length < 2 || cleanName.length > 120) {
    return { ok: false, field: 'name', message: DB_ERRORS.invalid_name ?? '' };
  }
  if (!agreed) {
    return {
      ok: false,
      field: 'agreed',
      message: 'Cochez la case « bon pour accord » pour accepter.',
    };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('accept_public_quote', {
    p_token: token,
    p_name: cleanName,
  });
  if (error) {
    return {
      ok: false,
      message:
        DB_ERRORS[error.message] ??
        'L’acceptation n’a pas pu être enregistrée. Réessayez dans un instant.',
    };
  }

  const result = typeof data === 'object' && data !== null && !Array.isArray(data) ? data : {};
  const acceptedAt = typeof result.acceptedAt === 'string' ? result.acceptedAt : null;
  const acceptedByName = typeof result.acceptedByName === 'string' ? result.acceptedByName : null;
  if (!acceptedAt || !acceptedByName) {
    return { ok: false, message: 'L’acceptation n’a pas pu être confirmée. Réessayez.' };
  }
  revalidatePath(`/d/${token}`);
  return { ok: true, acceptedAt, acceptedByName };
}
