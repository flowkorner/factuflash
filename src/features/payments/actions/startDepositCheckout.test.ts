/** @jest-environment node */
import { createStripeClient } from '@/lib/stripe/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { startDepositCheckout } from './startDepositCheckout';

jest.mock('@/lib/env', () => ({ getSiteUrl: () => 'https://factuflash.test' }));
jest.mock('@/lib/stripe/server', () => ({ createStripeClient: jest.fn() }));
jest.mock('@/lib/supabase/server', () => ({ createSupabaseServerClient: jest.fn() }));

const TOKEN = 'a'.repeat(43);
const rpc = jest.fn();
const createSession = jest.fn();
jest
  .mocked(createSupabaseServerClient)
  .mockResolvedValue({ rpc } as unknown as Awaited<ReturnType<typeof createSupabaseServerClient>>);
jest
  .mocked(createStripeClient)
  .mockReturnValue({ checkout: { sessions: { create: createSession } } } as unknown as ReturnType<
    typeof createStripeClient
  >);

describe('startDepositCheckout', () => {
  beforeEach(() => {
    rpc.mockReset();
    createSession.mockReset();
    rpc.mockResolvedValue({
      data: {
        quoteId: 'q1',
        number: 'D-2026-001',
        companyName: 'Plomberie Durand',
        clientEmail: 'martin@example.fr',
        depositPercent: 30,
        depositCents: 18840,
      },
      error: null,
    });
    createSession.mockResolvedValue({ client_secret: 'cs_test_1_secret_x' });
  });

  it('crée une session au montant lu en base, intégrée à la page, sans liste de moyens de paiement en dur', async () => {
    await expect(startDepositCheckout(TOKEN)).resolves.toEqual({
      ok: true,
      clientSecret: 'cs_test_1_secret_x',
    });

    expect(rpc).toHaveBeenCalledWith('prepare_deposit_checkout', { p_token: TOKEN });
    const params = createSession.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(params).toMatchObject({
      ui_mode: 'elements',
      mode: 'payment',
      customer_email: 'martin@example.fr',
      line_items: [{ quantity: 1, price_data: { currency: 'eur', unit_amount: 18840 } }],
      metadata: { quote_id: 'q1', kind: 'deposit' },
      return_url: `https://factuflash.test/d/${TOKEN}?paiement={CHECKOUT_SESSION_ID}`,
    });
    expect(params).not.toHaveProperty('payment_method_types');
    expect(String(params.integration_identifier)).toMatch(/^factuflash-acompte-[a-z]{8}$/);
  });

  it('refuse avant l’acceptation ou si l’acompte est déjà payé, sans appeler Stripe', async () => {
    rpc.mockResolvedValueOnce({ data: null, error: { message: 'not_accepted' } });
    await expect(startDepositCheckout(TOKEN)).resolves.toEqual({
      ok: false,
      message: 'Acceptez d’abord le devis pour pouvoir payer l’acompte.',
    });
    rpc.mockResolvedValueOnce({ data: null, error: { message: 'already_paid' } });
    await expect(startDepositCheckout(TOKEN)).resolves.toMatchObject({ ok: false });
    expect(createSession).not.toHaveBeenCalled();
  });

  it('refuse un lien mal formé sans interroger la base', async () => {
    await expect(startDepositCheckout('x')).resolves.toMatchObject({ ok: false });
    expect(rpc).not.toHaveBeenCalled();
  });

  it('reste poli si Stripe ne répond pas', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    createSession.mockRejectedValue(new Error('api down'));
    await expect(startDepositCheckout(TOKEN)).resolves.toEqual({
      ok: false,
      message: 'Le paiement n’a pas pu démarrer. Réessayez dans un instant.',
    });
  });
});
