import { getPaymentsDbSecret } from '@/lib/env';
import { createSupabaseAnonClient } from '@/lib/supabase/anon';
import { parseInvoiceSnapshot } from '@/features/invoices/document/invoiceSnapshot';
import { sendInvoiceEmail } from '@/features/invoices/email/sendInvoiceEmail';
import { createPublicToken } from '@/features/quotes/document/publicToken';
import type { DepositPayment } from './handleStripeEvent';

type Recorded = 'recorded' | 'already_recorded';

function record(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

/**
 * Enregistre le paiement ET crée la facture d'acompte (même transaction SQL, idempotente),
 * puis envoie la facture au client. Un échec d'email n'annule rien : l'artisan pourra la renvoyer.
 */
export async function recordDepositPayment(payment: DepositPayment): Promise<Recorded> {
  const secret = getPaymentsDbSecret();
  const { token, hash } = createPublicToken();
  const supabase = createSupabaseAnonClient();
  const { data, error } = await supabase.rpc('record_deposit_payment', {
    p_secret: secret,
    p_quote_id: payment.quoteId,
    p_session_id: payment.sessionId,
    p_payment_intent_id: payment.paymentIntentId,
    p_amount_cents: payment.amountCents,
    p_currency: payment.currency,
    p_invoice_token_hash: hash,
  });
  if (error) throw new Error(error.message);

  const response = record(data);
  const result = response.result;
  if (result !== 'recorded' && result !== 'already_recorded') throw new Error('réponse inattendue');

  const invoice = record(response.invoice);
  const snapshot = parseInvoiceSnapshot(invoice.snapshot);
  const invoiceId = typeof invoice.id === 'string' ? invoice.id : null;
  const to = typeof invoice.sentToEmail === 'string' ? invoice.sentToEmail : null;
  const dueDate = typeof invoice.dueDate === 'string' ? invoice.dueDate : null;
  if (snapshot && invoiceId && to && dueDate) {
    const sent = await sendInvoiceEmail({ to, token, snapshot, dueDate, replyTo: null });
    if (sent) {
      await supabase.rpc('record_invoice_email_sent', {
        p_secret: secret,
        p_invoice_id: invoiceId,
      });
    }
  }
  return result;
}
