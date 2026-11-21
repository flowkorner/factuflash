import { createElement } from 'react';
import type { ReactElement } from 'react';
import { renderToBuffer } from '@react-pdf/renderer';
import type { DocumentProps } from '@react-pdf/renderer';
import { fetchLogo } from '@/features/quotes/pdf/renderQuotePdf';
import type { InvoiceDocumentView } from '../document/invoiceView';
import { InvoicePdf } from './InvoicePdf';

export async function renderInvoicePdf(view: InvoiceDocumentView): Promise<Buffer> {
  const logo = await fetchLogo(view.company.logoUrl);
  const element = createElement(InvoicePdf, {
    view,
    logo,
  }) as unknown as ReactElement<DocumentProps>;
  return renderToBuffer(element);
}

/** Réponse HTTP du PDF : téléchargement, jamais mis en cache. */
export function invoicePdfResponse(pdf: Buffer, number: string): Response {
  return new Response(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="Facture-${number.replace(/[^A-Za-z0-9-]/g, '')}.pdf"`,
      'Cache-Control': 'private, no-store',
      'X-Robots-Tag': 'noindex',
    },
  });
}
