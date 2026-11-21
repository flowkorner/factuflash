import type { NextRequest } from 'next/server';
import { getArtisanInvoiceDocument } from '@/features/invoices/data/invoices';
import { invoicePdfResponse, renderInvoicePdf } from '@/features/invoices/pdf/renderInvoicePdf';

/** PDF d'une facture pour l'artisan connecté (la RLS filtre les factures des autres). */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const invoice = await getArtisanInvoiceDocument(id);
  if (!invoice) return new Response('Facture introuvable', { status: 404 });
  return invoicePdfResponse(await renderInvoicePdf(invoice.view), invoice.number);
}
