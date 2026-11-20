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

export interface EmailEnv {
  apiKey: string;
  /** Expéditeur, ex. « FactuFlash <onboarding@resend.dev> ». */
  from: string;
  /** Si défini, TOUS les emails partent vers cette adresse (mode test Resend sans domaine vérifié). */
  testRecipient: string | null;
  apiUrl: string;
}

/** Variables serveur uniquement (jamais NEXT_PUBLIC_) : la clé Resend ne doit pas atteindre le navigateur. */
export function getEmailEnv(): EmailEnv {
  return {
    apiKey: required('RESEND_API_KEY', process.env.RESEND_API_KEY),
    from: process.env.EMAIL_FROM || 'FactuFlash <onboarding@resend.dev>',
    testRecipient: process.env.EMAIL_TEST_RECIPIENT || null,
    apiUrl: process.env.RESEND_API_URL || 'https://api.resend.com',
  };
}
