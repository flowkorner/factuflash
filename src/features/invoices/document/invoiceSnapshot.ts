import type { VatMode } from '@/features/company/domain/types';
import { isVatMode } from '@/features/company/domain/validation';
import type { QuoteSnapshot } from '@/features/quotes/document/snapshot';
import {
  integer,
  isRecord,
  nullableText,
  parseLine,
  parseList,
  parseVatGroup,
  text,
} from '@/features/quotes/document/snapshot';
import type { InvoiceKind, PaymentMethod } from '../domain/types';

/** Contenu figé d'une facture (construit en SQL à l'émission, jamais modifié). */
export interface InvoiceSnapshot {
  kind: InvoiceKind;
  number: string;
  quoteNumber: string;
  quoteIssueDate: string;
  title: string;
  siteAddress: string;
  vatMode: VatMode;
  depositPercent: number | null;
  company: QuoteSnapshot['company'];
  client: QuoteSnapshot['client'];
  lines: QuoteSnapshot['lines'];
  vatGroups: QuoteSnapshot['vatGroups'];
  totals: QuoteSnapshot['totals'];
  deductions: { label: string; invoiceNumber: string; ttcCents: number }[];
  amountDueCents: number;
}

export interface PublicInvoice {
  kind: InvoiceKind;
  number: string;
  issueDate: string;
  dueDate: string;
  serviceDate: string;
  amountDueCents: number;
  paidOn: string | null;
  paymentMethod: PaymentMethod | null;
  snapshot: InvoiceSnapshot;
}

const KINDS: readonly string[] = ['deposit', 'final'];
const METHODS: readonly string[] = ['card_online', 'transfer', 'cheque', 'cash', 'card'];

function isKind(value: string): value is InvoiceKind {
  return KINDS.includes(value);
}

export function isPaymentMethod(value: string): value is PaymentMethod {
  return METHODS.includes(value);
}

function parseDeduction(value: unknown): InvoiceSnapshot['deductions'][number] | null {
  if (!isRecord(value)) return null;
  const label = text(value, 'label');
  const invoiceNumber = text(value, 'invoiceNumber');
  const ttcCents = integer(value, 'ttcCents');
  return label && invoiceNumber && ttcCents !== null ? { label, invoiceNumber, ttcCents } : null;
}

export function parseInvoiceSnapshot(value: unknown): InvoiceSnapshot | null {
  if (
    !isRecord(value) ||
    !isRecord(value.company) ||
    !isRecord(value.client) ||
    !isRecord(value.totals)
  ) {
    return null;
  }
  const { company, client, totals } = value;
  const kind = text(value, 'kind');
  const vatMode = text(value, 'vatMode');
  const fields = {
    number: text(value, 'number'),
    quoteNumber: text(value, 'quoteNumber'),
    quoteIssueDate: text(value, 'quoteIssueDate'),
    title: text(value, 'title'),
    siteAddress: text(value, 'siteAddress'),
    companyName: text(company, 'name'),
    siret: text(company, 'siret'),
    companyAddress: text(company, 'address'),
    phone: text(company, 'phone'),
    clientName: text(client, 'name'),
  };
  const logoPath = nullableText(company, 'logoPath');
  const clientEmail = nullableText(client, 'email');
  const clientAddress = nullableText(client, 'address');
  const htCents = integer(totals, 'htCents');
  const vatCents = integer(totals, 'vatCents');
  const ttcCents = integer(totals, 'ttcCents');
  const amountDueCents = integer(value, 'amountDueCents');
  const depositPercent =
    value.depositPercent === undefined ? null : integer(value, 'depositPercent');
  const lines = parseList(value.lines, parseLine);
  const vatGroups = parseList(value.vatGroups, parseVatGroup);
  const deductions = parseList(value.deductions, parseDeduction);

  const missingText = Object.values(fields).some((field) => field === null);
  if (
    kind === null ||
    !isKind(kind) ||
    vatMode === null ||
    !isVatMode(vatMode) ||
    missingText ||
    logoPath === undefined ||
    clientEmail === undefined ||
    clientAddress === undefined ||
    htCents === null ||
    vatCents === null ||
    ttcCents === null ||
    amountDueCents === null ||
    lines === null ||
    vatGroups === null ||
    deductions === null
  ) {
    return null;
  }

  return {
    kind,
    number: fields.number ?? '',
    quoteNumber: fields.quoteNumber ?? '',
    quoteIssueDate: fields.quoteIssueDate ?? '',
    title: fields.title ?? '',
    siteAddress: fields.siteAddress ?? '',
    vatMode,
    depositPercent,
    company: {
      name: fields.companyName ?? '',
      siret: fields.siret ?? '',
      address: fields.companyAddress ?? '',
      phone: fields.phone ?? '',
      logoPath,
    },
    client: { name: fields.clientName ?? '', email: clientEmail, address: clientAddress },
    lines,
    vatGroups,
    totals: { htCents, vatCents, ttcCents },
    deductions,
    amountDueCents,
  };
}

export function parsePublicInvoice(value: unknown): PublicInvoice | null {
  if (!isRecord(value)) return null;
  const kind = text(value, 'kind');
  const number = text(value, 'number');
  const issueDate = text(value, 'issueDate');
  const dueDate = text(value, 'dueDate');
  const serviceDate = text(value, 'serviceDate');
  const amountDueCents = integer(value, 'amountDueCents');
  const paidOn = nullableText(value, 'paidOn');
  const method = nullableText(value, 'paymentMethod');
  const snapshot = parseInvoiceSnapshot(value.snapshot);
  if (
    kind === null ||
    !isKind(kind) ||
    !number ||
    !issueDate ||
    !dueDate ||
    !serviceDate ||
    amountDueCents === null ||
    paidOn === undefined ||
    method === undefined ||
    (method !== null && !isPaymentMethod(method)) ||
    snapshot === null
  ) {
    return null;
  }
  return {
    kind,
    number,
    issueDate,
    dueDate,
    serviceDate,
    amountDueCents,
    paidOn,
    paymentMethod: method !== null && isPaymentMethod(method) ? method : null,
    snapshot,
  };
}
