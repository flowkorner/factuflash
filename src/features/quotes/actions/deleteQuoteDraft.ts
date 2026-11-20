'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export type DeleteQuoteResult = { ok: true } | { ok: false; message: string };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Supprime un brouillon (ses lignes partent en cascade, le client reste).
 * La RLS limite déjà au propriétaire et au statut « draft » ; le filtre status est redit ici
 * pour qu'un devis envoyé entre-temps ne soit jamais supprimé.
 */
export async function deleteQuoteDraft(quoteId: string): Promise<DeleteQuoteResult> {
  if (!UUID_PATTERN.test(quoteId)) {
    return { ok: false, message: 'Devis introuvable.' };
  }

  const supabase = await createSupabaseServerClient();
  const { count, error } = await supabase
    .from('quotes')
    .delete({ count: 'exact' })
    .eq('id', quoteId)
    .eq('status', 'draft');

  if (error) {
    console.error('[quotes] suppression échouée', { code: error.code });
    return { ok: false, message: 'La suppression a échoué. Réessayez dans un instant.' };
  }
  if (!count) {
    return { ok: false, message: 'Ce devis n’existe plus ou n’est plus un brouillon.' };
  }

  revalidatePath('/devis');
  return { ok: true };
}
