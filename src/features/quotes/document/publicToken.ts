import { createHash, randomBytes } from 'node:crypto';

/**
 * Jeton du lien client : 32 octets aléatoires (256 bits) en base64url → 43 caractères.
 * Seule son empreinte SHA-256 est stockée en base (comme un mot de passe).
 */
export function createPublicToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString('base64url');
  return { token, hash: hashPublicToken(token) };
}

export function hashPublicToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

/** Forme attendue d'un jeton (évite d'interroger la base pour n'importe quoi). */
export function isPublicTokenShape(value: string): boolean {
  return /^[A-Za-z0-9_-]{43}$/.test(value);
}
