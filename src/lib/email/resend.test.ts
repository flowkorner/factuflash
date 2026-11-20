/** @jest-environment node */
import { sendEmail } from './resend';

const fetchMock = jest.fn();
global.fetch = fetchMock;

function lastBody(): Record<string, unknown> {
  const init: unknown = fetchMock.mock.calls.at(-1)?.[1];
  const body = typeof init === 'object' && init !== null && 'body' in init ? init.body : '{}';
  return JSON.parse(String(body)) as Record<string, unknown>;
}

const EMAIL = { to: 'client@exemple.fr', subject: 'Devis', html: '<p>x</p>', text: 'x' };

describe('sendEmail (Resend)', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ id: 'em_1' }), { status: 200 }));
    process.env.RESEND_API_KEY = 're_test';
    delete process.env.EMAIL_TEST_RECIPIENT;
    delete process.env.EMAIL_FROM;
  });

  it('envoie avec la clé côté serveur, le nom de l’entreprise et la réponse à l’artisan', async () => {
    await expect(
      sendEmail({
        ...EMAIL,
        fromName: 'Plomberie "Durand"\r\nBcc: x',
        replyTo: 'artisan@exemple.fr',
      }),
    ).resolves.toEqual({ ok: true, id: 'em_1' });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.resend.com/emails');
    expect(init.headers).toMatchObject({ Authorization: 'Bearer re_test' });
    expect(lastBody()).toMatchObject({
      from: '"Plomberie DurandBcc: x" <onboarding@resend.dev>',
      to: ['client@exemple.fr'],
      reply_to: 'artisan@exemple.fr',
    });
  });

  it('en mode test, redirige tout vers l’adresse de test', async () => {
    process.env.EMAIL_TEST_RECIPIENT = 'flowkorner@gmail.com';

    await sendEmail(EMAIL);

    expect(lastBody()).toMatchObject({
      to: ['flowkorner@gmail.com'],
      subject: '[Test → client@exemple.fr] Devis',
    });
  });

  it('signale un refus de Resend', async () => {
    fetchMock.mockResolvedValue(new Response('{"message":"not verified"}', { status: 403 }));
    jest.spyOn(console, 'error').mockImplementation(() => undefined);

    await expect(sendEmail(EMAIL)).resolves.toEqual({ ok: false, reason: 'resend_403' });
  });
});
