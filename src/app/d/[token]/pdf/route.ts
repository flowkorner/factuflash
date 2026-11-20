import type { NextRequest } from 'next/server';
import { getPublicQuoteDocument } from '@/features/quotes/document/quoteDocuments';
import { pdfResponse } from '@/features/quotes/pdf/pdfFormat';
import { renderQuotePdf } from '@/features/quotes/pdf/renderQuotePdf';

/** PDF du devis pour le client, via son lien secret. */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const document = await getPublicQuoteDocument(token);
  if (!document) return new Response('Devis introuvable', { status: 404 });
  return pdfResponse(await renderQuotePdf(document.view), document.view.number);
}
