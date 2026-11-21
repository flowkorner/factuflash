/** @jest-environment node */
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { RAW_FINAL_INVOICE } from '@/test/invoiceFixtures';
import { hashPublicToken } from '@/features/quotes/document/publicToken';
import { sendInvoiceEmail } from '../email/sendInvoiceEmail';
import { createFinalInvoice, markInvoicePaid } from './invoiceActions';

jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }));
jest.mock('@/lib/supabase/server', () => ({ createSupabaseServerClient: jest.fn() }));
jest.mock('../email/sendInvoiceEmail', () => ({ sendInvoiceEmail: jest.fn() }));

const rpc = jest.fn();
jest.mocked(createSupabaseServerClient).mockResolvedValue({
  rpc,
  auth: { getUser: () => Promise.resolve({ data: { user: { email: 'artisan@exemple.fr' } } }) },
} as unknown as Awaited<ReturnType<typeof createSupabaseServerClient>>);
const mockedEmail = jest.mocked(sendInvoiceEmail);

const INPUT = {
  quoteId: 'q1',
  serviceDate: '2026-11-24',
  dueDays: 30,
  email: ' Martin@Example.fr ',
};

describe('createFinalInvoice', () => {
  beforeEach(() => {
    rpc.mockReset();
    mockedEmail.mockReset();
    rpc.mockImplementation((name: string) =>
      Promise.resolve(
        name === 'create_final_invoice'
          ? {
              data: {
                id: 'i1',
                number: 'F-2026-002',
                dueDate: '2026-12-25',
                snapshot: RAW_FINAL_INVOICE,
              },
              error: null,
            }
          : { data: null, error: null },
      ),
    );
    mockedEmail.mockResolvedValue(true);
  });

  it('émet la facture (empreinte du jeton en base), l’envoie et la note comme envoyée', async () => {
    await expect(createFinalInvoice(INPUT)).resolves.toEqual({
      ok: true,
      number: 'F-2026-002',
      emailSent: true,
    });

    const args = rpc.mock.calls[0]?.[1] as {
      p_token_hash: string;
      p_email: string;
      p_due_days: number;
    };
    expect(rpc.mock.calls[0]?.[0]).toBe('create_final_invoice');
    expect(args).toMatchObject({
      p_quote_id: 'q1',
      p_service_date: '2026-11-24',
      p_due_days: 30,
      p_email: 'martin@example.fr',
    });
    const emailCall = mockedEmail.mock.calls[0]?.[0];
    expect(emailCall?.to).toBe('martin@example.fr');
    expect(args.p_token_hash).toBe(hashPublicToken(emailCall?.token ?? ''));
    expect(emailCall?.replyTo).toBe('artisan@exemple.fr');
    expect(rpc).toHaveBeenCalledWith('mark_invoice_sent', { p_invoice_id: 'i1' });
  });

  it('ne note pas la facture comme envoyée si l’email ne part pas', async () => {
    mockedEmail.mockResolvedValue(false);
    await expect(createFinalInvoice(INPUT)).resolves.toMatchObject({ ok: true, emailSent: false });
    expect(rpc).not.toHaveBeenCalledWith('mark_invoice_sent', expect.anything());
  });

  it('valide avant d’appeler la base', async () => {
    await expect(createFinalInvoice({ ...INPUT, email: 'x' })).resolves.toMatchObject({
      field: 'email',
    });
    await expect(createFinalInvoice({ ...INPUT, dueDays: 90 })).resolves.toMatchObject({
      ok: false,
    });
    await expect(createFinalInvoice({ ...INPUT, serviceDate: 'hier' })).resolves.toMatchObject({
      field: 'serviceDate',
    });
    expect(rpc).not.toHaveBeenCalled();
  });

  it('explique un refus de la base', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'already_invoiced' } });
    await expect(createFinalInvoice(INPUT)).resolves.toEqual({
      ok: false,
      message: 'Ce devis a déjà sa facture de solde.',
    });
    expect(mockedEmail).not.toHaveBeenCalled();
  });
});

describe('markInvoicePaid', () => {
  beforeEach(() => rpc.mockReset());

  it('enregistre le solde reçu', async () => {
    rpc.mockResolvedValue({ data: null, error: null });
    await expect(
      markInvoicePaid({ invoiceId: 'i1', paidOn: '2026-12-02', method: 'transfer' }),
    ).resolves.toMatchObject({ ok: true });
    expect(rpc).toHaveBeenCalledWith('mark_final_invoice_paid', {
      p_invoice_id: 'i1',
      p_paid_on: '2026-12-02',
      p_method: 'transfer',
    });
  });

  it('refuse un moyen de paiement inconnu ou réservé au paiement en ligne', async () => {
    await expect(
      markInvoicePaid({ invoiceId: 'i1', paidOn: '2026-12-02', method: 'card_online' }),
    ).resolves.toMatchObject({ ok: false });
    expect(rpc).not.toHaveBeenCalled();
  });
});
