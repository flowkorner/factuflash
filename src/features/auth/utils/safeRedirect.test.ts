import { getSafeRedirectPath } from './safeRedirect';

describe('getSafeRedirectPath', () => {
  it.each([
    ['/devis', '/devis'],
    ['/entreprise?x=1', '/entreprise?x=1'],
    [null, '/devis'],
    ['https://pirate.example', '/devis'],
    ['//pirate.example', '/devis'],
    ['/\\pirate.example', '/devis'],
  ])('%s → %s', (input, expected) => {
    expect(getSafeRedirectPath(input, '/devis')).toBe(expected);
  });
});
