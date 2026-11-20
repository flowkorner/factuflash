import type { VatMode } from '@/features/company/domain/types';
import { isVatMode } from '@/features/company/domain/validation';
import type { QuoteStatus } from '../domain/types';
import type { Unit } from '../domain/units';
import { isUnit } from '../domain/units';
import type { VatRateBp } from '../domain/vat';
import { isVatRate } from '../domain/vat';

/** Image figée d'un devis (construite par la fonction SQL build_quote_snapshot). */
export interface QuoteSnapshot {
  number: string;
  title: string;
  siteAddress: string;
  validityDays: number;
  vatMode: VatMode;
  company: { name: string; siret: string; address: string; phone: string; logoPath: string | null };
  client: { name: string; email: string | null; address: string | null };
  lines: {
    designation: string;
    quantityMilli: number;
    unit: Unit;
    unitPriceCents: number;
    vatRateBp: VatRateBp;
    htCents: number;
  }[];
  vatGroups: { rateBp: VatRateBp; htCents: number; vatCents: number }[];
  totals: { htCents: number; vatCents: number; ttcCents: number };
  /** Présentes une fois envoyé (calculées par l'app au moment de l'envoi). */
  mentions: string[] | null;
}

export interface PublicQuote {
  status: QuoteStatus;
  issueDate: string;
  validUntil: string;
  sentAt: string | null;
  acceptedAt: string | null;
  acceptedByName: string | null;
  snapshot: QuoteSnapshot;
}

type Data = Record<string, unknown>;

function isRecord(value: unknown): value is Data {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function text(data: Data, key: string): string | null {
  const value = data[key];
  return typeof value === 'string' ? value : null;
}

function nullableText(data: Data, key: string): string | null | undefined {
  const value = data[key];
  if (value === null || value === undefined) return null;
  return typeof value === 'string' ? value : undefined;
}

function integer(data: Data, key: string): number | null {
  const value = data[key];
  return typeof value === 'number' && Number.isInteger(value) ? value : null;
}

function parseLine(value: unknown): QuoteSnapshot['lines'][number] | null {
  if (!isRecord(value)) return null;
  const designation = text(value, 'designation');
  const quantity = value.quantity;
  const unit = text(value, 'unit');
  const unitPriceCents = integer(value, 'unitPriceCents');
  const vatRateBp = integer(value, 'vatRateBp');
  const htCents = integer(value, 'htCents');
  if (designation === null || typeof quantity !== 'number' || unit === null || !isUnit(unit)) {
    return null;
  }
  if (unitPriceCents === null || htCents === null || vatRateBp === null || !isVatRate(vatRateBp)) {
    return null;
  }
  return {
    designation,
    // numeric(12,3) arrive en nombre JSON : conversion sûre en millièmes.
    quantityMilli: Math.round(quantity * 1000),
    unit,
    unitPriceCents,
    vatRateBp,
    htCents,
  };
}

function parseVatGroup(value: unknown): QuoteSnapshot['vatGroups'][number] | null {
  if (!isRecord(value)) return null;
  const rateBp = integer(value, 'rateBp');
  const htCents = integer(value, 'htCents');
  const vatCents = integer(value, 'vatCents');
  if (rateBp === null || !isVatRate(rateBp) || htCents === null || vatCents === null) return null;
  return { rateBp, htCents, vatCents };
}

function parseList<T>(value: unknown, parse: (item: unknown) => T | null): T[] | null {
  if (!Array.isArray(value)) return null;
  const items = value.map(parse);
  return items.every((item): item is T => item !== null) ? items : null;
}

/** Vérifie la forme du JSON venu de la base ; null si elle ne correspond pas. */
export function parseQuoteSnapshot(value: unknown): QuoteSnapshot | null {
  if (
    !isRecord(value) ||
    !isRecord(value.company) ||
    !isRecord(value.client) ||
    !isRecord(value.totals)
  ) {
    return null;
  }
  const { company, client, totals } = value;
  const number = text(value, 'number');
  const title = text(value, 'title');
  const siteAddress = text(value, 'siteAddress');
  const validityDays = integer(value, 'validityDays');
  const vatMode = text(value, 'vatMode');
  const companyName = text(company, 'name');
  const siret = text(company, 'siret');
  const companyAddress = text(company, 'address');
  const phone = text(company, 'phone');
  const logoPath = nullableText(company, 'logoPath');
  const clientName = text(client, 'name');
  const clientEmail = nullableText(client, 'email');
  const clientAddress = nullableText(client, 'address');
  const htCents = integer(totals, 'htCents');
  const vatCents = integer(totals, 'vatCents');
  const ttcCents = integer(totals, 'ttcCents');
  const lines = parseList(value.lines, parseLine);
  const vatGroups = parseList(value.vatGroups, parseVatGroup);
  const mentions =
    value.mentions === undefined || value.mentions === null
      ? null
      : parseList(value.mentions, (item) => (typeof item === 'string' ? item : null));

  if (
    number === null ||
    title === null ||
    siteAddress === null ||
    validityDays === null ||
    vatMode === null ||
    !isVatMode(vatMode) ||
    companyName === null ||
    siret === null ||
    companyAddress === null ||
    phone === null ||
    logoPath === undefined ||
    clientName === null ||
    clientEmail === undefined ||
    clientAddress === undefined ||
    htCents === null ||
    vatCents === null ||
    ttcCents === null ||
    lines === null ||
    vatGroups === null
  ) {
    return null;
  }

  return {
    number,
    title,
    siteAddress,
    validityDays,
    vatMode,
    company: { name: companyName, siret, address: companyAddress, phone, logoPath },
    client: { name: clientName, email: clientEmail, address: clientAddress },
    lines,
    vatGroups,
    totals: { htCents, vatCents, ttcCents },
    mentions,
  };
}

const STATUSES: readonly string[] = ['draft', 'sent', 'accepted', 'declined'];

function isStatus(value: string): value is QuoteStatus {
  return STATUSES.includes(value);
}

/** Réponse de get_public_quote ; null si introuvable ou mal formée. */
export function parsePublicQuote(value: unknown): PublicQuote | null {
  if (!isRecord(value)) return null;
  const status = text(value, 'status');
  const issueDate = text(value, 'issueDate');
  const validUntil = text(value, 'validUntil');
  const sentAt = nullableText(value, 'sentAt');
  const acceptedAt = nullableText(value, 'acceptedAt');
  const acceptedByName = nullableText(value, 'acceptedByName');
  const snapshot = parseQuoteSnapshot(value.snapshot);
  if (
    status === null ||
    !isStatus(status) ||
    issueDate === null ||
    validUntil === null ||
    sentAt === undefined ||
    acceptedAt === undefined ||
    acceptedByName === undefined ||
    snapshot === null
  ) {
    return null;
  }
  return { status, issueDate, validUntil, sentAt, acceptedAt, acceptedByName, snapshot };
}
