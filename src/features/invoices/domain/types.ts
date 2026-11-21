import type { InvoiceKindDb, PaymentMethodDb } from '@/lib/supabase/database.types';

export type InvoiceKind = InvoiceKindDb;
export type PaymentMethod = PaymentMethodDb;

/** Délais de paiement proposés pour la facture de solde (0 = à réception). Max légal : 60 jours. */
export const DUE_DAYS_OPTIONS: readonly number[] = [0, 15, 30, 45, 60];
export const DEFAULT_DUE_DAYS = 30;

/** Moyens de paiement que l'artisan peut déclarer pour le solde (la carte en ligne = acompte Stripe). */
export const MANUAL_PAYMENT_METHODS: readonly Exclude<PaymentMethod, 'card_online'>[] = [
  'transfer',
  'cheque',
  'cash',
  'card',
];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  card_online: 'carte bancaire en ligne',
  transfer: 'virement',
  cheque: 'chèque',
  cash: 'espèces',
  card: 'carte bancaire',
};

export function isDueDays(value: number): boolean {
  return DUE_DAYS_OPTIONS.includes(value);
}

export function isManualPaymentMethod(
  value: string,
): value is Exclude<PaymentMethod, 'card_online'> {
  return (MANUAL_PAYMENT_METHODS as readonly string[]).includes(value);
}

export interface InvoiceSummary {
  id: string;
  kind: InvoiceKind;
  number: string;
  issueDate: string;
  dueDate: string;
  totalTtcCents: number;
  amountDueCents: number;
  paidOn: string | null;
  paymentMethod: PaymentMethod | null;
  sentAt: string | null;
  sentToEmail: string | null;
}
