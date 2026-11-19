import { redirect } from 'next/navigation';
import type { NextRequest } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getSafeRedirectPath } from '@/features/auth/utils/safeRedirect';

const INVALID_LINK_PATH = '/connexion?erreur=lien-invalide';

/**
 * Cible du lien magique : `/auth/confirm?token_hash=…&type=email`.
 * Fonctionne même si le lien est ouvert dans un autre navigateur que celui de la demande.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type');
  const next = getSafeRedirectPath(searchParams.get('next'), '/devis');

  if (!tokenHash || type !== 'email') {
    redirect(INVALID_LINK_PATH);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.verifyOtp({ type: 'email', token_hash: tokenHash });

  redirect(error ? INVALID_LINK_PATH : next);
}
