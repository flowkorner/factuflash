import type { NextRequest } from 'next/server';
import { getStripeEnv } from '@/lib/env';
import { createStripeClient } from '@/lib/stripe/server';
import { handleStripeEvent } from '@/features/payments/webhook/handleStripeEvent';
import { recordDepositPayment } from '@/features/payments/webhook/recordDepositPayment';

/**
 * Webhook Stripe : POST /api/stripe/webhook
 * La signature est vérifiée sur le corps BRUT avant toute lecture de l'événement.
 */
export async function POST(request: NextRequest) {
  const signature = request.headers.get('stripe-signature');
  if (!signature) return new Response('Signature manquante', { status: 400 });

  const payload = await request.text();
  const stripe = createStripeClient();
  const event = await stripe.webhooks
    .constructEventAsync(payload, signature, getStripeEnv().webhookSecret)
    .catch(() => null);
  if (!event) return new Response('Signature invalide', { status: 400 });

  const outcome = await handleStripeEvent(event, recordDepositPayment);
  if (outcome.status !== 'ok') console.warn('[webhook stripe]', outcome.status, outcome.detail);
  return Response.json({ received: true }, { status: outcome.status === 'retry' ? 500 : 200 });
}
