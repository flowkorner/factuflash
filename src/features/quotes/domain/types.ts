import type { QuoteStatusDb, SourceDb } from '@/lib/supabase/database.types';
import type { VatMode } from '@/features/company/domain/types';
import type { Unit } from './units';
import type { VatRateBp } from './vat';

export type QuoteStatus = QuoteStatusDb;
export type Source = SourceDb;

export interface ClientOption {
  id: string;
  name: string;
  email: string | null;
  address: string | null;
}

/** Ligne telle que saisie (chaînes) : on garde la saisie de l'artisan tant qu'elle n'est pas valide. */
export interface QuoteLineInput {
  key: string;
  designation: string;
  quantity: string;
  unit: Unit;
  unitPrice: string;
  vatRateBp: VatRateBp;
  source: Source;
  priceItemId: string | null;
}

export const NEW_CLIENT = '__new__';

export interface QuoteFormValues {
  /** id d'un client existant, NEW_CLIENT, ou '' si rien n'est choisi. */
  clientId: string;
  newClientName: string;
  newClientEmail: string;
  title: string;
  siteAddress: string;
  description: string;
  validityDays: number;
  lines: QuoteLineInput[];
}

export type LineField = 'designation' | 'quantity' | 'unitPrice';

export interface QuoteFormErrors {
  clientId?: string;
  newClientName?: string;
  newClientEmail?: string;
  title?: string;
  siteAddress?: string;
  lines?: string;
  lineErrors?: Record<string, Partial<Record<LineField, string>>>;
}

/** Ligne validée, prête à enregistrer. */
export interface QuoteLineData {
  designation: string;
  quantityMilli: number;
  unit: Unit;
  unitPriceCents: number;
  vatRateBp: VatRateBp;
  source: Source;
  priceItemId: string | null;
}

export interface QuoteDraftData {
  clientId: string | null;
  newClient: { name: string; email: string } | null;
  title: string;
  siteAddress: string;
  description: string;
  validityDays: number;
  lines: QuoteLineData[];
}

/** Ce que reçoit la Server Action (sérialisable). */
export interface SaveQuoteInput {
  quoteId: string | null;
  values: QuoteFormValues;
}

export type SaveQuoteResult =
  { ok: true; id: string } | { ok: false; errors: QuoteFormErrors; message?: string };

export interface QuoteSummary {
  id: string;
  number: string;
  status: QuoteStatus;
  title: string;
  issueDate: string;
  clientName: string;
  totalTtcCents: number;
}

export interface QuoteForEdit {
  id: string;
  number: string;
  status: QuoteStatus;
  issueDate: string;
  vatMode: VatMode;
  values: QuoteFormValues;
}
