import { RAW_DEPOSIT_INVOICE, RAW_FINAL_INVOICE } from '@/test/invoiceFixtures';
import { buildInvoiceEmail } from '../email/invoiceEmail';
import { todayIso } from '../domain/dates';
import { parseInvoiceSnapshot, parsePublicInvoice } from './invoiceSnapshot';
import { buildInvoiceView } from './invoiceView';

const META = {
  issueDate: '2026-11-25',
  dueDate: '2026-12-25',
  serviceDate: '2026-11-24',
  paidOn: null,
  paymentMethod: null,
  logoUrl: null,
};
const clean = (value: string) => value.replace(/\s/g, ' ');

describe('contenu figé des factures', () => {
  it('lit une facture de solde et une facture d’acompte', () => {
    expect(parseInvoiceSnapshot(RAW_FINAL_INVOICE)).toMatchObject({
      kind: 'final',
      amountDueCents: 43960,
      deductions: [{ invoiceNumber: 'F-2026-001', ttcCents: 18840 }],
    });
    expect(parseInvoiceSnapshot(RAW_DEPOSIT_INVOICE)).toMatchObject({
      kind: 'deposit',
      depositPercent: 30,
    });
  });

  it('refuse une forme inattendue', () => {
    expect(parseInvoiceSnapshot({ ...RAW_FINAL_INVOICE, kind: 'avoir' })).toBeNull();
    expect(parseInvoiceSnapshot({ ...RAW_FINAL_INVOICE, deductions: [{ label: 'x' }] })).toBeNull();
    expect(parsePublicInvoice({ kind: 'final' })).toBeNull();
  });
});

describe('facture de solde', () => {
  const view = buildInvoiceView(parseInvoiceSnapshot(RAW_FINAL_INVOICE)!, META);

  it('déduit l’acompte et affiche le reste à payer', () => {
    expect(view.title).toBe('Facture');
    expect(clean(view.totalValue)).toBe('628,00 €');
    expect(view.deductions.map((row) => clean(`${row.label} ${row.value}`))).toEqual([
      'Acompte versé le 21/11/2026 (facture F-2026-001) − 188,40 €',
    ]);
    expect(clean(view.amountDue.value)).toBe('439,60 €');
    expect(view.isPaid).toBe(false);
  });

  it('porte les mentions légales obligatoires', () => {
    const mentions = view.mentions.join('\n');
    expect(mentions).toContain('SIRET 81234567800013 · TVA FR25812345678');
    expect(mentions).toContain('Date d’exécution des travaux : 24 nov. 2026');
    expect(mentions).toContain('Date d’échéance : 25 déc. 2026.');
    expect(mentions).toContain('Pas d’escompte pour paiement anticipé.');
    expect(mentions).toMatch(/pénalités .* 3 fois le taux d’intérêt légal/);
    expect(mentions).toMatch(/indemnité forfaitaire pour frais de recouvrement de 40 €/);
  });

  it('indique « TVA non applicable » en franchise', () => {
    const franchise = buildInvoiceView(
      parseInvoiceSnapshot({ ...RAW_FINAL_INVOICE, vatMode: 'franchise' })!,
      META,
    );
    expect(franchise.mentions).toContain('TVA non applicable, art. 293 B du CGI.');
    expect(franchise.totals.map((row) => row.label)).toEqual(['Total HT']);
  });

  it('passe à « acquittée » une fois le solde reçu', () => {
    const paid = buildInvoiceView(parseInvoiceSnapshot(RAW_FINAL_INVOICE)!, {
      ...META,
      paidOn: '2026-12-02',
      paymentMethod: 'transfer',
    });
    expect(clean(paid.amountDue.value)).toBe('0,00 €');
    expect(paid.mentions).toContain('Facture acquittée le 2 déc. 2026 (virement).');
  });
});

describe('facture d’acompte', () => {
  it('est acquittée, référence le devis, et répartit la TVA par taux', () => {
    const view = buildInvoiceView(parseInvoiceSnapshot(RAW_DEPOSIT_INVOICE)!, {
      ...META,
      issueDate: '2026-11-21',
      dueDate: '2026-11-21',
      serviceDate: '2026-11-21',
      paidOn: '2026-11-21',
      paymentMethod: 'card_online',
    });
    expect(view.title).toBe('Facture d’acompte');
    expect(view.totals.map((row) => clean(`${row.label} ${row.value}`))).toEqual([
      'Total HT 167,50 €',
      'TVA 20 % 8,30 €',
      'TVA 10 % 12,60 €',
    ]);
    expect(clean(view.totalValue)).toBe('188,40 €');
    expect(view.mentions).toContain(
      'Facture d’acompte relative au devis D-2026-001 du 20 nov. 2026.',
    );
    expect(view.mentions).toContain('Date d’échéance : 21 nov. 2026 (paiement à réception).');
    expect(view.mentions).toContain('Facture acquittée le 21 nov. 2026 (carte bancaire en ligne).');
  });
});

describe('email de facture', () => {
  it('échappe le texte saisi et contient le bouton « Voir ma facture »', () => {
    const email = buildInvoiceEmail({
      kind: 'final',
      companyName: 'Plomberie <Durand>',
      clientName: 'M. Martin',
      number: 'F-2026-002',
      title: 'Chauffe-eau & pose',
      totalValue: '628,00 €',
      amountDueValue: '439,60 €',
      dueDateLabel: '25 déc. 2026',
      link: 'https://factuflash.test/f/abc',
    });
    expect(email.subject).toBe('Facture F-2026-002 de Plomberie <Durand>');
    expect(email.html).toContain('Plomberie &lt;Durand&gt;');
    expect(email.html).toContain('Chauffe-eau &amp; pose');
    expect(email.html).toContain('>Voir ma facture</a>');
    expect(email.text).toContain('Reste à payer : 439,60 €, avant le 25 déc. 2026.');
  });
});

describe('todayIso', () => {
  it('donne la date de Paris (et non UTC)', () => {
    expect(todayIso(new Date('2026-12-31T23:30:00Z'))).toBe('2027-01-01');
  });
});
