'use server';

import { revalidatePath } from 'next/cache';
import { getCurrentCompany } from '@/features/company/data/getCurrentCompany';
import type { QuoteLinePayload } from '@/lib/supabase/database.types';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { milliToDecimalString } from '../domain/money';
import type { SaveQuoteInput, SaveQuoteResult } from '../domain/types';
import { validateQuote } from '../domain/validation';

const DB_ERRORS: Record<string, string> = {
  not_authenticated: 'Votre session a expiré. Reconnectez-vous.',
  company_missing: 'Complétez d’abord « Mon entreprise ».',
  quote_not_editable: 'Ce devis n’est plus modifiable.',
  invalid_lines: 'Ajoutez entre 1 et 100 lignes.',
  client_missing: 'Choisissez un client ou créez-en un.',
};
const GENERIC_ERROR = 'L’enregistrement a échoué. Réessayez dans un instant.';

/**
 * Enregistre un brouillon (création ou modification) en une seule transaction SQL
 * (fonction save_quote_draft : client éventuel + devis + lignes + numéro).
 */
export async function saveQuoteDraft({
  quoteId,
  values,
}: SaveQuoteInput): Promise<SaveQuoteResult> {
  const company = await getCurrentCompany();
  if (!company) {
    return { ok: false, errors: {}, message: DB_ERRORS.company_missing };
  }

  // Le navigateur n'est jamais cru sur parole : on revalide tout ici.
  const { errors, data } = validateQuote(values, company.vatMode);
  if (!data) return { ok: false, errors };

  const lines: QuoteLinePayload[] = data.lines.map((line) => ({
    designation: line.designation,
    quantity: milliToDecimalString(line.quantityMilli),
    unit: line.unit,
    unit_price_cents: line.unitPriceCents,
    vat_rate_bp: line.vatRateBp,
    source: line.source,
    price_item_id: line.priceItemId,
  }));

  const supabase = await createSupabaseServerClient();
  const { data: id, error } = await supabase.rpc('save_quote_draft', {
    p_quote_id: quoteId,
    p_client_id: data.clientId,
    // Nouveau client : son adresse par défaut est celle du chantier.
    p_new_client: data.newClient
      ? { name: data.newClient.name, email: data.newClient.email, address: data.siteAddress }
      : null,
    p_title: data.title,
    p_site_address: data.siteAddress,
    p_description: data.description,
    p_validity_days: data.validityDays,
    p_lines: lines,
  });

  if (error || !id) {
    console.error('[quotes] enregistrement échoué', { code: error?.code, message: error?.message });
    const known = error?.message ? DB_ERRORS[error.message] : undefined;
    return { ok: false, errors: {}, message: known ?? GENERIC_ERROR };
  }

  revalidatePath('/devis');
  return { ok: true, id };
}
