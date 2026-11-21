import type { NextRequest } from 'next/server';
import { getPublicInvoiceDocument } from '@/features/invoices/data/invoices';
import { invoicePdfResponse, renderInvoicePdf } from '@/features/invoices/pdf/renderInvoicePdf';

/** PDF d'une facture pour le client, via son lien secret. */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const view = await getPublicInvoiceDocument(token);
  if (!view) return new Response('Facture introuvable', { status: 404 });
  return invoicePdfResponse(await renderInvoicePdf(view), view.number);
}
