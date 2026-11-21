import { createElement } from 'react';
import { renderToBuffer } from '@react-pdf/renderer';
import type { DocumentProps } from '@react-pdf/renderer';
import type { ReactElement } from 'react';
import type { QuoteDocumentView } from '../document/documentView';
import { QuotePdf } from './QuotePdf';

/** Télécharge le logo (2 s max). Le PDF n'accepte que PNG et JPEG : un logo WebP est ignoré. */
export async function fetchLogo(
  url: string | null,
): Promise<{ data: Buffer; format: 'png' | 'jpg' } | null> {
  if (!url) return null;
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(2000) });
    if (!response.ok) return null;
    const type = response.headers.get('content-type') ?? '';
    const format = type.includes('png') ? 'png' : type.includes('jpeg') ? 'jpg' : null;
    if (!format) return null;
    return { data: Buffer.from(await response.arrayBuffer()), format };
  } catch {
    return null;
  }
}

export async function renderQuotePdf(view: QuoteDocumentView): Promise<Buffer> {
  const logo = await fetchLogo(view.company.logoUrl);
  const element = createElement(QuotePdf, { view, logo }) as unknown as ReactElement<DocumentProps>;
  return renderToBuffer(element);
}
