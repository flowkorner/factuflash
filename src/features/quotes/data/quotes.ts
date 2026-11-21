import { createSupabaseServerClient } from '@/lib/supabase/server';
import { centsToInput, formatQuantity } from '../domain/money';
import type { ClientOption, QuoteForEdit, QuoteSummary } from '../domain/types';

/** Devis de l'artisan connecté, du plus récent au plus ancien (totaux calculés par la vue SQL). */
export async function listQuoteSummaries(): Promise<QuoteSummary[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('quote_summaries')
    .select(
      'id, number, status, title, issue_date, client_name, total_ttc_cents, deposit_paid_cents',
    )
    .order('updated_at', { ascending: false })
    .limit(200);
  if (error) throw new Error(`Lecture des devis impossible (${error.code})`);
  return data.map((row) => ({
    id: row.id,
    number: row.number,
    status: row.status,
    title: row.title,
    issueDate: row.issue_date,
    clientName: row.client_name,
    totalTtcCents: row.total_ttc_cents,
    depositPaidCents: row.deposit_paid_cents,
  }));
}

export async function listClients(): Promise<ClientOption[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('clients')
    .select('id, name, email, address')
    .order('name', { ascending: true })
    .limit(500);
  if (error) throw new Error(`Lecture des clients impossible (${error.code})`);
  return data;
}

/** Devis et lignes, convertis en valeurs de formulaire ; null s'il n'existe pas (ou pas à vous). */
export async function getQuoteForEdit(id: string): Promise<QuoteForEdit | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = await createSupabaseServerClient();
  const { data: quote, error } = await supabase
    .from('quotes')
    .select(
      'id, number, status, issue_date, vat_mode, client_id, title, site_address, description, validity_days',
    )
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(`Lecture du devis impossible (${error.code})`);
  if (!quote) return null;

  const { data: lines, error: linesError } = await supabase
    .from('quote_lines')
    .select('id, designation, quantity, unit, unit_price_cents, vat_rate_bp, source, price_item_id')
    .eq('quote_id', id)
    .order('position', { ascending: true });
  if (linesError) throw new Error(`Lecture des lignes impossible (${linesError.code})`);

  return {
    id: quote.id,
    number: quote.number,
    status: quote.status,
    issueDate: quote.issue_date,
    vatMode: quote.vat_mode,
    values: {
      clientId: quote.client_id,
      newClientName: '',
      newClientEmail: '',
      title: quote.title,
      siteAddress: quote.site_address,
      description: quote.description ?? '',
      validityDays: quote.validity_days,
      lines: lines.map((line) => ({
        key: line.id,
        designation: line.designation,
        // numeric arrive en nombre (ex. 2.5) : conversion sûre à 3 décimales.
        quantity: formatQuantity(Math.round(Number(line.quantity) * 1000)),
        unit: line.unit,
        unitPrice: centsToInput(line.unit_price_cents),
        vatRateBp: line.vat_rate_bp,
        source: line.source,
        priceItemId: line.price_item_id,
      })),
    },
  };
}
