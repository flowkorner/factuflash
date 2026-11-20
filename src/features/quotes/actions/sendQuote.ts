'use server';

import { revalidatePath } from 'next/cache';
import { getSiteUrl } from '@/lib/env';
import { sendEmail } from '@/lib/email/resend';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getCurrentCompany } from '@/features/company/data/getCurrentCompany';
import { buildLegalMentions } from '../domain/legalMentions';
import { formatIssueDate } from '../domain/format';
import { formatCents } from '../domain/money';
import { buildQuoteEmail } from '../email/quoteEmail';
import { createPublicToken } from '../document/publicToken';
import { parseQuoteSnapshot } from '../document/snapshot';

export interface SendQuoteInput {
  quoteId: string;
  email: string;
}

export type SendQuoteResult =
  | { ok: true; sentTo: string }
  | { ok: false; message: string; field?: 'email'; sentButEmailFailed?: boolean };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const DB_ERRORS: Record<string, string> = {
  not_authenticated: 'Votre session a expiré. Reconnectez-vous.',
  quote_not_found: 'Devis introuvable.',
  quote_not_sendable: 'Ce devis a déjà été accepté : il ne peut plus être renvoyé.',
  invalid_lines: 'Ajoutez au moins une ligne avant d’envoyer.',
  company_missing: 'Complétez d’abord « Mon entreprise ».',
  invalid_email: 'Cet email ne semble pas valide.',
};

/**
 * Envoie (ou renvoie) le devis : nouveau lien secret, devis figé et verrouillé, puis email au client.
 * Ordre volontaire : la base d'abord (le lien doit exister avant l'email), l'email ensuite.
 * Si l'email échoue, le devis reste « Envoyé » et l'artisan peut le renvoyer.
 */
export async function sendQuote({ quoteId, email }: SendQuoteInput): Promise<SendQuoteResult> {
  const recipient = email.trim().toLowerCase();
  if (!EMAIL_PATTERN.test(recipient) || recipient.length > 254) {
    return {
      ok: false,
      field: 'email',
      message: 'Cet email ne semble pas valide. Exemple : client@exemple.fr',
    };
  }

  const [company, supabase] = await Promise.all([
    getCurrentCompany(),
    createSupabaseServerClient(),
  ]);
  if (!company) return { ok: false, message: DB_ERRORS.company_missing ?? '' };

  const { data: quote } = await supabase
    .from('quotes')
    .select('validity_days')
    .eq('id', quoteId)
    .maybeSingle();
  if (!quote) return { ok: false, message: DB_ERRORS.quote_not_found ?? '' };

  const mentions = buildLegalMentions({
    companyName: company.name,
    siret: company.siret,
    vatMode: company.vatMode,
    validityDays: quote.validity_days,
  });
  const { token, hash } = createPublicToken();

  const { data, error } = await supabase.rpc('send_quote', {
    p_quote_id: quoteId,
    p_token_hash: hash,
    p_recipient_email: recipient,
    p_mentions: mentions,
  });
  if (error) {
    console.error('[quotes] send_quote a échoué', { code: error.code, message: error.message });
    return {
      ok: false,
      message: DB_ERRORS[error.message] ?? 'L’envoi a échoué. Réessayez dans un instant.',
    };
  }

  const result = typeof data === 'object' && data !== null && !Array.isArray(data) ? data : {};
  const snapshot = parseQuoteSnapshot(result.snapshot);
  const validUntil = typeof result.validUntil === 'string' ? result.validUntil : null;
  revalidatePath('/devis');
  revalidatePath(`/devis/${quoteId}`);
  if (!snapshot || !validUntil) {
    return {
      ok: false,
      sentButEmailFailed: true,
      message: 'Devis verrouillé, mais l’email n’a pas pu être préparé.',
    };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isFranchise = snapshot.vatMode === 'franchise';
  const message = buildQuoteEmail({
    companyName: snapshot.company.name,
    clientName: snapshot.client.name,
    number: snapshot.number,
    title: snapshot.title,
    totalLabel: isFranchise ? 'Total à payer' : 'Total TTC',
    totalValue: formatCents(snapshot.totals.ttcCents),
    validUntilLabel: formatIssueDate(validUntil),
    link: `${getSiteUrl()}/d/${token}`,
  });

  try {
    const sent = await sendEmail({
      to: recipient,
      ...message,
      fromName: `${snapshot.company.name} via FactuFlash`,
      // Le client répond directement à l'artisan.
      replyTo: user?.email ?? null,
    });
    if (!sent.ok) throw new Error(sent.reason);
  } catch (sendError) {
    console.error('[quotes] email non parti', {
      reason: sendError instanceof Error ? sendError.message : 'inconnue',
    });
    return {
      ok: false,
      sentButEmailFailed: true,
      message:
        'Le devis est marqué « Envoyé », mais l’email n’est pas parti. Vérifiez la configuration d’envoi puis utilisez « Renvoyer l’email ».',
    };
  }

  return { ok: true, sentTo: recipient };
}
