import type { VatMode } from '@/features/company/domain/types';
import { vatNumberFromSiret } from '@/features/company/domain/validation';
import { formatIssueDate } from '@/features/quotes/domain/format';
import type { InvoiceKind, PaymentMethod } from './types';
import { PAYMENT_METHOD_LABELS } from './types';

export interface InvoiceMentionsInput {
  kind: InvoiceKind;
  companyName: string;
  siret: string;
  vatMode: VatMode;
  quoteNumber: string;
  quoteIssueDate: string;
  issueDate: string;
  dueDate: string;
  serviceDate: string;
  paidOn: string | null;
  paymentMethod: PaymentMethod | null;
}

/**
 * Mentions obligatoires d'une facture française (art. L441-9 et R441-3 du Code de commerce,
 * art. 242 nonies A de l'annexe II du CGI). Version 1 : toute évolution doit garder le sens
 * des factures déjà émises (elles sont régénérées à l'affichage depuis leur contenu figé).
 */
export function buildInvoiceMentions(input: InvoiceMentionsInput): string[] {
  const vatNumber = input.vatMode === 'subject' ? vatNumberFromSiret(input.siret) : null;
  const sameDay = input.dueDate === input.issueDate;
  const mentions = [
    `${input.companyName} · SIRET ${input.siret}${vatNumber ? ` · TVA ${vatNumber}` : ''}`,
    input.kind === 'deposit'
      ? `Facture d’acompte relative au devis ${input.quoteNumber} du ${formatIssueDate(input.quoteIssueDate)}.`
      : `Facture de solde du devis ${input.quoteNumber} du ${formatIssueDate(input.quoteIssueDate)}. Date d’exécution des travaux : ${formatIssueDate(input.serviceDate)}.`,
    input.vatMode === 'franchise'
      ? 'TVA non applicable, art. 293 B du CGI.'
      : 'TVA acquittée sur les encaissements. Taux de TVA indiqué sur chaque ligne.',
    sameDay
      ? `Date d’échéance : ${formatIssueDate(input.dueDate)} (paiement à réception).`
      : `Date d’échéance : ${formatIssueDate(input.dueDate)}.`,
    'Pas d’escompte pour paiement anticipé.',
    'En cas de retard de paiement, des pénalités sont exigibles au taux de 3 fois le taux d’intérêt légal en vigueur, sans qu’un rappel soit nécessaire.',
    'Clients professionnels : indemnité forfaitaire pour frais de recouvrement de 40 € en cas de retard de paiement (art. L441-10 et D441-5 du Code de commerce).',
  ];
  if (input.paidOn && input.paymentMethod) {
    mentions.push(
      `Facture acquittée le ${formatIssueDate(input.paidOn)} (${PAYMENT_METHOD_LABELS[input.paymentMethod]}).`,
    );
  }
  return mentions;
}
