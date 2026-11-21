import { escapeHtml } from '@/features/quotes/email/quoteEmail';

export interface InvoiceEmailInput {
  kind: 'deposit' | 'final';
  companyName: string;
  clientName: string;
  number: string;
  title: string;
  totalValue: string;
  amountDueValue: string;
  dueDateLabel: string;
  link: string;
}

/** Email de facture au client (acompte acquitté ou solde à régler). Texte saisi échappé. */
export function buildInvoiceEmail(input: InvoiceEmailInput): {
  subject: string;
  html: string;
  text: string;
} {
  const isDeposit = input.kind === 'deposit';
  const e = {
    company: escapeHtml(input.companyName),
    client: escapeHtml(input.clientName),
    number: escapeHtml(input.number),
    title: escapeHtml(input.title),
    total: escapeHtml(input.totalValue),
    due: escapeHtml(input.amountDueValue),
    dueDate: escapeHtml(input.dueDateLabel),
    link: escapeHtml(input.link),
  };
  const subject = `${isDeposit ? 'Facture d’acompte' : 'Facture'} ${input.number} de ${input.companyName}`;
  const intro = isDeposit
    ? `Merci pour votre acompte de <strong>${e.total}</strong>. Voici votre facture d’acompte, acquittée, pour <strong>${e.title}</strong>.`
    : `Les travaux « <strong>${e.title}</strong> » sont terminés. Voici la facture de solde.`;
  const amountRows = isDeposit
    ? `<tr><td style="padding:14px 16px;font-size:15px;color:#475569;">Acompte payé</td>
        <td style="padding:14px 16px;font-size:20px;font-weight:bold;text-align:right;">${e.total}</td></tr>`
    : `<tr><td style="padding:14px 16px;font-size:15px;color:#475569;">Reste à payer</td>
        <td style="padding:14px 16px;font-size:20px;font-weight:bold;text-align:right;">${e.due}</td></tr>
       <tr><td style="padding:0 16px 14px;font-size:14px;color:#475569;">À régler avant le</td>
        <td style="padding:0 16px 14px;font-size:14px;text-align:right;">${e.dueDate}</td></tr>`;

  const html = `<!doctype html>
<html lang="fr">
<body style="margin:0;padding:0;background:#F8FAFC;">
<div style="font-family:Arial,Helvetica,sans-serif;color:#0F172A;max-width:520px;margin:0 auto;padding:24px;">
  <p style="font-size:13px;font-weight:bold;color:#1D4ED8;letter-spacing:0.06em;text-transform:uppercase;margin:0 0 8px;">Facture ${e.number}</p>
  <h1 style="font-size:22px;margin:0 0 16px;">${e.company}</h1>
  <p style="font-size:16px;line-height:1.5;margin:0 0 16px;">Bonjour ${e.client},</p>
  <p style="font-size:16px;line-height:1.5;margin:0 0 20px;">${intro}</p>
  <table role="presentation" style="width:100%;border-collapse:collapse;background:#FFFFFF;border:1px solid #E2E8F0;border-radius:12px;margin:0 0 24px;">
    ${amountRows}
  </table>
  <p style="margin:0 0 24px;">
    <a href="${e.link}" style="display:inline-block;background:#1D4ED8;color:#FFFFFF;font-size:17px;font-weight:bold;text-decoration:none;padding:16px 28px;border-radius:12px;">Voir ma facture</a>
  </p>
  <p style="font-size:14px;line-height:1.5;color:#475569;margin:0 0 8px;">Vous pouvez la télécharger en PDF depuis ce lien. Conservez-la : c’est votre justificatif.</p>
  <p style="font-size:14px;line-height:1.5;color:#475569;margin:0 0 8px;">Une question ? Répondez simplement à cet email, il arrivera chez ${e.company}.</p>
  <p style="font-size:12px;line-height:1.5;color:#64748B;margin:24px 0 0;">Ce lien est personnel : ne le transférez pas. Envoyé avec FactuFlash.</p>
</div>
</body>
</html>`;

  const text = [
    `Bonjour ${input.clientName},`,
    '',
    isDeposit
      ? `Merci pour votre acompte de ${input.totalValue}. Voici votre facture d’acompte ${input.number}, acquittée.`
      : `Voici la facture de solde ${input.number} pour « ${input.title} ». Reste à payer : ${input.amountDueValue}, avant le ${input.dueDateLabel}.`,
    '',
    `Voir ma facture : ${input.link}`,
    '',
    `Une question ? Répondez simplement à cet email, il arrivera chez ${input.companyName}.`,
  ].join('\n');

  return { subject, html, text };
}
