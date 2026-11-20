/** @jest-environment node */
import { getCurrentCompany } from '@/features/company/data/getCurrentCompany';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { newQuoteValues } from '../domain/newQuote';
import type { QuoteFormValues } from '../domain/types';
import { NEW_CLIENT } from '../domain/types';
import { saveQuoteDraft } from './saveQuoteDraft';

jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }));
jest.mock('@/lib/supabase/server', () => ({ createSupabaseServerClient: jest.fn() }));
jest.mock('@/features/company/data/getCurrentCompany', () => ({ getCurrentCompany: jest.fn() }));

const rpc = jest.fn();
jest
  .mocked(createSupabaseServerClient)
  .mockResolvedValue({ rpc } as unknown as Awaited<ReturnType<typeof createSupabaseServerClient>>);
const mockedCompany = jest.mocked(getCurrentCompany);

function validValues(): QuoteFormValues {
  const base = newQuoteValues([], 'subject');
  return {
    ...base,
    clientId: NEW_CLIENT,
    newClientName: 'M. Martin',
    title: 'Remplacement chauffe-eau',
    siteAddress: '3 rue des Lilas, 69003 Lyon',
    lines: [
      { ...base.lines[0]!, designation: 'Pose', quantity: '2,5', unit: 'h', unitPrice: '55,33' },
    ],
  };
}

describe('saveQuoteDraft', () => {
  beforeEach(() => {
    rpc.mockReset();
    mockedCompany.mockResolvedValue({
      name: 'Élec B',
      siret: '81234567800013',
      address: '2 rue B, 75000 Paris',
      phone: '0612345678',
      vatMode: 'franchise',
      logoUrl: null,
    });
  });

  it('envoie à la fonction SQL des montants en centimes et une TVA à 0 en franchise', async () => {
    rpc.mockResolvedValue({ data: 'q1', error: null });

    await expect(saveQuoteDraft({ quoteId: null, values: validValues() })).resolves.toEqual({
      ok: true,
      id: 'q1',
    });
    expect(rpc).toHaveBeenCalledWith('save_quote_draft', {
      p_quote_id: null,
      p_client_id: null,
      p_new_client: { name: 'M. Martin', email: '', address: '3 rue des Lilas, 69003 Lyon' },
      p_title: 'Remplacement chauffe-eau',
      p_site_address: '3 rue des Lilas, 69003 Lyon',
      p_description: '',
      p_validity_days: 30,
      p_lines: [
        {
          designation: 'Pose',
          quantity: '2.5',
          unit: 'h',
          unit_price_cents: 5533,
          vat_rate_bp: 0,
          source: 'manual',
          price_item_id: null,
        },
      ],
    });
  });

  it('revalide côté serveur et n’appelle pas la base si la saisie est invalide', async () => {
    const values = { ...validValues(), title: '' };

    const result = await saveQuoteDraft({ quoteId: null, values });

    expect(result).toMatchObject({ ok: false, errors: { title: expect.any(String) } });
    expect(rpc).not.toHaveBeenCalled();
  });

  it('exige « Mon entreprise »', async () => {
    mockedCompany.mockResolvedValue(null);

    await expect(saveQuoteDraft({ quoteId: null, values: validValues() })).resolves.toMatchObject({
      ok: false,
      message: 'Complétez d’abord « Mon entreprise ».',
    });
  });

  it('traduit les erreurs de la fonction SQL', async () => {
    rpc.mockResolvedValue({ data: null, error: { code: 'P0001', message: 'quote_not_editable' } });

    await expect(saveQuoteDraft({ quoteId: 'q1', values: validValues() })).resolves.toMatchObject({
      ok: false,
      message: 'Ce devis n’est plus modifiable.',
    });
  });
});
