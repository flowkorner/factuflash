import { LOGOS_BUCKET } from '@/features/company/data/getCurrentCompany';
import { isPublicTokenShape } from '@/features/quotes/document/publicToken';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { InvoiceDocumentView } from '../document/invoiceView';
import { buildInvoiceView } from '../document/invoiceView';
import { parseInvoiceSnapshot, parsePublicInvoice } from '../document/invoiceSnapshot';
import type { InvoiceSummary } from '../domain/types';

const UUID = /^[0-9a-f-]{36}$/i;

/** Factures d'un devis de l'artisan connecté (RLS : uniquement les siennes). */
export async function listQuoteInvoices(quoteId: string): Promise<InvoiceSummary[]> {
  if (!UUID.test(quoteId)) return [];
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('invoices')
    .select(
      'id, kind, number, issue_date, due_date, total_ttc_cents, amount_due_cents, paid_on, payment_method, sent_at, sent_to_email',
    )
    .eq('quote_id', quoteId)
    .order('number', { ascending: true });
  if (error) throw new Error(`Lecture des factures impossible (${error.code})`);
  return data.map((row) => ({
    id: row.id,
    kind: row.kind,
    number: row.number,
    issueDate: row.issue_date,
    dueDate: row.due_date,
    totalTtcCents: row.total_ttc_cents,
    amountDueCents: row.amount_due_cents,
    paidOn: row.paid_on,
    paymentMethod: row.payment_method,
    sentAt: row.sent_at,
    sentToEmail: row.sent_to_email,
  }));
}

export interface ArtisanInvoiceDocument {
  id: string;
  number: string;
  view: InvoiceDocumentView;
}

/** Facture de l'artisan connecté, pour son PDF. */
export async function getArtisanInvoiceDocument(
  id: string,
): Promise<ArtisanInvoiceDocument | null> {
  if (!UUID.test(id)) return null;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('invoices')
    .select('id, number, issue_date, due_date, service_date, paid_on, payment_method, snapshot')
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(`Lecture de la facture impossible (${error.code})`);
  if (!data) return null;
  const snapshot = parseInvoiceSnapshot(data.snapshot);
  if (!snapshot) throw new Error('Facture illisible (snapshot invalide)');
  const logoUrl = snapshot.company.logoPath
    ? supabase.storage.from(LOGOS_BUCKET).getPublicUrl(snapshot.company.logoPath).data.publicUrl
    : null;
  return {
    id: data.id,
    number: data.number,
    view: buildInvoiceView(snapshot, {
      issueDate: data.issue_date,
      dueDate: data.due_date,
      serviceDate: data.service_date,
      paidOn: data.paid_on,
      paymentMethod: data.payment_method,
      logoUrl,
    }),
  };
}

export type PublicInvoiceResult =
  { kind: 'found'; view: InvoiceDocumentView } | { kind: 'not_found' } | { kind: 'unavailable' };

/** Facture vue par le client via son lien secret. Une panne de la base ne fait jamais planter la page. */
export async function getPublicInvoiceDocument(token: string): Promise<PublicInvoiceResult> {
  if (!isPublicTokenShape(token)) return { kind: 'not_found' };
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('get_public_invoice', { p_token: token });
  if (error) {
    console.error('[facture publique] lecture impossible', {
      code: error.code,
      message: error.message,
    });
    return { kind: 'unavailable' };
  }
  const invoice = parsePublicInvoice(data);
  if (!invoice) return { kind: 'not_found' };
  const logoUrl = invoice.snapshot.company.logoPath
    ? supabase.storage.from(LOGOS_BUCKET).getPublicUrl(invoice.snapshot.company.logoPath).data
        .publicUrl
    : null;
  return {
    kind: 'found',
    view: buildInvoiceView(invoice.snapshot, {
      issueDate: invoice.issueDate,
      dueDate: invoice.dueDate,
      serviceDate: invoice.serviceDate,
      paidOn: invoice.paidOn,
      paymentMethod: invoice.paymentMethod,
      logoUrl,
    }),
  };
}
