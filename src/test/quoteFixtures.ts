import type { QuoteDocumentView } from '@/features/quotes/document/documentView';
import { buildDocumentView } from '@/features/quotes/document/documentView';
import type { QuoteSnapshot } from '@/features/quotes/document/snapshot';

/** Snapshot tel que le renvoie build_quote_snapshot (forme JSON brute). */
export const RAW_SNAPSHOT = {
  version: 1,
  number: 'D-2026-001',
  title: 'Remplacement chauffe-eau 200 L',
  siteAddress: '3 rue des Lilas, 69003 Lyon',
  validityDays: 30,
  vatMode: 'subject',
  company: {
    name: 'Plomberie Durand',
    siret: '81234567800013',
    address: '12 rue des Lilas, 69003 Lyon',
    phone: '0612345678',
    logoPath: null,
  },
  client: { name: 'M. Martin', email: 'martin@example.fr', address: '3 rue des Lilas, 69003 Lyon' },
  lines: [
    {
      designation: 'Chauffe-eau 200 L',
      quantity: 1,
      unit: 'u',
      unitPriceCents: 42000,
      vatRateBp: 1000,
      htCents: 42000,
    },
    {
      designation: 'Pose',
      quantity: 2.5,
      unit: 'h',
      unitPriceCents: 5533,
      vatRateBp: 2000,
      htCents: 13833,
    },
  ],
  vatGroups: [
    { rateBp: 2000, htCents: 13833, vatCents: 2767 },
    { rateBp: 1000, htCents: 42000, vatCents: 4200 },
  ],
  totals: { htCents: 55833, vatCents: 6967, ttcCents: 62800 },
  mentions: ['Devis gratuit.'],
};

export const SNAPSHOT: QuoteSnapshot = {
  number: RAW_SNAPSHOT.number,
  title: RAW_SNAPSHOT.title,
  siteAddress: RAW_SNAPSHOT.siteAddress,
  validityDays: RAW_SNAPSHOT.validityDays,
  company: RAW_SNAPSHOT.company,
  client: RAW_SNAPSHOT.client,
  totals: RAW_SNAPSHOT.totals,
  mentions: RAW_SNAPSHOT.mentions,
  vatMode: 'subject',
  lines: [
    {
      designation: 'Chauffe-eau 200 L',
      quantityMilli: 1000,
      unit: 'u',
      unitPriceCents: 42000,
      vatRateBp: 1000,
      htCents: 42000,
    },
    {
      designation: 'Pose',
      quantityMilli: 2500,
      unit: 'h',
      unitPriceCents: 5533,
      vatRateBp: 2000,
      htCents: 13833,
    },
  ],
  vatGroups: [
    { rateBp: 2000, htCents: 13833, vatCents: 2767 },
    { rateBp: 1000, htCents: 42000, vatCents: 4200 },
  ],
};

export function sampleView(
  overrides: Partial<Parameters<typeof buildDocumentView>[1]> = {},
): QuoteDocumentView {
  return buildDocumentView(SNAPSHOT, {
    status: 'sent',
    issueDate: '2026-11-20',
    validUntil: '2026-12-20',
    acceptedAt: null,
    acceptedByName: null,
    logoUrl: null,
    fallbackMentions: [],
    deposit: null,
    ...overrides,
  });
}
