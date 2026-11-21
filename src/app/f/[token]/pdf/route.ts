import type { NextRequest } from 'next/server';
import { getPublicInvoiceDocument } from '@/features/invoices/data/invoices';
import { invoicePdfResponse, renderInvoicePdf } from '@/features/invoices/pdf/renderInvoicePdf';

/** PDF d'une facture pour le client, via son lien secret. */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const result = await getPublicInvoiceDocument(token);
  if (result.kind === 'unavailable') {
    return new Response('Service momentanément indisponible, réessayez dans un instant.', {
      status: 503,
      headers: { 'Retry-After': '10' },
    });
  }
  if (result.kind === 'not_found') return new Response('Facture introuvable', { status: 404 });
  return invoicePdfResponse(await renderInvoicePdf(result.view), result.view.number);
}
