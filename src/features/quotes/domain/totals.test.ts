import { computeTotals, lineHtCents } from './totals';

describe('computeTotals', () => {
  it('donne les mêmes totaux que la vue SQL quote_summaries', () => {
    // Même exemple que le test de la migration sur Postgres : HT 55833, TVA 6967.
    const totals = computeTotals([
      { quantityMilli: 1000, unitPriceCents: 42000, vatRateBp: 1000 },
      { quantityMilli: 2500, unitPriceCents: 5533, vatRateBp: 2000 },
    ]);

    expect(totals.lineHtCents).toEqual([42000, 13833]);
    expect(totals.htCents).toBe(55833);
    expect(totals.vatGroups).toEqual([
      { rateBp: 2000, htCents: 13833, vatCents: 2767 },
      { rateBp: 1000, htCents: 42000, vatCents: 4200 },
    ]);
    expect(totals.vatCents).toBe(6967);
    expect(totals.ttcCents).toBe(62800);
  });

  it('arrondit au centime le plus proche, moitié vers le haut', () => {
    expect(lineHtCents({ quantityMilli: 1500, unitPriceCents: 333, vatRateBp: 0 })).toBe(500); // 499,5
    expect(lineHtCents({ quantityMilli: 333, unitPriceCents: 100, vatRateBp: 0 })).toBe(33); // 33,3
  });

  it('reste exact sur de très grands montants', () => {
    expect(
      lineHtCents({ quantityMilli: 999_999_000, unitPriceCents: 100_000_000, vatRateBp: 0 }),
    ).toBe(99_999_900_000_000);
  });

  it('vaut 0 sans ligne', () => {
    expect(computeTotals([])).toMatchObject({ htCents: 0, vatCents: 0, ttcCents: 0 });
  });
});
