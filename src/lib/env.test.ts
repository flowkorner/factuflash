/** @jest-environment node */
import { getStripeEnv } from './env';

describe('getStripeEnv', () => {
  beforeEach(() => {
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_x';
  });

  it('accepte une clé de test (secrète ou restreinte)', () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_123';
    expect(getStripeEnv().secretKey).toBe('sk_test_123');
    process.env.STRIPE_SECRET_KEY = 'rk_test_123';
    expect(getStripeEnv().secretKey).toBe('rk_test_123');
  });

  it('refuse une clé live (ticket en mode test uniquement)', () => {
    process.env.STRIPE_SECRET_KEY = 'sk_live_123';
    expect(() => getStripeEnv()).toThrow(/clé de TEST/);
  });
});
