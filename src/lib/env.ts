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

export interface StripeEnv {
  secretKey: string;
  webhookSecret: string;
}

/**
 * Clés Stripe côté serveur. Ticket 6 : MODE TEST uniquement — une clé live est refusée
 * pour qu'aucun vrai paiement ne parte par erreur.
 */
export function getStripeEnv(): StripeEnv {
  const secretKey = required('STRIPE_SECRET_KEY', process.env.STRIPE_SECRET_KEY);
  if (!/^(sk|rk)_test_/.test(secretKey)) {
    throw new Error('STRIPE_SECRET_KEY doit être une clé de TEST (sk_test_… ou rk_test_…).');
  }
  return {
    secretKey,
    webhookSecret: required('STRIPE_WEBHOOK_SECRET', process.env.STRIPE_WEBHOOK_SECRET),
  };
}

/** Clé publiable Stripe (navigateur). Accès littéral pour que Next.js l'injecte. */
export function getStripePublishableKey(): string {
  return required(
    'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  );
}

/** Secret serveur exigé par la base pour enregistrer un paiement (empreinte dans private.app_secrets). */
export function getPaymentsDbSecret(): string {
  return required('PAYMENTS_DB_SECRET', process.env.PAYMENTS_DB_SECRET);
}
