/**
 * Envoi du lien magique — SIMULÉ pour le ticket 1.
 * Sera remplacé par `supabase.auth.signInWithOtp({ email })` sans changer la signature.
 */
const SIMULATED_DELAY_MS = 600;

export async function sendMagicLink(email: string): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, SIMULATED_DELAY_MS));
  if (email.trim().length === 0) {
    throw new Error('Email manquant');
  }
}
