import { RAW_SNAPSHOT, SNAPSHOT, sampleView } from '@/test/quoteFixtures';
import { createPublicToken, hashPublicToken, isPublicTokenShape } from './publicToken';
import { addDays, formatDateTime } from './documentView';
import { parsePublicQuote, parseQuoteSnapshot } from './snapshot';

describe('parseQuoteSnapshot', () => {
  it('lit le JSON de la base (quantité en nombre → millièmes)', () => {
    expect(parseQuoteSnapshot(RAW_SNAPSHOT)).toEqual(SNAPSHOT);
  });

  it('refuse une forme inattendue au lieu de l’afficher de travers', () => {
    expect(parseQuoteSnapshot(null)).toBeNull();
    expect(parseQuoteSnapshot({ ...RAW_SNAPSHOT, totals: { htCents: '12' } })).toBeNull();
    expect(parseQuoteSnapshot({ ...RAW_SNAPSHOT, lines: [{ designation: 'x' }] })).toBeNull();
    expect(parseQuoteSnapshot({ ...RAW_SNAPSHOT, vatMode: 'autre' })).toBeNull();
  });

  it('accepte un brouillon sans mentions', () => {
    expect(parseQuoteSnapshot({ ...RAW_SNAPSHOT, mentions: undefined })?.mentions).toBeNull();
  });
});

describe('parsePublicQuote', () => {
  it('lit la réponse de get_public_quote', () => {
    const quote = parsePublicQuote({
      status: 'accepted',
      issueDate: '2026-11-20',
      validUntil: '2026-12-20',
      sentAt: '2026-11-20T10:00:00+00:00',
      acceptedAt: '2026-11-21T13:32:00+00:00',
      acceptedByName: 'Jean Martin',
      depositPercent: 30,
      depositCents: 18840,
      depositPaidAt: null,
      depositPaidCents: 0,
      snapshot: RAW_SNAPSHOT,
    });
    expect(quote).toMatchObject({ status: 'accepted', acceptedByName: 'Jean Martin' });
    expect(parsePublicQuote(null)).toBeNull();
    expect(quote).toMatchObject({ depositPercent: 30, depositCents: 18840, depositPaidCents: 0 });
  });
});

describe('buildDocumentView', () => {
  it('formate le devis en français avec n° de TVA et totaux par taux', () => {
    const view = sampleView();
    expect(view.company.details).toContain('SIRET 812 345 678 00013');
    expect(view.company.details).toContain('N° TVA FR25812345678');
    expect(view.lines[1]?.detail.replace(/\s/g, ' ')).toBe('2,5 h × 55,33 € HT');
    expect(view.totals.map((row) => row.label)).toEqual(['Total HT', 'TVA 20 %', 'TVA 10 %']);
    expect(view.totalValue.replace(/\s/g, ' ')).toBe('628,00 €');
    expect(view.mentions).toEqual(['Devis gratuit.']);
  });

  it('indique l’acceptation à l’heure de Paris', () => {
    const view = sampleView({
      status: 'accepted',
      acceptedAt: '2026-11-21T13:32:00Z',
      acceptedByName: 'Jean Martin',
    });
    expect(view.acceptance).toEqual({ byName: 'Jean Martin', atLabel: '21 novembre 2026 à 14:32' });
    expect(formatDateTime('2026-07-01T10:00:00Z')).toBe('1 juillet 2026 à 12:00');
  });

  it('ajoute des jours à une date', () => {
    expect(addDays('2026-11-20', 30)).toBe('2026-12-20');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  });
});

describe('jeton du lien client', () => {
  it('est long, aléatoire, et seule son empreinte SHA-256 est stockée', () => {
    const first = createPublicToken();
    const second = createPublicToken();
    expect(first.token).toHaveLength(43);
    expect(isPublicTokenShape(first.token)).toBe(true);
    expect(first.token).not.toBe(second.token);
    expect(first.hash).toMatch(/^[0-9a-f]{64}$/);
    expect(first.hash).toBe(hashPublicToken(first.token));
    expect(first.hash).not.toContain(first.token);
  });

  it('calcule la même empreinte que Postgres (sha256 UTF-8)', () => {
    // encode(sha256(convert_to('abc', 'UTF8')), 'hex')
    expect(hashPublicToken('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
  });

  it('rejette ce qui n’a pas la forme d’un jeton', () => {
    expect(isPublicTokenShape('../../etc/passwd')).toBe(false);
    expect(isPublicTokenShape('court')).toBe(false);
  });
});
