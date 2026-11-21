import { getPaymentsDbSecret } from '@/lib/env';
import { createSupabaseAnonClient } from '@/lib/supabase/anon';
import type { DepositPayment } from './handleStripeEvent';

/** Enregistre le paiement en base (fonction SQL protégée par le secret serveur, idempotente). */
export async function recordDepositPayment(
  payment: DepositPayment,
): Promise<'recorded' | 'already_recorded'> {
  const { data, error } = await createSupabaseAnonClient().rpc('record_deposit_payment', {
    p_secret: getPaymentsDbSecret(),
    p_quote_id: payment.quoteId,
    p_session_id: payment.sessionId,
    p_payment_intent_id: payment.paymentIntentId,
    p_amount_cents: payment.amountCents,
    p_currency: payment.currency,
  });
  if (error) throw new Error(error.message);
  if (data !== 'recorded' && data !== 'already_recorded') throw new Error('réponse inattendue');
  return data;
}
