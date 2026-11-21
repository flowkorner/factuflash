/** Délai maximal d'un appel à Supabase : au-delà, on abandonne plutôt que de bloquer la page. */
export const SUPABASE_TIMEOUT_MS = 8000;

/**
 * `fetch` avec délai maximal (supabase-js n'en a pas : sans lui, une base injoignable peut
 * bloquer une page pendant près de 2 minutes). Respecte aussi le signal d'annulation de l'appelant.
 * Écrit sans AbortSignal.any pour fonctionner aussi dans le middleware (runtime Edge).
 */
export function fetchWithTimeout(timeoutMs: number = SUPABASE_TIMEOUT_MS): typeof fetch {
  return async (input, init) => {
    const controller = new AbortController();
    const timer = setTimeout(
      () => controller.abort(new Error(`Supabase n’a pas répondu en ${timeoutMs / 1000} s`)),
      timeoutMs,
    );
    const callerSignal = init?.signal;
    const onCallerAbort = () => controller.abort(callerSignal?.reason);
    if (callerSignal?.aborted) controller.abort(callerSignal.reason);
    callerSignal?.addEventListener('abort', onCallerAbort, { once: true });
    try {
      return await fetch(input, { ...init, signal: controller.signal });
    } finally {
      clearTimeout(timer);
      callerSignal?.removeEventListener('abort', onCallerAbort);
    }
  };
}
