/** @jest-environment node */
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { acceptPublicQuote } from './acceptPublicQuote';

jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }));
jest.mock('@/lib/supabase/server', () => ({ createSupabaseServerClient: jest.fn() }));

const rpc = jest.fn();
jest
  .mocked(createSupabaseServerClient)
  .mockResolvedValue({ rpc } as unknown as Awaited<ReturnType<typeof createSupabaseServerClient>>);
const TOKEN = 'a'.repeat(43);

describe('acceptPublicQuote', () => {
  beforeEach(() => rpc.mockReset());

  it('enregistre l’accord avec le nom nettoyé', async () => {
    rpc.mockResolvedValue({
      data: {
        status: 'accepted',
        acceptedAt: '2026-11-21T13:32:00Z',
        acceptedByName: 'Jean Martin',
      },
      error: null,
    });

    await expect(
      acceptPublicQuote({ token: TOKEN, name: '  Jean   Martin ', agreed: true }),
    ).resolves.toEqual({
      ok: true,
      acceptedAt: '2026-11-21T13:32:00Z',
      acceptedByName: 'Jean Martin',
    });
    expect(rpc).toHaveBeenCalledWith('accept_public_quote', {
      p_token: TOKEN,
      p_name: 'Jean Martin',
    });
  });

  it('exige le nom, la case cochée et un jeton bien formé', async () => {
    await expect(
      acceptPublicQuote({ token: TOKEN, name: 'J', agreed: true }),
    ).resolves.toMatchObject({ field: 'name' });
    await expect(
      acceptPublicQuote({ token: TOKEN, name: 'Jean', agreed: false }),
    ).resolves.toMatchObject({
      field: 'agreed',
    });
    await expect(
      acceptPublicQuote({ token: 'x', name: 'Jean', agreed: true }),
    ).resolves.toMatchObject({ ok: false });
    expect(rpc).not.toHaveBeenCalled();
  });

  it('explique un devis expiré', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'expired' } });

    await expect(acceptPublicQuote({ token: TOKEN, name: 'Jean', agreed: true })).resolves.toEqual({
      ok: false,
      message:
        'Ce devis a dépassé sa date de validité. Contactez l’entreprise pour en recevoir un nouveau.',
    });
  });
});
