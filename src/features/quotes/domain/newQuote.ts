import type { VatMode } from '@/features/company/domain/types';
import type { ClientOption, QuoteFormValues } from './types';
import { NEW_CLIENT } from './types';
import { DEFAULT_VAT_RATE } from './vat';

export const DEFAULT_VALIDITY_DAYS = 30;

/** Valeurs d'un devis vierge : une ligne vide, « Nouveau client » si l'artisan n'en a aucun. */
export function newQuoteValues(
  clients: readonly ClientOption[],
  vatMode: VatMode,
): QuoteFormValues {
  return {
    clientId: clients.length === 0 ? NEW_CLIENT : '',
    newClientName: '',
    newClientEmail: '',
    title: '',
    siteAddress: '',
    description: '',
    validityDays: DEFAULT_VALIDITY_DAYS,
    lines: [
      {
        key: 'new-0',
        designation: '',
        quantity: '1',
        unit: 'u',
        unitPrice: '',
        vatRateBp: vatMode === 'franchise' ? 0 : DEFAULT_VAT_RATE,
        source: 'manual',
        priceItemId: null,
      },
    ],
  };
}
