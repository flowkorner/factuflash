/** @jest-environment node */
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { requestMagicLink } from './requestMagicLink';

jest.mock('@/lib/supabase/server', () => ({ createSupabaseServerClient: jest.fn() }));
jest.mock('@/lib/env', () => ({ getSiteUrl: () => 'https://factuflash.test' }));

const signInWithOtp = jest.fn();
jest.mocked(createSupabaseServerClient).mockResolvedValue({
  auth: { signInWithOtp },
} as unknown as Awaited<ReturnType<typeof createSupabaseServerClient>>);

describe('requestMagicLink', () => {
  beforeEach(() => signInWithOtp.mockReset());

  it('refuse un email invalide sans appeler Supabase', async () => {
    await expect(requestMagicLink('nope')).resolves.toEqual({ ok: false, reason: 'invalid_email' });
    expect(signInWithOtp).not.toHaveBeenCalled();
  });

  it('normalise l’email et indique l’URL du site', async () => {
    signInWithOtp.mockResolvedValue({ error: null });

    await expect(requestMagicLink('  Paul@Plomberie.FR ')).resolves.toEqual({ ok: true });
    expect(signInWithOtp).toHaveBeenCalledWith({
      email: 'paul@plomberie.fr',
      options: { emailRedirectTo: 'https://factuflash.test', shouldCreateUser: true },
    });
  });

  it('traduit la limite d’envoi de Supabase', async () => {
    signInWithOtp.mockResolvedValue({ error: { status: 429, code: 'over_email_send_rate_limit' } });

    await expect(requestMagicLink('paul@plomberie.fr')).resolves.toEqual({
      ok: false,
      reason: 'rate_limited',
    });
  });
});
