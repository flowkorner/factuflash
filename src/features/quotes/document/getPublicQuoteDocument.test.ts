/** @jest-environment node */
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { RAW_SNAPSHOT } from '@/test/quoteFixtures';
import { getPublicQuoteDocument } from './quoteDocuments';

jest.mock('@/lib/supabase/server', () => ({ createSupabaseServerClient: jest.fn() }));
const rpc = jest.fn();
jest.mocked(createSupabaseServerClient).mockResolvedValue({
  rpc,
  storage: { from: () => ({ getPublicUrl: () => ({ data: { publicUrl: '' } }) }) },
} as unknown as Awaited<ReturnType<typeof createSupabaseServerClient>>);
const TOKEN = 'a'.repeat(43);

describe('getPublicQuoteDocument', () => {
  beforeEach(() => rpc.mockReset());

  it('base injoignable (code vide) : « indisponible », sans lever d’exception', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    rpc.mockResolvedValue({ data: null, error: { code: '', message: 'TypeError: fetch failed' } });
    await expect(getPublicQuoteDocument(TOKEN)).resolves.toEqual({ kind: 'unavailable' });
  });

  it('lien inconnu : « introuvable »', async () => {
    rpc.mockResolvedValue({ data: null, error: null });
    await expect(getPublicQuoteDocument(TOKEN)).resolves.toEqual({ kind: 'not_found' });
    await expect(getPublicQuoteDocument('x')).resolves.toEqual({ kind: 'not_found' });
  });

  it('devis trouvé', async () => {
    rpc.mockResolvedValue({
      data: {
        status: 'accepted',
        issueDate: '2026-11-20',
        validUntil: '2026-12-20',
        sentAt: null,
        acceptedAt: '2026-11-21T10:00:00Z',
        acceptedByName: 'Jean Martin',
        depositPercent: 30,
        depositCents: 18840,
        depositPaidAt: null,
        depositPaidCents: 0,
        snapshot: RAW_SNAPSHOT,
      },
      error: null,
    });
    await expect(getPublicQuoteDocument(TOKEN)).resolves.toMatchObject({
      kind: 'found',
      quote: { status: 'accepted' },
    });
  });
});
