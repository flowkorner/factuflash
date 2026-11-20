import { buildQuoteEmail, escapeHtml } from './quoteEmail';

const INPUT = {
  companyName: 'Plomberie <Durand>',
  clientName: 'M. "Martin"',
  number: 'D-2026-001',
  title: 'Chauffe-eau & groupe de sécurité',
  totalLabel: 'Total TTC',
  totalValue: '628,00 €',
  validUntilLabel: '20 déc. 2026',
  link: 'https://factuflash.test/d/abc',
};

describe('buildQuoteEmail', () => {
  it('écrit un email en français avec le bouton « Voir mon devis »', () => {
    const email = buildQuoteEmail(INPUT);
    expect(email.subject).toBe('Devis D-2026-001 de Plomberie <Durand>');
    expect(email.html).toContain('>Voir mon devis</a>');
    expect(email.html).toContain('href="https://factuflash.test/d/abc"');
    expect(email.text).toContain('Voir mon devis : https://factuflash.test/d/abc');
  });

  it('échappe tout texte saisi dans le HTML', () => {
    const { html } = buildQuoteEmail(INPUT);
    expect(html).toContain('Plomberie &lt;Durand&gt;');
    expect(html).toContain('M. &quot;Martin&quot;');
    expect(html).toContain('Chauffe-eau &amp; groupe');
    expect(html).not.toContain('<Durand>');
    expect(escapeHtml(`<img src=x onerror="alert('x')">`)).toBe(
      '&lt;img src=x onerror=&quot;alert(&#39;x&#39;)&quot;&gt;',
    );
  });
});
