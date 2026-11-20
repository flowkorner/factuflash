import { getEmailEnv } from '@/lib/env';

export interface OutgoingEmail {
  to: string;
  subject: string;
  html: string;
  text: string;
  /** Nom affiché de l'expéditeur, ex. « Plomberie Durand via FactuFlash ». */
  fromName?: string;
  replyTo?: string | null;
}

export type SendEmailResult = { ok: true; id: string | null } | { ok: false; reason: string };

/** Retire ce qui pourrait casser un en-tête d'email (guillemets, chevrons, retours à la ligne). */
function sanitizeDisplayName(name: string): string {
  return name
    .replace(/["<>\r\n]/g, '')
    .trim()
    .slice(0, 80);
}

function withDisplayName(from: string, name: string | undefined): string {
  if (!name) return from;
  const address = /<([^>]+)>/.exec(from)?.[1] ?? from;
  return `"${sanitizeDisplayName(name)}" <${address}>`;
}

/** Envoi via l'API HTTP de Resend (côté serveur uniquement). */
export async function sendEmail(email: OutgoingEmail): Promise<SendEmailResult> {
  const env = getEmailEnv();
  const response = await fetch(`${env.apiUrl}/emails`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: withDisplayName(env.from, email.fromName),
      to: [env.testRecipient ?? email.to],
      subject: env.testRecipient ? `[Test → ${email.to}] ${email.subject}` : email.subject,
      html: email.html,
      text: email.text,
      ...(email.replyTo ? { reply_to: email.replyTo } : {}),
    }),
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    console.error('[email] Resend a refusé l’envoi', {
      status: response.status,
      detail: detail.slice(0, 300),
    });
    return { ok: false, reason: `resend_${response.status}` };
  }
  const body: unknown = await response.json().catch(() => null);
  const id =
    typeof body === 'object' && body !== null && 'id' in body && typeof body.id === 'string'
      ? body.id
      : null;
  return { ok: true, id };
}
