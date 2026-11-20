export interface QuoteEmailInput {
  companyName: string;
  clientName: string;
  number: string;
  title: string;
  totalLabel: string;
  totalValue: string;
  validUntilLabel: string;
  link: string;
}

const ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

/** Tout texte saisi (nom, objet…) est échappé avant d'entrer dans le HTML. */
export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ESCAPES[char] ?? char);
}

/** Email envoyé au client : sujet, HTML (styles en ligne pour les messageries) et texte brut. */
export function buildQuoteEmail(input: QuoteEmailInput): {
  subject: string;
  html: string;
  text: string;
} {
  const e = {
    company: escapeHtml(input.companyName),
    client: escapeHtml(input.clientName),
    number: escapeHtml(input.number),
    title: escapeHtml(input.title),
    totalLabel: escapeHtml(input.totalLabel),
    totalValue: escapeHtml(input.totalValue),
    validUntil: escapeHtml(input.validUntilLabel),
    link: escapeHtml(input.link),
  };

  const subject = `Devis ${input.number} de ${input.companyName}`;

  const html = `<!doctype html>
<html lang="fr">
<body style="margin:0;padding:0;background:#F8FAFC;">
<div style="font-family:Arial,Helvetica,sans-serif;color:#0F172A;max-width:520px;margin:0 auto;padding:24px;">
  <p style="font-size:13px;font-weight:bold;color:#1D4ED8;letter-spacing:0.06em;text-transform:uppercase;margin:0 0 8px;">Devis ${e.number}</p>
  <h1 style="font-size:22px;margin:0 0 16px;">${e.company} vous a envoyé un devis</h1>
  <p style="font-size:16px;line-height:1.5;margin:0 0 16px;">Bonjour ${e.client},</p>
  <p style="font-size:16px;line-height:1.5;margin:0 0 20px;">Voici le devis pour <strong>${e.title}</strong>.</p>
  <table role="presentation" style="width:100%;border-collapse:collapse;background:#FFFFFF;border:1px solid #E2E8F0;border-radius:12px;margin:0 0 24px;">
    <tr><td style="padding:14px 16px;font-size:15px;color:#475569;">${e.totalLabel}</td>
        <td style="padding:14px 16px;font-size:20px;font-weight:bold;text-align:right;">${e.totalValue}</td></tr>
    <tr><td style="padding:0 16px 14px;font-size:14px;color:#475569;">Valable jusqu’au</td>
        <td style="padding:0 16px 14px;font-size:14px;text-align:right;">${e.validUntil}</td></tr>
  </table>
  <p style="margin:0 0 24px;">
    <a href="${e.link}" style="display:inline-block;background:#1D4ED8;color:#FFFFFF;font-size:17px;font-weight:bold;text-decoration:none;padding:16px 28px;border-radius:12px;">Voir mon devis</a>
  </p>
  <p style="font-size:14px;line-height:1.5;color:#475569;margin:0 0 8px;">Vous pourrez le lire, le télécharger en PDF et l’accepter en ligne, sans créer de compte.</p>
  <p style="font-size:14px;line-height:1.5;color:#475569;margin:0 0 8px;">Une question ? Répondez simplement à cet email, il arrivera chez ${e.company}.</p>
  <p style="font-size:12px;line-height:1.5;color:#64748B;margin:24px 0 0;">Ce lien est personnel : ne le transférez pas. Envoyé avec FactuFlash.</p>
</div>
</body>
</html>`;

  const text = [
    `Bonjour ${input.clientName},`,
    '',
    `${input.companyName} vous a envoyé le devis ${input.number} pour « ${input.title} ».`,
    `${input.totalLabel} : ${input.totalValue}`,
    `Valable jusqu’au ${input.validUntilLabel}.`,
    '',
    `Voir mon devis : ${input.link}`,
    '',
    'Vous pourrez le lire, le télécharger en PDF et l’accepter en ligne, sans créer de compte.',
    `Une question ? Répondez simplement à cet email, il arrivera chez ${input.companyName}.`,
  ].join('\n');

  return { subject, html, text };
}
