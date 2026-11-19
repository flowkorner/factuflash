/**
 * Variables d'environnement typées. Les accès `process.env.NEXT_PUBLIC_*` restent
 * littéraux pour que Next.js puisse les injecter (middleware compris).
 */
function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Variable d'environnement manquante : ${name} (voir .env.example).`);
  }
  return value;
}

export interface SupabaseEnv {
  url: string;
  publishableKey: string;
}

export function getSupabaseEnv(): SupabaseEnv {
  return {
    url: required('NEXT_PUBLIC_SUPABASE_URL', process.env.NEXT_PUBLIC_SUPABASE_URL),
    publishableKey: required(
      'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    ),
  };
}

export function getSiteUrl(): string {
  return required('NEXT_PUBLIC_SITE_URL', process.env.NEXT_PUBLIC_SITE_URL).replace(/\/+$/, '');
}
