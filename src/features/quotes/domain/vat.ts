import type { VatRateBpDb } from '@/lib/supabase/database.types';

/** Taux de TVA en points de base : 2000 = 20 %. */
export type VatRateBp = VatRateBpDb;

/** Taux proposés à un artisan qui facture la TVA (normal, intermédiaire, réduit). */
export const VAT_RATES: readonly VatRateBp[] = [2000, 1000, 550];
export const DEFAULT_VAT_RATE: VatRateBp = 2000;

export function isVatRate(value: number): value is VatRateBp {
  return value === 0 || value === 550 || value === 1000 || value === 2000;
}

export function formatVatRate(rate: VatRateBp): string {
  return `${(rate / 100).toLocaleString('fr-FR')} %`;
}
