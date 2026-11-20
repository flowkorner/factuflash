/** Les polices standard du PDF ne connaissent pas l'espace fine insécable (format français). */
export function pdfText(value: string): string {
  return value.replace(/[  ]/g, ' ');
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
