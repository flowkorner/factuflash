import { formatPhone, formatSiret, vatNumberFromSiret } from '@/features/company/domain/validation';
import { formatIssueDate } from '@/features/quotes/domain/format';
import { formatCents, formatQuantity } from '@/features/quotes/domain/money';
import { UNIT_SHORT } from '@/features/quotes/domain/units';
import { formatVatRate } from '@/features/quotes/domain/vat';
import { buildInvoiceMentions } from '../domain/invoiceMentions';
import type { PaymentMethod } from '../domain/types';
import type { InvoiceSnapshot } from './invoiceSnapshot';

/** Facture prête à afficher (page web ou PDF), formatée en français. */
export interface InvoiceDocumentView {
  title: string;
  number: string;
  isDeposit: boolean;
  infos: { label: string; value: string }[];
  company: { name: string; details: string[]; logoUrl: string | null };
  client: { name: string; address: string | null };
  siteAddress: string;
  object: string;
  lines: { designation: string; detail: string; total: string; vatLabel: string | null }[];
  totals: { label: string; value: string }[];
  totalLabel: string;
  totalValue: string;
  deductions: { label: string; value: string }[];
  amountDue: { label: string; value: string };
  isPaid: boolean;
  paidLabel: string | null;
  mentions: string[];
}

export interface InvoiceMeta {
  issueDate: string;
  dueDate: string;
  serviceDate: string;
  paidOn: string | null;
  paymentMethod: PaymentMethod | null;
  logoUrl: string | null;
}

export function buildInvoiceView(
  snapshot: InvoiceSnapshot,
  meta: InvoiceMeta,
): InvoiceDocumentView {
  const isDeposit = snapshot.kind === 'deposit';
  const isFranchise = snapshot.vatMode === 'franchise';
  const vatNumber = isFranchise ? null : vatNumberFromSiret(snapshot.company.siret);
  const isPaid = meta.paidOn !== null;

  return {
    title: isDeposit ? 'Facture d’acompte' : 'Facture',
    number: snapshot.number,
    isDeposit,
    infos: [
      { label: 'Numéro', value: snapshot.number },
      { label: 'Date', value: formatIssueDate(meta.issueDate) },
      { label: 'Client', value: snapshot.client.name },
      { label: 'Échéance', value: formatIssueDate(meta.dueDate) },
      {
        label: 'Devis',
        value: `${snapshot.quoteNumber} du ${formatIssueDate(snapshot.quoteIssueDate)}`,
      },
      {
        label: isDeposit ? 'Acompte encaissé le' : 'Travaux terminés le',
        value: formatIssueDate(meta.serviceDate),
      },
    ],
    company: {
      name: snapshot.company.name,
      details: [
        snapshot.company.address,
        `Tél. ${formatPhone(snapshot.company.phone)}`,
        `SIRET ${formatSiret(snapshot.company.siret)}`,
        ...(vatNumber ? [`N° TVA ${vatNumber}`] : []),
      ],
      logoUrl: meta.logoUrl,
    },
    client: { name: snapshot.client.name, address: snapshot.client.address },
    siteAddress: snapshot.siteAddress,
    object: isDeposit ? `Acompte · ${snapshot.title}` : snapshot.title,
    lines: snapshot.lines.map((line) => ({
      designation: line.designation,
      detail: `${formatQuantity(line.quantityMilli)} ${UNIT_SHORT[line.unit]} × ${formatCents(line.unitPriceCents)} HT`,
      total: formatCents(line.htCents),
      vatLabel: isFranchise ? null : `TVA ${formatVatRate(line.vatRateBp)}`,
    })),
    totals: isFranchise
      ? [{ label: 'Total HT', value: formatCents(snapshot.totals.htCents) }]
      : [
          { label: 'Total HT', value: formatCents(snapshot.totals.htCents) },
          ...snapshot.vatGroups.map((group) => ({
            label: `TVA ${formatVatRate(group.rateBp)}`,
            value: formatCents(group.vatCents),
          })),
        ],
    totalLabel: isFranchise ? 'Total' : 'Total TTC',
    totalValue: formatCents(snapshot.totals.ttcCents),
    deductions: snapshot.deductions.map((deduction) => ({
      label: `${deduction.label} (facture ${deduction.invoiceNumber})`,
      value: `− ${formatCents(deduction.ttcCents)}`,
    })),
    // Facture payée (acompte payé par carte, ou solde encaissé) : plus rien à payer.
    amountDue: { label: 'Reste à payer', value: formatCents(isPaid ? 0 : snapshot.amountDueCents) },
    isPaid,
    paidLabel: isPaid && meta.paidOn ? `Payée le ${formatIssueDate(meta.paidOn)}` : null,
    mentions: buildInvoiceMentions({
      kind: snapshot.kind,
      companyName: snapshot.company.name,
      siret: snapshot.company.siret,
      vatMode: snapshot.vatMode,
      quoteNumber: snapshot.quoteNumber,
      quoteIssueDate: snapshot.quoteIssueDate,
      issueDate: meta.issueDate,
      dueDate: meta.dueDate,
      serviceDate: meta.serviceDate,
      paidOn: meta.paidOn,
      paymentMethod: meta.paymentMethod,
    }),
  };
}
