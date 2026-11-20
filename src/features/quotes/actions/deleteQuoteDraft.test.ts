/** @jest-environment node */
import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { deleteQuoteDraft } from './deleteQuoteDraft';

jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }));
jest.mock('@/lib/supabase/server', () => ({ createSupabaseServerClient: jest.fn() }));

const ID = '6f1c2c1e-9d7a-4c8e-8a51-3f2d9c0b7a11';
const filters: [string, string][] = [];
const result = { count: 1 as number | null, error: null as { code: string } | null };
const query = {
  eq: (column: string, value: string) => {
    filters.push([column, value]);
    return filters.length === 2 ? Promise.resolve(result) : query;
  },
};
const del = jest.fn(() => query);
jest
  .mocked(createSupabaseServerClient)
  .mockResolvedValue({ from: () => ({ delete: del }) } as unknown as Awaited<
    ReturnType<typeof createSupabaseServerClient>
  >);

describe('deleteQuoteDraft', () => {
  beforeEach(() => {
    filters.length = 0;
    result.count = 1;
    result.error = null;
    jest.clearAllMocks();
  });

  it('ne supprime qu’un brouillon, par son id, puis rafraîchit Mes devis', async () => {
    await expect(deleteQuoteDraft(ID)).resolves.toEqual({ ok: true });

    expect(del).toHaveBeenCalledWith({ count: 'exact' });
    expect(filters).toEqual([
      ['id', ID],
      ['status', 'draft'],
    ]);
    expect(revalidatePath).toHaveBeenCalledWith('/devis');
  });

  it('refuse un identifiant mal formé sans appeler la base', async () => {
    await expect(deleteQuoteDraft('1 or 1=1')).resolves.toEqual({
      ok: false,
      message: 'Devis introuvable.',
    });
    expect(del).not.toHaveBeenCalled();
  });

  it('prévient si rien n’a été supprimé (déjà supprimé, envoyé, ou pas à vous)', async () => {
    result.count = 0;

    await expect(deleteQuoteDraft(ID)).resolves.toEqual({
      ok: false,
      message: 'Ce devis n’existe plus ou n’est plus un brouillon.',
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
