import { RAW_SNAPSHOT } from './quoteFixtures';

/** Contenu figé d'une facture de solde, tel que le construit la base. */
export const RAW_FINAL_INVOICE = {
  version: 1,
  kind: 'final',
  number: 'F-2026-002',
  quoteNumber: 'D-2026-001',
  quoteIssueDate: '2026-11-20',
  title: 'Remplacement chauffe-eau 200 L',
  siteAddress: '3 rue des Lilas, 69003 Lyon',
  vatMode: 'subject',
  company: RAW_SNAPSHOT.company,
  client: RAW_SNAPSHOT.client,
  lines: RAW_SNAPSHOT.lines,
  vatGroups: RAW_SNAPSHOT.vatGroups,
  totals: RAW_SNAPSHOT.totals,
  deductions: [
    { label: 'Acompte versé le 21/11/2026', invoiceNumber: 'F-2026-001', ttcCents: 18840 },
  ],
  amountDueCents: 43960,
};

export const RAW_DEPOSIT_INVOICE = {
  ...RAW_FINAL_INVOICE,
  kind: 'deposit',
  number: 'F-2026-001',
  depositPercent: 30,
  lines: [
    {
      designation: 'Acompte de 30 % sur le devis D-2026-001',
      quantity: 1,
      unit: 'forfait',
      unitPriceCents: 4150,
      vatRateBp: 2000,
      htCents: 4150,
    },
    {
      designation: 'Acompte de 30 % sur le devis D-2026-001',
      quantity: 1,
      unit: 'forfait',
      unitPriceCents: 12600,
      vatRateBp: 1000,
      htCents: 12600,
    },
  ],
  vatGroups: [
    { rateBp: 2000, htCents: 4150, vatCents: 830 },
    { rateBp: 1000, htCents: 12600, vatCents: 1260 },
  ],
  totals: { htCents: 16750, vatCents: 2090, ttcCents: 18840 },
  deductions: [],
  amountDueCents: 0,
};
