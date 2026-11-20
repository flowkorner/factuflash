import type { QuoteStatus } from './types';

export const STATUS_LABELS: Record<QuoteStatus, string> = {
  draft: 'Brouillon',
  sent: 'Envoyé',
  accepted: 'Accepté',
  declined: 'Refusé',
};

const DATE_FORMAT = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

/** "2026-11-19" → "19 nov. 2026". */
export function formatIssueDate(isoDate: string): string {
  return DATE_FORMAT.format(new Date(`${isoDate}T00:00:00Z`));
}

export function quotesCountLabel(count: number): string {
  if (count === 0) return 'Votre premier devis en 2 minutes';
  return count === 1 ? '1 devis' : `${count} devis`;
}
