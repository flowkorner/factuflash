import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSupabaseEnv } from '@/lib/env';

const PROTECTED_PREFIXES = ['/devis', '/entreprise', '/factures'] as const;
const GUEST_ONLY_PREFIXES = ['/connexion'] as const;

function matches(pathname: string, prefixes: readonly string[]): boolean {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

/** Redirige en conservant les cookies de session éventuellement rafraîchis. */
function redirectTo(request: NextRequest, pathname: string, from: NextResponse): NextResponse {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = '';
  const redirect = NextResponse.redirect(url);
  from.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  from.headers.forEach((value, key) => {
    if (key.toLowerCase() !== 'set-cookie') redirect.headers.set(key, value);
  });
  return redirect;
}

/**
 * Rafraîchit la session Supabase à chaque requête et applique les règles d'accès :
 * pages protégées → /connexion si non connecté ; /connexion → /devis si déjà connecté.
 */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  const holder = { response: NextResponse.next({ request }) };
  const { url, publishableKey } = getSupabaseEnv();

  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet, headers) => {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        holder.response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          holder.response.cookies.set(name, value, options),
        );
        Object.entries(headers).forEach(([key, value]) => holder.response.headers.set(key, value));
      },
    },
  });

  // Ne rien exécuter entre la création du client et cet appel (recommandation Supabase).
  const { data } = await supabase.auth.getClaims();
  const isAuthenticated = Boolean(data?.claims);
  const { pathname } = request.nextUrl;

  if (!isAuthenticated && matches(pathname, PROTECTED_PREFIXES)) {
    return redirectTo(request, '/connexion', holder.response);
  }
  if (isAuthenticated && matches(pathname, GUEST_ONLY_PREFIXES)) {
    return redirectTo(request, '/devis', holder.response);
  }
  return holder.response;
}
