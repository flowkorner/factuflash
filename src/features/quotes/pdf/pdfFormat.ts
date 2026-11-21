/**
 * Les polices standard du PDF ne connaissent ni les espaces insécables du format français
 * (U+202F, U+00A0) ni le signe moins typographique (U+2212) : on les remplace.
 */
export function pdfText(value: string): string {
  return value.replace(/[\u202f\u00a0]/g, ' ').replace(/\u2212/g, '-');
}

/** Réponse HTTP d'un PDF : téléchargement, jamais mis en cache (contenu personnel). */
export function pdfResponse(pdf: Buffer, number: string): Response {
  return new Response(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="Devis-${number.replace(/[^A-Za-z0-9-]/g, '')}.pdf"`,
      'Cache-Control': 'private, no-store',
      'X-Robots-Tag': 'noindex',
    },
  });
}
