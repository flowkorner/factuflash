import Stripe from 'stripe';
import { getStripeEnv } from '@/lib/env';

/** Version d'API figée : un changement de version se fait volontairement, avec tests. */
export const STRIPE_API_VERSION = '2026-11-18.endive';

/** Client Stripe côté serveur (une instance, jamais de clé globale). */
export function createStripeClient(): Stripe {
  return new Stripe(getStripeEnv().secretKey, {
    apiVersion: STRIPE_API_VERSION,
    appInfo: { name: 'FactuFlash' },
    // Le client attend devant l'écran : pas question de patienter 80 s (défaut du SDK).
    timeout: 15_000,
    maxNetworkRetries: 1,
  });
}
