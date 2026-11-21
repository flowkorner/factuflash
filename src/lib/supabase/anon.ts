import { createClient } from '@supabase/supabase-js';
import { getSupabaseEnv } from '@/lib/env';
import type { Database } from './database.types';

/**
 * Client Supabase sans session ni cookie (rôle anon), pour le webhook Stripe :
 * il n'agit qu'à travers des fonctions SQL protégées (secret serveur exigé).
 */
export function createSupabaseAnonClient() {
  const { url, publishableKey } = getSupabaseEnv();
  return createClient<Database>(url, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
