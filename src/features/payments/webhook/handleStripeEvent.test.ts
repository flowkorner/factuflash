/** @jest-environment node */
import type Stripe from 'stripe';
import { handleStripeEvent } from './handleStripeEvent';

function sessionEvent(type: string, session: Partial<Stripe.Checkout.Session> = {}): Stripe.Event {
  return {
    id: 'evt_1',
    type,
    data: {
      object: {
        id: 'cs_test_1',
        object: 'checkout.session',
        payment_status: 'paid',
        amount_total: 18840,
        currency: 'eur',
        payment_intent: 'pi_1',
        metadata: { kind: 'deposit', quote_id: 'q1', quote_number: 'D-2026-001' },
        ...session,
      },
    },
  } as unknown as Stripe.Event;
}

describe('handleStripeEvent', () => {
  const record = jest.fn();
  beforeEach(() => {
    record.mockReset();
    record.mockResolvedValue('recorded');
  });

  it.each(['checkout.session.completed', 'checkout.session.async_payment_succeeded'])(
    'enregistre l’acompte payé (%s)',
    async (type) => {
      await expect(handleStripeEvent(sessionEvent(type), record)).resolves.toMatchObject({
        status: 'ok',
      });
      expect(record).toHaveBeenCalledWith({
        quoteId: 'q1',
        sessionId: 'cs_test_1',
        paymentIntentId: 'pi_1',
        amountCents: 18840,
        currency: 'eur',
      });
    },
  );

  it('n’enregistre rien tant que l’argent n’est pas arrivé (paiement différé)', async () => {
    await handleStripeEvent(
      sessionEvent('checkout.session.completed', { payment_status: 'unpaid' }),
      record,
    );
    expect(record).not.toHaveBeenCalled();
  });

  it('ignore les autres événements et les sessions qui ne sont pas des acomptes', async () => {
    await handleStripeEvent(sessionEvent('payment_intent.created'), record);
    await expect(
      handleStripeEvent(sessionEvent('checkout.session.completed', { metadata: {} }), record),
    ).resolves.toMatchObject({ status: 'ignored' });
    expect(record).not.toHaveBeenCalled();
  });

  it('rejeu : un paiement déjà enregistré est un succès', async () => {
    record.mockResolvedValue('already_recorded');
    await expect(
      handleStripeEvent(sessionEvent('checkout.session.completed'), record),
    ).resolves.toEqual({
      status: 'ok',
      detail: 'already_recorded (cs_test_1)',
    });
  });

  it('erreur définitive (montant faux) : 200 pour que Stripe n’insiste pas', async () => {
    record.mockRejectedValue(new Error('amount_mismatch'));
    await expect(
      handleStripeEvent(sessionEvent('checkout.session.completed'), record),
    ).resolves.toMatchObject({
      status: 'ignored',
    });
  });

  it('erreur passagère (base injoignable) : Stripe doit réessayer', async () => {
    record.mockRejectedValue(new Error('fetch failed'));
    await expect(
      handleStripeEvent(sessionEvent('checkout.session.completed'), record),
    ).resolves.toMatchObject({
      status: 'retry',
    });
  });
});
