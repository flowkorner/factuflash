/**
 * N'accepte qu'un chemin interne ("/devis"), jamais une URL externe ("//site.com", "https://…").
 * Évite qu'un lien piégé redirige vers un autre site après connexion.
 */
export function getSafeRedirectPath(candidate: string | null, fallback: string): string {
  if (!candidate || !candidate.startsWith('/')) return fallback;
  if (candidate.startsWith('//') || candidate.startsWith('/\\')) return fallback;
  return candidate;
}
