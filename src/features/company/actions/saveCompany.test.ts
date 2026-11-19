/** @jest-environment node */
import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { saveCompany } from './saveCompany';

jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }));
jest.mock('@/lib/supabase/server', () => ({ createSupabaseServerClient: jest.fn() }));

const getUser = jest.fn();
const maybeSingle = jest.fn();
const upsert = jest.fn();
const upload = jest.fn();
const remove = jest.fn();

const fakeClient = {
  auth: { getUser },
  from: () => ({ select: () => ({ eq: () => ({ maybeSingle }) }), upsert }),
  storage: { from: () => ({ upload, remove }) },
};
jest
  .mocked(createSupabaseServerClient)
  .mockResolvedValue(
    fakeClient as unknown as Awaited<ReturnType<typeof createSupabaseServerClient>>,
  );

function validForm(): FormData {
  const formData = new FormData();
  formData.set('name', ' Plomberie Durand ');
  formData.set('siret', '812 345 678 00013');
  formData.set('address', '12 rue des Lilas, 69003 Lyon');
  formData.set('phone', '06 12 34 56 78');
  formData.set('vatMode', 'franchise');
  formData.set('removeLogo', 'false');
  return formData;
}

describe('saveCompany', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    maybeSingle.mockResolvedValue({ data: null });
    upsert.mockResolvedValue({ error: null });
    upload.mockResolvedValue({ error: null });
    remove.mockResolvedValue({ error: null });
  });

  it('revérifie les données côté serveur', async () => {
    const formData = validForm();
    formData.set('siret', '81234567800014');

    const result = await saveCompany(formData);

    expect(result).toEqual({ ok: false, errors: { siret: expect.stringContaining('SIRET') } });
    expect(upsert).not.toHaveBeenCalled();
  });

  it('refuse une session expirée', async () => {
    getUser.mockResolvedValue({ data: { user: null } });

    const result = await saveCompany(validForm());

    expect(result).toEqual({ ok: false, errors: {}, message: expect.stringContaining('session') });
  });

  it('enregistre les données normalisées pour l’artisan connecté', async () => {
    await expect(saveCompany(validForm())).resolves.toEqual({ ok: true });

    expect(upsert).toHaveBeenCalledWith(
      {
        user_id: 'user-1',
        name: 'Plomberie Durand',
        siret: '81234567800013',
        address: '12 rue des Lilas, 69003 Lyon',
        phone: '0612345678',
        vat_mode: 'franchise',
        logo_path: null,
      },
      { onConflict: 'user_id' },
    );
    expect(revalidatePath).toHaveBeenCalledWith('/devis');
  });

  it('range le logo dans le dossier de l’artisan et supprime l’ancien', async () => {
    maybeSingle.mockResolvedValue({ data: { logo_path: 'user-1/logo-ancien.png' } });
    const formData = validForm();
    formData.set('logo', new File(['png'], 'logo.png', { type: 'image/png' }));

    await saveCompany(formData);

    const uploadedPath: unknown = upload.mock.calls[0]?.[0];
    expect(uploadedPath).toMatch(/^user-1\/logo-\d+\.png$/);
    expect(upsert.mock.calls[0]?.[0]).toMatchObject({ logo_path: uploadedPath });
    expect(remove).toHaveBeenCalledWith(['user-1/logo-ancien.png']);
  });
});
