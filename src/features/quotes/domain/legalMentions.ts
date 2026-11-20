import type { VatMode } from '@/features/company/domain/types';
import { vatNumberFromSiret } from '@/features/company/domain/validation';

export interface LegalMentionsInput {
  companyName: string;
  siret: string;
  vatMode: VatMode;
  validityDays: number;
}

/**
 * Mentions affichées en bas du devis (artisan, France).
 * L'identité complète de l'entreprise et du client figure en en-tête du devis.
 */
export function buildLegalMentions({
  companyName,
  siret,
  vatMode,
  validityDays,
}: LegalMentionsInput): string[] {
  const vatNumber = vatNumberFromSiret(siret);
  return [
    `${companyName} · SIRET ${siret}${vatMode === 'subject' && vatNumber ? ` · TVA ${vatNumber}` : ''}`,
    vatMode === 'franchise'
      ? 'TVA non applicable, art. 293 B du CGI.'
      : 'Prix exprimés en euros hors taxes, TVA au taux indiqué sur chaque ligne.',
    'Devis gratuit.',
    `Devis valable ${validityDays} jours à compter de sa date d’émission.`,
    'Pour accepter ce devis : date et signature du client, précédées de la mention « Bon pour accord ».',
  ];
}
