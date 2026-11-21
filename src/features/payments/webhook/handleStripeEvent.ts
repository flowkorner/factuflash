import type Stripe from 'stripe';

/** Ce que la base doit enregistrer pour un acompte payé. */
export interface DepositPayment {
  quoteId: string;
  sessionId: string;
  paymentIntentId: string | null;
  amountCents: number;
  currency: string;
}

export type RecordPayment = (payment: DepositPayment) => Promise<'recorded' | 'already_recorded'>;

/**
 * Résultat pour Stripe :
 * - `ok` (200) : traité, ou rien à faire ;
 * - `ignored` (200) : erreur définitive (rejouer ne changerait rien), journalisée ;
 * - `retry` (500) : erreur passagère, Stripe renverra l'événement.
 */
export type WebhookOutcome = { status: 'ok' | 'ignored' | 'retry'; detail: string };

/** Erreurs de la base pour lesquelles un nouvel essai ne servirait à rien. */
const PERMANENT_ERRORS = ['amount_mismatch', 'not_accepted', 'quote_not_found'];

export class RecordPaymentError extends Error {}

function paymentFromSession(session: Stripe.Checkout.Session): DepositPayment | null {
  const quoteId = session.metadata?.quote_id;
  if (session.metadata?.kind !== 'deposit' || !quoteId || session.amount_total === null)
    return null;
  const paymentIntent = session.payment_intent;
  return {
    quoteId,
    sessionId: session.id,
    paymentIntentId:
      typeof paymentIntent === 'string' ? paymentIntent : (paymentIntent?.id ?? null),
    amountCents: session.amount_total,
    currency: session.currency ?? '',
  };
}

/**
 * Traite un événement Stripe DÉJÀ VÉRIFIÉ (signature contrôlée par la route).
 * Seuls ces événements valident un paiement ; la page de retour n'est jamais crue.
 */
export async function handleStripeEvent(
  event: Stripe.Event,
  record: RecordPayment,
): Promise<WebhookOutcome> {
  if (event.type === 'checkout.session.async_payment_failed') {
    return { status: 'ok', detail: `paiement différé échoué (${event.data.object.id})` };
  }
  if (
    event.type !== 'checkout.session.completed' &&
    event.type !== 'checkout.session.async_payment_succeeded'
  ) {
    return { status: 'ok', detail: `événement ignoré : ${event.type}` };
  }

  const session = event.data.object;
  // Moyen de paiement différé : « completed » arrive avant l'argent. On attend async_payment_succeeded.
  if (session.payment_status !== 'paid') {
    return {
      status: 'ok',
      detail: `session ${session.id} pas encore payée (${session.payment_status})`,
    };
  }
  const payment = paymentFromSession(session);
  if (!payment)
    return { status: 'ignored', detail: `session ${session.id} sans acompte FactuFlash` };

  try {
    const result = await record(payment);
    return { status: 'ok', detail: `${result} (${session.id})` };
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'inconnue';
    if (PERMANENT_ERRORS.includes(reason)) {
      return { status: 'ignored', detail: `refusé par la base : ${reason} (${session.id})` };
    }
    return { status: 'retry', detail: `erreur passagère : ${reason} (${session.id})` };
  }
}
