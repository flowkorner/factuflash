/** @jest-environment node */
import { renderToBuffer } from '@react-pdf/renderer';
import { sampleView } from '@/test/quoteFixtures';
import { renderQuotePdf } from './renderQuotePdf';

// @react-pdf est un module ES que Jest ne charge pas : on le simule ici,
// le vrai rendu est vérifié en téléchargeant le PDF depuis l'application lancée.
jest.mock('@react-pdf/renderer', () => ({
  renderToBuffer: jest.fn(() => Promise.resolve(Buffer.from('%PDF-'))),
  StyleSheet: { create: <T>(styles: T): T => styles },
  Document: 'Document',
  Page: 'Page',
  View: 'View',
  Text: 'Text',
  Image: 'Image',
}));

const fetchMock = jest.fn();
global.fetch = fetchMock;

function logoPassedToPdf(): unknown {
  const element: unknown = jest.mocked(renderToBuffer).mock.calls.at(-1)?.[0];
  if (typeof element !== 'object' || element === null || !('props' in element)) return undefined;
  const props: unknown = element.props;
  return typeof props === 'object' && props !== null && 'logo' in props ? props.logo : undefined;
}

describe('renderQuotePdf', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    jest.mocked(renderToBuffer).mockClear();
  });

  it('intègre un logo PNG', async () => {
    fetchMock.mockResolvedValue(
      new Response(Buffer.from('png'), { headers: { 'content-type': 'image/png' } }),
    );

    await renderQuotePdf(sampleView({ logoUrl: 'https://cdn.test/logo.png' }));

    expect(logoPassedToPdf()).toEqual({ data: Buffer.from('png'), format: 'png' });
  });

  it('ignore un logo WebP (non supporté par le PDF) au lieu d’échouer', async () => {
    fetchMock.mockResolvedValue(
      new Response(Buffer.from('webp'), { headers: { 'content-type': 'image/webp' } }),
    );

    await expect(
      renderQuotePdf(sampleView({ logoUrl: 'https://cdn.test/logo.webp' })),
    ).resolves.toBeInstanceOf(Buffer);
    expect(logoPassedToPdf()).toBeNull();
  });

  it('produit le PDF même si le logo est injoignable', async () => {
    fetchMock.mockRejectedValue(new Error('timeout'));

    await renderQuotePdf(sampleView({ logoUrl: 'https://cdn.test/logo.png' }));

    expect(logoPassedToPdf()).toBeNull();
  });
});
