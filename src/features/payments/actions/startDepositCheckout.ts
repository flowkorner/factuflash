'use server';

import { getSiteUrl } from '@/lib/env';
import { createStripeClient } from '@/lib/stripe/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { isPublicTokenShape } from '@/features/quotes/document/publicToken';

export type StartDepositCheckoutResult =
  { ok: true; clientSecret: string } | { ok: false; message: string };

/** Libellé de suivi dans le tableau de bord Stripe (suffixe de 8 lettres, recommandation Stripe). */
const INTEGRATION_IDENTIFIER = 'factuflash-acompte-qkvzmtrd';

const DB_ERRORS: Record<string, string> = {
  not_found: 'Ce devis est introuvable. Le lien a peut-être été remplacé par un plus récent.',
  already_paid: 'L’acompte de ce devis est déjà payé. Merci !',
  not_accepted: 'Acceptez d’abord le devis pour pouvoir payer l’acompte.',
  no_deposit: 'Ce devis ne demande pas d’acompte.',
};

interface DepositCheckout {
  quoteId: string;
  number: string;
  companyName: string;
  clientEmail: string | null;
  depositCents: number;
}

function parseDepositCheckout(value: unknown): DepositCheckout | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const quoteId = 'quoteId' in value && typeof value.quoteId === 'string' ? value.quoteId : null;
  const number = 'number' in value && typeof value.number === 'string' ? value.number : null;
  const companyName =
    'companyName' in value && typeof value.companyName === 'string' ? value.companyName : null;
  const clientEmail =
    'clientEmail' in value && typeof value.clientEmail === 'string' ? value.clientEmail : null;
  const cents =
    'depositCents' in value && typeof value.depositCents === 'number' ? value.depositCents : null;
  if (
    !quoteId ||
    !number ||
    !companyName ||
    cents === null ||
    !Number.isInteger(cents) ||
    cents <= 0
  ) {
    return null;
  }
  return { quoteId, number, companyName, clientEmail, depositCents: cents };
}

/**
 * Crée la session Stripe de l'acompte (Checkout Sessions, Payment Element intégré à la page).
 * Le montant vient de la base (fixé à l'envoi du devis), jamais du navigateur.
 * Le statut « Acompte payé » ne sera posé que par le webhook signé.
 */
export async function startDepositCheckout(token: string): Promise<StartDepositCheckoutResult> {
  if (!isPublicTokenShape(token)) return { ok: false, message: DB_ERRORS.not_found ?? '' };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('prepare_deposit_checkout', { p_token: token });
  if (error) {
    return {
      ok: false,
      message: DB_ERRORS[error.message] ?? 'Le paiement n’est pas disponible pour le moment.',
    };
  }
  const checkout = parseDepositCheckout(data);
  if (!checkout) return { ok: false, message: 'Le paiement n’est pas disponible pour le moment.' };

  const metadata = { quote_id: checkout.quoteId, quote_number: checkout.number, kind: 'deposit' };
  try {
    const session = await createStripeClient().checkout.sessions.create({
      ui_mode: 'elements',
      mode: 'payment',
      locale: 'fr',
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'eur',
            unit_amount: checkout.depositCents,
            product_data: {
              name: `Acompte · devis ${checkout.number}`,
              description: checkout.companyName,
            },
          },
        },
      ],
      ...(checkout.clientEmail ? { customer_email: checkout.clientEmail } : {}),
      metadata,
      payment_intent_data: {
        metadata,
        description: `Acompte devis ${checkout.number} (${checkout.companyName})`,
      },
      // Retour sur la page du devis : elle affiche le statut lu en base, jamais déduit de l'URL.
      return_url: `${getSiteUrl()}/d/${token}?paiement={CHECKOUT_SESSION_ID}`,
      integration_identifier: INTEGRATION_IDENTIFIER,
    });
    if (!session.client_secret) throw new Error('client_secret absent');
    return { ok: true, clientSecret: session.client_secret };
  } catch (stripeError) {
    console.error('[paiements] création de session Stripe échouée', {
      message: stripeError instanceof Error ? stripeError.message : 'inconnue',
    });
    return { ok: false, message: 'Le paiement n’a pas pu démarrer. Réessayez dans un instant.' };
  }
}
