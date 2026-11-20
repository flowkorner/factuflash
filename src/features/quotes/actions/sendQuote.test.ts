/** @jest-environment node */
import { getCurrentCompany } from '@/features/company/data/getCurrentCompany';
import { sendEmail } from '@/lib/email/resend';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { RAW_SNAPSHOT } from '@/test/quoteFixtures';
import { hashPublicToken } from '../document/publicToken';
import { sendQuote } from './sendQuote';

jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }));
jest.mock('@/lib/env', () => ({ getSiteUrl: () => 'https://factuflash.test' }));
jest.mock('@/lib/email/resend', () => ({ sendEmail: jest.fn() }));
jest.mock('@/lib/supabase/server', () => ({ createSupabaseServerClient: jest.fn() }));
jest.mock('@/features/company/data/getCurrentCompany', () => ({ getCurrentCompany: jest.fn() }));

const rpc = jest.fn();
const maybeSingle = jest.fn();
jest.mocked(createSupabaseServerClient).mockResolvedValue({
  rpc,
  from: () => ({ select: () => ({ eq: () => ({ maybeSingle }) }) }),
  auth: { getUser: () => Promise.resolve({ data: { user: { email: 'artisan@exemple.fr' } } }) },
} as unknown as Awaited<ReturnType<typeof createSupabaseServerClient>>);
const mockedEmail = jest.mocked(sendEmail);

describe('sendQuote', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    jest.mocked(getCurrentCompany).mockResolvedValue({
      name: 'Plomberie Durand',
      siret: '81234567800013',
      address: '12 rue des Lilas, 69003 Lyon',
      phone: '0612345678',
      vatMode: 'subject',
      logoUrl: null,
    });
    maybeSingle.mockResolvedValue({ data: { validity_days: 30 } });
    rpc.mockResolvedValue({
      data: { number: 'D-2026-001', validUntil: '2026-12-20', snapshot: RAW_SNAPSHOT },
      error: null,
    });
    mockedEmail.mockResolvedValue({ ok: true, id: 'em_1' });
  });

  it('stocke l’empreinte du jeton et met le vrai lien dans l’email', async () => {
    await expect(sendQuote({ quoteId: 'q1', email: ' Martin@Example.FR ' })).resolves.toEqual({
      ok: true,
      sentTo: 'martin@example.fr',
    });

    const args = rpc.mock.calls[0]?.[1] as {
      p_token_hash: string;
      p_recipient_email: string;
      p_mentions: string[];
    };
    expect(rpc.mock.calls[0]?.[0]).toBe('send_quote');
    expect(args.p_recipient_email).toBe('martin@example.fr');
    expect(args.p_mentions).toContain('Devis gratuit.');

    const email = mockedEmail.mock.calls[0]?.[0];
    const token = /\/d\/([A-Za-z0-9_-]{43})/.exec(email?.text ?? '')?.[1] ?? '';
    expect(token).toHaveLength(43);
    expect(args.p_token_hash).toBe(hashPublicToken(token));
    expect(JSON.stringify(rpc.mock.calls)).not.toContain(token);
    expect(email).toMatchObject({
      to: 'martin@example.fr',
      subject: 'Devis D-2026-001 de Plomberie Durand',
      replyTo: 'artisan@exemple.fr',
      fromName: 'Plomberie Durand via FactuFlash',
    });
  });

  it('refuse un email invalide sans rien verrouiller', async () => {
    await expect(sendQuote({ quoteId: 'q1', email: 'pas-un-email' })).resolves.toMatchObject({
      ok: false,
      field: 'email',
    });
    expect(rpc).not.toHaveBeenCalled();
  });

  it('prévient que le devis est verrouillé si l’email ne part pas', async () => {
    mockedEmail.mockResolvedValue({ ok: false, reason: 'resend_403' });

    await expect(sendQuote({ quoteId: 'q1', email: 'martin@example.fr' })).resolves.toMatchObject({
      ok: false,
      sentButEmailFailed: true,
    });
  });

  it('traduit un refus de la base (devis déjà accepté)', async () => {
    rpc.mockResolvedValue({ data: null, error: { code: 'P0001', message: 'quote_not_sendable' } });

    await expect(sendQuote({ quoteId: 'q1', email: 'martin@example.fr' })).resolves.toEqual({
      ok: false,
      message: 'Ce devis a déjà été accepté : il ne peut plus être renvoyé.',
    });
    expect(mockedEmail).not.toHaveBeenCalled();
  });
});
