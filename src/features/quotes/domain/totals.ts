import type { VatRateBp } from './vat';

export interface TotalsLine {
  quantityMilli: number;
  unitPriceCents: number;
  vatRateBp: VatRateBp;
}

export interface VatGroup {
  rateBp: VatRateBp;
  htCents: number;
  vatCents: number;
}

export interface QuoteTotals {
  lineHtCents: number[];
  htCents: number;
  vatCents: number;
  ttcCents: number;
  vatGroups: VatGroup[];
}

/** Arrondi au plus proche (moitié vers le haut) d'une division entière positive. */
function divideRounded(numerator: bigint, denominator: bigint): number {
  return Number((numerator * 2n + denominator) / (denominator * 2n));
}

/** HT d'une ligne = quantité × prix, arrondi au centime. */
export function lineHtCents(line: TotalsLine): number {
  return divideRounded(BigInt(line.quantityMilli) * BigInt(line.unitPriceCents), 1000n);
}

/**
 * Mêmes arrondis que la vue SQL quote_summaries :
 * HT arrondi par ligne, TVA calculée et arrondie par taux.
 */
export function computeTotals(lines: readonly TotalsLine[]): QuoteTotals {
  const lineHt = lines.map(lineHtCents);
  const htByRate = lines.reduce((groups, line, index) => {
    groups.set(line.vatRateBp, (groups.get(line.vatRateBp) ?? 0) + (lineHt[index] ?? 0));
    return groups;
  }, new Map<VatRateBp, number>());

  const vatGroups: VatGroup[] = [...htByRate.entries()]
    .sort(([a], [b]) => b - a)
    .map(([rateBp, htCents]) => ({
      rateBp,
      htCents,
      vatCents: divideRounded(BigInt(htCents) * BigInt(rateBp), 10000n),
    }));

  const htCents = lineHt.reduce((sum, value) => sum + value, 0);
  const vatCents = vatGroups.reduce((sum, group) => sum + group.vatCents, 0);
  return { lineHtCents: lineHt, htCents, vatCents, ttcCents: htCents + vatCents, vatGroups };
}
