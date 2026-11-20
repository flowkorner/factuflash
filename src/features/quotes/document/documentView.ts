import { formatPhone, formatSiret, vatNumberFromSiret } from '@/features/company/domain/validation';
import { formatIssueDate } from '../domain/format';
import { formatCents, formatQuantity } from '../domain/money';
import type { QuoteStatus } from '../domain/types';
import { UNIT_SHORT } from '../domain/units';
import { formatVatRate } from '../domain/vat';
import type { QuoteSnapshot } from './snapshot';

/** Tout ce qu'il faut pour afficher un devis (page web ou PDF), déjà formaté en français. */
export interface QuoteDocumentView {
  number: string;
  title: string;
  status: QuoteStatus;
  issueDateLabel: string;
  validUntilLabel: string;
  company: {
    name: string;
    details: string[];
    logoUrl: string | null;
  };
  client: { name: string; address: string | null };
  siteAddress: string;
  lines: { designation: string; detail: string; total: string; vatLabel: string | null }[];
  totals: { label: string; value: string }[];
  totalLabel: string;
  totalValue: string;
  isFranchise: boolean;
  mentions: string[];
  acceptance: { byName: string; atLabel: string } | null;
}

export interface DocumentMeta {
  status: QuoteStatus;
  /** AAAA-MM-JJ */
  issueDate: string;
  /** AAAA-MM-JJ */
  validUntil: string;
  acceptedAt: string | null;
  acceptedByName: string | null;
  logoUrl: string | null;
  /** Mentions calculées pour un brouillon (le snapshot d'un devis envoyé contient les siennes). */
  fallbackMentions: string[];
}

const DATE_TIME_FORMAT = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Europe/Paris',
});

/** "2026-11-20T13:32:00Z" → "20 novembre 2026 à 14:32" (heure de Paris). */
export function formatDateTime(iso: string): string {
  return DATE_TIME_FORMAT.format(new Date(iso));
}

export function buildDocumentView(snapshot: QuoteSnapshot, meta: DocumentMeta): QuoteDocumentView {
  const isFranchise = snapshot.vatMode === 'franchise';
  const vatNumber = isFranchise ? null : vatNumberFromSiret(snapshot.company.siret);
  const details = [
    snapshot.company.address,
    `Tél. ${formatPhone(snapshot.company.phone)}`,
    `SIRET ${formatSiret(snapshot.company.siret)}`,
    ...(vatNumber ? [`N° TVA ${vatNumber}`] : []),
  ];

  const totals = isFranchise
    ? [{ label: 'Total HT', value: formatCents(snapshot.totals.htCents) }]
    : [
        { label: 'Total HT', value: formatCents(snapshot.totals.htCents) },
        ...snapshot.vatGroups.map((group) => ({
          label: `TVA ${formatVatRate(group.rateBp)}`,
          value: formatCents(group.vatCents),
        })),
      ];

  return {
    number: snapshot.number,
    title: snapshot.title,
    status: meta.status,
    issueDateLabel: formatIssueDate(meta.issueDate),
    validUntilLabel: formatIssueDate(meta.validUntil),
    company: { name: snapshot.company.name, details, logoUrl: meta.logoUrl },
    client: { name: snapshot.client.name, address: snapshot.client.address },
    siteAddress: snapshot.siteAddress,
    lines: snapshot.lines.map((line) => ({
      designation: line.designation,
      detail: `${formatQuantity(line.quantityMilli)} ${UNIT_SHORT[line.unit]} × ${formatCents(line.unitPriceCents)} HT`,
      total: formatCents(line.htCents),
      vatLabel: isFranchise ? null : `TVA ${formatVatRate(line.vatRateBp)}`,
    })),
    totals,
    totalLabel: isFranchise ? 'Total à payer' : 'Total TTC',
    totalValue: formatCents(snapshot.totals.ttcCents),
    isFranchise,
    mentions: snapshot.mentions ?? meta.fallbackMentions,
    acceptance:
      meta.acceptedAt && meta.acceptedByName
        ? { byName: meta.acceptedByName, atLabel: formatDateTime(meta.acceptedAt) }
        : null,
  };
}

/** Ajoute des jours à une date AAAA-MM-JJ (sans fuseau). */
export function addDays(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
