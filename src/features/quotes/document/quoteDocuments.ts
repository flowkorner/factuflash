import type { SupabaseClient } from '@supabase/supabase-js';
import { LOGOS_BUCKET } from '@/features/company/data/getCurrentCompany';
import type { Database } from '@/lib/supabase/database.types';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { buildLegalMentions } from '../domain/legalMentions';
import type { QuoteStatus } from '../domain/types';
import type { QuoteDocumentView } from './documentView';
import { addDays, buildDocumentView } from './documentView';
import { isPublicTokenShape } from './publicToken';
import { parsePublicQuote, parseQuoteSnapshot } from './snapshot';
import type { PublicQuote, QuoteSnapshot } from './snapshot';

type Client = SupabaseClient<Database>;

function logoUrl(supabase: Client, path: string | null): string | null {
  return path ? supabase.storage.from(LOGOS_BUCKET).getPublicUrl(path).data.publicUrl : null;
}

function mentionsFor(snapshot: QuoteSnapshot): string[] {
  return buildLegalMentions({
    companyName: snapshot.company.name,
    siret: snapshot.company.siret,
    vatMode: snapshot.vatMode,
    validityDays: snapshot.validityDays,
  });
}

export interface ArtisanQuoteDocument {
  id: string;
  number: string;
  status: QuoteStatus;
  sentAt: string | null;
  lastSentAt: string | null;
  sentToEmail: string | null;
  clientEmail: string | null;
  view: QuoteDocumentView;
}

/**
 * Devis de l'artisan connecté, prêt à afficher : le snapshot figé s'il est envoyé,
 * sinon l'image calculée à l'instant (brouillon). null si introuvable (ou pas à lui : RLS).
 */
export async function getArtisanQuoteDocument(id: string): Promise<ArtisanQuoteDocument | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = await createSupabaseServerClient();
  const { data: quote, error } = await supabase
    .from('quotes')
    .select(
      'id, number, status, issue_date, validity_days, snapshot, sent_at, last_sent_at, sent_to_email, accepted_at, accepted_by_name',
    )
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(`Lecture du devis impossible (${error.code})`);
  if (!quote) return null;

  const isDraft = quote.status === 'draft';
  const raw = isDraft
    ? (await supabase.rpc('build_quote_snapshot', { p_quote_id: id })).data
    : quote.snapshot;
  const snapshot = parseQuoteSnapshot(raw);
  if (!snapshot) throw new Error('Devis illisible (snapshot invalide)');

  // Un brouillon n'a pas encore de date d'émission : on affiche celle du jour.
  const issueDate = isDraft ? new Date().toISOString().slice(0, 10) : quote.issue_date;
  return {
    id: quote.id,
    number: quote.number,
    status: quote.status,
    sentAt: quote.sent_at,
    lastSentAt: quote.last_sent_at,
    sentToEmail: quote.sent_to_email,
    clientEmail: snapshot.client.email,
    view: buildDocumentView(snapshot, {
      status: quote.status,
      issueDate,
      validUntil: addDays(issueDate, quote.validity_days),
      acceptedAt: quote.accepted_at,
      acceptedByName: quote.accepted_by_name,
      logoUrl: logoUrl(supabase, snapshot.company.logoPath),
      fallbackMentions: mentionsFor(snapshot),
    }),
  };
}

export interface PublicQuoteDocument {
  quote: PublicQuote;
  view: QuoteDocumentView;
  /** Le délai de validité est dépassé : acceptation impossible. */
  isExpired: boolean;
}

/** Devis vu par le client via son lien secret (sans compte). null si le lien ne correspond à rien. */
export async function getPublicQuoteDocument(token: string): Promise<PublicQuoteDocument | null> {
  if (!isPublicTokenShape(token)) return null;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('get_public_quote', { p_token: token });
  if (error) throw new Error(`Lecture du devis impossible (${error.code})`);
  const quote = parsePublicQuote(data);
  if (!quote) return null;

  const today = new Date().toISOString().slice(0, 10);
  return {
    quote,
    isExpired: quote.status === 'sent' && today > quote.validUntil,
    view: buildDocumentView(quote.snapshot, {
      status: quote.status,
      issueDate: quote.issueDate,
      validUntil: quote.validUntil,
      acceptedAt: quote.acceptedAt,
      acceptedByName: quote.acceptedByName,
      logoUrl: logoUrl(supabase, quote.snapshot.company.logoPath),
      fallbackMentions: mentionsFor(quote.snapshot),
    }),
  };
}
