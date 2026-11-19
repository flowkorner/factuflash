import { isVatMode } from '@/features/company/domain/validation';
import type { VatMode } from '@/features/company/domain/types';
import { parseEuroToCents, parseQuantityToMilli } from './money';
import { isUnit } from './units';
import { isVatRate } from './vat';
import type {
  LineField,
  QuoteDraftData,
  QuoteFormErrors,
  QuoteFormValues,
  QuoteLineData,
} from './types';
import { NEW_CLIENT } from './types';

export const MAX_LINES = 100;

export const QUOTE_ERRORS = {
  clientRequired: 'Choisissez un client ou créez-en un.',
  clientNameRequired: 'Indiquez le nom du client.',
  clientEmailInvalid: 'Cet email ne semble pas valide. Exemple : client@exemple.fr',
  titleRequired: 'Indiquez l’objet du devis (ex. : Remplacement chauffe-eau).',
  siteAddressRequired: 'Indiquez l’adresse du chantier.',
  linesRequired: 'Ajoutez au moins une ligne.',
  linesTooMany: `${MAX_LINES} lignes maximum.`,
  designationRequired: 'Décrivez la prestation.',
  quantityInvalid: 'Quantité positive, ex. : 2 ou 2,5',
  unitPriceInvalid: 'Prix en euros, ex. : 55 ou 55,50',
} as const;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface QuoteValidation {
  errors: QuoteFormErrors;
  data: QuoteDraftData | null;
}

/**
 * Valide la saisie (navigateur ET serveur). En franchise de TVA, toutes les lignes passent à 0 %.
 */
export function validateQuote(values: QuoteFormValues, vatMode: VatMode): QuoteValidation {
  const errors: QuoteFormErrors = {};
  const isNewClient = values.clientId === NEW_CLIENT;
  const newClientName = values.newClientName.trim();
  const newClientEmail = values.newClientEmail.trim().toLowerCase();
  const title = values.title.trim();
  const siteAddress = values.siteAddress.trim().replace(/\s+/g, ' ');

  if (values.clientId === '') errors.clientId = QUOTE_ERRORS.clientRequired;
  if (isNewClient && newClientName.length === 0)
    errors.newClientName = QUOTE_ERRORS.clientNameRequired;
  if (isNewClient && newClientName.length > 120)
    errors.newClientName = QUOTE_ERRORS.clientNameRequired;
  if (isNewClient && newClientEmail.length > 0 && !EMAIL_PATTERN.test(newClientEmail)) {
    errors.newClientEmail = QUOTE_ERRORS.clientEmailInvalid;
  }
  if (title.length === 0 || title.length > 160) errors.title = QUOTE_ERRORS.titleRequired;
  if (siteAddress.length < 5 || siteAddress.length > 300) {
    errors.siteAddress = QUOTE_ERRORS.siteAddressRequired;
  }
  if (values.lines.length === 0) errors.lines = QUOTE_ERRORS.linesRequired;
  if (values.lines.length > MAX_LINES) errors.lines = QUOTE_ERRORS.linesTooMany;

  const lineErrors: Record<string, Partial<Record<LineField, string>>> = {};
  const lines: QuoteLineData[] = values.lines.flatMap((line) => {
    const designation = line.designation.trim();
    const quantityMilli = parseQuantityToMilli(line.quantity);
    const unitPriceCents = parseEuroToCents(line.unitPrice);
    const current: Partial<Record<LineField, string>> = {};
    if (designation.length === 0 || designation.length > 300) {
      current.designation = QUOTE_ERRORS.designationRequired;
    }
    if (quantityMilli === null) current.quantity = QUOTE_ERRORS.quantityInvalid;
    if (unitPriceCents === null) current.unitPrice = QUOTE_ERRORS.unitPriceInvalid;
    if (Object.keys(current).length > 0) lineErrors[line.key] = current;
    if (quantityMilli === null || unitPriceCents === null || !isUnit(line.unit)) return [];
    if (!isVatRate(line.vatRateBp)) return [];
    return [
      {
        designation,
        quantityMilli,
        unit: line.unit,
        unitPriceCents,
        vatRateBp: vatMode === 'franchise' ? 0 : line.vatRateBp,
        source: line.source,
        priceItemId: line.priceItemId,
      },
    ];
  });
  if (Object.keys(lineErrors).length > 0) errors.lineErrors = lineErrors;

  const valid =
    Object.keys(errors).length === 0 && isVatMode(vatMode) && lines.length === values.lines.length;
  if (!valid) return { errors, data: null };

  return {
    errors,
    data: {
      clientId: isNewClient ? null : values.clientId,
      newClient: isNewClient ? { name: newClientName, email: newClientEmail } : null,
      title,
      siteAddress,
      description: values.description.trim().slice(0, 4000),
      validityDays: values.validityDays,
      lines,
    },
  };
}
