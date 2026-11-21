/** @jest-environment node */
import { createSupabaseAnonClient } from '@/lib/supabase/anon';
import { RAW_DEPOSIT_INVOICE } from '@/test/invoiceFixtures';
import { hashPublicToken } from '@/features/quotes/document/publicToken';
import { sendInvoiceEmail } from '@/features/invoices/email/sendInvoiceEmail';
import { recordDepositPayment } from './recordDepositPayment';

jest.mock('@/lib/env', () => ({ getPaymentsDbSecret: () => 'secret-serveur' }));
jest.mock('@/lib/supabase/anon', () => ({ createSupabaseAnonClient: jest.fn() }));
jest.mock('@/features/invoices/email/sendInvoiceEmail', () => ({ sendInvoiceEmail: jest.fn() }));

const rpc = jest.fn();
jest
  .mocked(createSupabaseAnonClient)
  .mockReturnValue({ rpc } as unknown as ReturnType<typeof createSupabaseAnonClient>);
const mockedEmail = jest.mocked(sendInvoiceEmail);
const PAYMENT = {
  quoteId: 'q1',
  sessionId: 'cs_test_1',
  paymentIntentId: 'pi_1',
  amountCents: 18840,
  currency: 'eur',
};

describe('recordDepositPayment', () => {
  beforeEach(() => {
    rpc.mockReset();
    mockedEmail.mockReset();
    mockedEmail.mockResolvedValue(true);
  });

  it('enregistre le paiement, puis envoie la facture d’acompte créée avec lui', async () => {
    rpc.mockImplementation((name: string) =>
      Promise.resolve(
        name === 'record_deposit_payment'
          ? {
              data: {
                result: 'recorded',
                invoice: {
                  id: 'i1',
                  number: 'F-2026-001',
                  sentToEmail: 'martin@example.fr',
                  dueDate: '2026-11-21',
                  snapshot: RAW_DEPOSIT_INVOICE,
                },
              },
              error: null,
            }
          : { data: null, error: null },
      ),
    );

    await expect(recordDepositPayment(PAYMENT)).resolves.toBe('recorded');

    const args = rpc.mock.calls[0]?.[1] as { p_secret: string; p_invoice_token_hash: string };
    expect(args.p_secret).toBe('secret-serveur');
    const email = mockedEmail.mock.calls[0]?.[0];
    expect(email?.to).toBe('martin@example.fr');
    expect(args.p_invoice_token_hash).toBe(hashPublicToken(email?.token ?? ''));
    expect(rpc).toHaveBeenCalledWith('record_invoice_email_sent', {
      p_secret: 'secret-serveur',
      p_invoice_id: 'i1',
    });
  });

  it('rejeu : aucun nouvel email', async () => {
    rpc.mockResolvedValue({ data: { result: 'already_recorded', invoice: null }, error: null });
    await expect(recordDepositPayment(PAYMENT)).resolves.toBe('already_recorded');
    expect(mockedEmail).not.toHaveBeenCalled();
  });

  it('remonte l’erreur de la base pour que le webhook décide (réessayer ou non)', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'amount_mismatch' } });
    await expect(recordDepositPayment(PAYMENT)).rejects.toThrow('amount_mismatch');
  });
});
