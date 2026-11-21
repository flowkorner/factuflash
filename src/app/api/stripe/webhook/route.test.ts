/** @jest-environment node */
import Stripe from 'stripe';
import type { NextRequest } from 'next/server';
import { recordDepositPayment } from '@/features/payments/webhook/recordDepositPayment';
import { POST } from './route';

jest.mock('@/features/payments/webhook/recordDepositPayment', () => ({
  recordDepositPayment: jest.fn(),
}));

const WEBHOOK_SECRET = 'whsec_test_secret';
const stripe = new Stripe('sk_test_factice');
const mockedRecord = jest.mocked(recordDepositPayment);

const PAYLOAD = JSON.stringify({
  id: 'evt_1',
  object: 'event',
  type: 'checkout.session.completed',
  data: {
    object: {
      id: 'cs_test_1',
      object: 'checkout.session',
      payment_status: 'paid',
      amount_total: 18840,
      currency: 'eur',
      payment_intent: 'pi_1',
      metadata: { kind: 'deposit', quote_id: 'q1' },
    },
  },
});

function request(body: string, signature: string | null): NextRequest {
  const headers = new Headers(signature ? { 'stripe-signature': signature } : {});
  return new Request('http://localhost/api/stripe/webhook', {
    method: 'POST',
    body,
    headers,
  }) as unknown as NextRequest;
}

describe('POST /api/stripe/webhook', () => {
  beforeAll(() => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_factice';
    process.env.STRIPE_WEBHOOK_SECRET = WEBHOOK_SECRET;
  });
  beforeEach(() => {
    mockedRecord.mockReset();
    mockedRecord.mockResolvedValue('recorded');
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  it('accepte un événement correctement signé et enregistre le paiement', async () => {
    const signature = stripe.webhooks.generateTestHeaderString({
      payload: PAYLOAD,
      secret: WEBHOOK_SECRET,
    });

    const response = await POST(request(PAYLOAD, signature));

    expect(response.status).toBe(200);
    expect(mockedRecord).toHaveBeenCalledWith(
      expect.objectContaining({ quoteId: 'q1', amountCents: 18840 }),
    );
  });

  it('refuse sans signature', async () => {
    expect((await POST(request(PAYLOAD, null))).status).toBe(400);
    expect(mockedRecord).not.toHaveBeenCalled();
  });

  it('refuse une signature faite avec un autre secret', async () => {
    const forged = stripe.webhooks.generateTestHeaderString({
      payload: PAYLOAD,
      secret: 'whsec_pirate',
    });
    expect((await POST(request(PAYLOAD, forged))).status).toBe(400);
    expect(mockedRecord).not.toHaveBeenCalled();
  });

  it('refuse un corps modifié après signature (montant changé)', async () => {
    const signature = stripe.webhooks.generateTestHeaderString({
      payload: PAYLOAD,
      secret: WEBHOOK_SECRET,
    });
    const tampered = PAYLOAD.replace('18840', '1');
    expect((await POST(request(tampered, signature))).status).toBe(400);
    expect(mockedRecord).not.toHaveBeenCalled();
  });

  it('répond 500 sur une erreur passagère pour que Stripe réessaie', async () => {
    mockedRecord.mockRejectedValue(new Error('fetch failed'));
    const signature = stripe.webhooks.generateTestHeaderString({
      payload: PAYLOAD,
      secret: WEBHOOK_SECRET,
    });
    expect((await POST(request(PAYLOAD, signature))).status).toBe(500);
  });
});
