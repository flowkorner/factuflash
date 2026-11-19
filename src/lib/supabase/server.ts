import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getSupabaseEnv } from '@/lib/env';
import type { Database } from './database.types';

/**
 * Client Supabase côté serveur (Server Components, Server Actions, Route Handlers).
 * À créer à chaque requête : il lit et écrit la session dans les cookies.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  const { url, publishableKey } = getSupabaseEnv();

  return createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Appel depuis un Server Component : écriture impossible, le middleware rafraîchit la session.
        }
      },
    },
  });
}
