'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createPublicToken } from '@/features/quotes/document/publicToken';
import { parseInvoiceSnapshot } from '../document/invoiceSnapshot';
import { isDueDays, isManualPaymentMethod } from '../domain/types';
import { sendInvoiceEmail } from '../email/sendInvoiceEmail';

export type InvoiceActionResult =
  | { ok: true; number: string; emailSent: boolean }
  | { ok: false; message: string; field?: 'email' | 'serviceDate' | 'paidOn' };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const DB_ERRORS: Record<string, string> = {
  not_authenticated: 'Votre session a expiré. Reconnectez-vous.',
  quote_not_found: 'Devis introuvable.',
  quote_not_invoiceable: 'Ce devis a déjà sa facture de solde, ou n’a pas encore été accepté.',
  already_invoiced: 'Ce devis a déjà sa facture de solde.',
  invalid_service_date:
    'La date de fin des travaux doit être passée et postérieure à l’accord du client.',
  invalid_due_days: 'Délai de paiement invalide.',
  invalid_email: 'Cet email ne semble pas valide.',
  invoice_not_found: 'Facture introuvable.',
  already_paid: 'Cette facture est déjà marquée comme payée.',
  invalid_paid_on: 'La date de paiement doit être entre la date de la facture et aujourd’hui.',
  invalid_method: 'Moyen de paiement invalide.',
  not_final_invoice: 'Seule la facture de solde se marque comme payée ici.',
};
const GENERIC = 'L’opération a échoué. Réessayez dans un instant.';

function message(code: string | undefined): string {
  return (code && DB_ERRORS[code]) || GENERIC;
}

function record(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

/** Envoie l'email d'une facture que la base vient de créer ou de ré-ouvrir, puis le note comme envoyé. */
async function emailInvoice(
  data: unknown,
  token: string,
  to: string,
): Promise<{ number: string; emailSent: boolean }> {
  const result = record(data);
  const snapshot = parseInvoiceSnapshot(result.snapshot);
  const id = typeof result.id === 'string' ? result.id : null;
  const dueDate = typeof result.dueDate === 'string' ? result.dueDate : null;
  const number = typeof result.number === 'string' ? result.number : '';
  if (!snapshot || !id || !dueDate) return { number, emailSent: false };

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const emailSent = await sendInvoiceEmail({
    to,
    token,
    snapshot,
    dueDate,
    replyTo: user?.email ?? null,
  });
  if (emailSent) await supabase.rpc('mark_invoice_sent', { p_invoice_id: id });
  return { number, emailSent };
}

export interface CreateFinalInvoiceInput {
  quoteId: string;
  /** AAAA-MM-JJ */
  serviceDate: string;
  dueDays: number;
  email: string;
}

/** Émet la facture de solde (numéro définitif, contenu figé) puis l'envoie au client. */
export async function createFinalInvoice(
  input: CreateFinalInvoiceInput,
): Promise<InvoiceActionResult> {
  const email = input.email.trim().toLowerCase();
  if (!EMAIL_PATTERN.test(email))
    return { ok: false, field: 'email', message: message('invalid_email') };
  if (!DATE_PATTERN.test(input.serviceDate)) {
    return { ok: false, field: 'serviceDate', message: message('invalid_service_date') };
  }
  if (!isDueDays(input.dueDays)) return { ok: false, message: message('invalid_due_days') };

  const { token, hash } = createPublicToken();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('create_final_invoice', {
    p_quote_id: input.quoteId,
    p_service_date: input.serviceDate,
    p_due_days: input.dueDays,
    p_token_hash: hash,
    p_email: email,
  });
  if (error) {
    return {
      ok: false,
      message: message(error.message),
      ...(error.message === 'invalid_service_date' ? { field: 'serviceDate' as const } : {}),
    };
  }

  const sent = await emailInvoice(data, token, email);
  revalidatePath('/devis');
  revalidatePath(`/devis/${input.quoteId}`);
  return { ok: true, ...sent };
}

/** Envoie (ou renvoie) une facture : nouveau lien secret, l'ancien cesse de fonctionner. */
export async function sendInvoice({
  invoiceId,
  email,
}: {
  invoiceId: string;
  email: string;
}): Promise<InvoiceActionResult> {
  const recipient = email.trim().toLowerCase();
  if (!EMAIL_PATTERN.test(recipient))
    return { ok: false, field: 'email', message: message('invalid_email') };

  const { token, hash } = createPublicToken();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('send_invoice', {
    p_invoice_id: invoiceId,
    p_token_hash: hash,
    p_email: recipient,
  });
  if (error) return { ok: false, message: message(error.message) };

  const sent = await emailInvoice(data, token, recipient);
  revalidatePath('/devis', 'layout');
  return { ok: true, ...sent };
}

/** L'artisan déclare le solde reçu : facture acquittée, devis « Soldé ». */
export async function markInvoicePaid(input: {
  invoiceId: string;
  paidOn: string;
  method: string;
}): Promise<InvoiceActionResult> {
  if (!DATE_PATTERN.test(input.paidOn))
    return { ok: false, field: 'paidOn', message: message('invalid_paid_on') };
  if (!isManualPaymentMethod(input.method))
    return { ok: false, message: message('invalid_method') };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc('mark_final_invoice_paid', {
    p_invoice_id: input.invoiceId,
    p_paid_on: input.paidOn,
    p_method: input.method,
  });
  if (error) {
    return {
      ok: false,
      message: message(error.message),
      ...(error.message === 'invalid_paid_on' ? { field: 'paidOn' as const } : {}),
    };
  }
  revalidatePath('/devis', 'layout');
  return { ok: true, number: '', emailSent: false };
}
