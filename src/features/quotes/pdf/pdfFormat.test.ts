/** @jest-environment node */
import { pdfResponse, pdfText } from './pdfFormat';

// Le rendu PDF lui-même (@react-pdf, module ES uniquement) est vérifié en conditions réelles
// en téléchargeant le PDF depuis l'application lancée.
describe('PDF du devis', () => {
  it('remplace les caractères inconnus des polices PDF standard', () => {
    expect(pdfText('1\u202f200,00\u00a0€')).toBe('1 200,00 €');
    expect(pdfText('\u2212 188,40 €')).toBe('- 188,40 €');
  });

  it('se télécharge sans cache ni indexation, avec un nom de fichier propre', () => {
    const response = pdfResponse(Buffer.from('%PDF-'), 'D-2026-001"; x');
    expect(response.headers.get('Content-Type')).toBe('application/pdf');
    expect(response.headers.get('Content-Disposition')).toBe(
      'attachment; filename="Devis-D-2026-001x.pdf"',
    );
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
  });
});
