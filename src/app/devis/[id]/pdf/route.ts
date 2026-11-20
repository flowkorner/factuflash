import type { NextRequest } from 'next/server';
import { getArtisanQuoteDocument } from '@/features/quotes/document/quoteDocuments';
import { pdfResponse } from '@/features/quotes/pdf/pdfFormat';
import { renderQuotePdf } from '@/features/quotes/pdf/renderQuotePdf';

/** PDF du devis pour l'artisan connecté (brouillon compris). La RLS filtre les devis des autres. */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const document = await getArtisanQuoteDocument(id);
  if (!document) return new Response('Devis introuvable', { status: 404 });
  return pdfResponse(await renderQuotePdf(document.view), document.number);
}
