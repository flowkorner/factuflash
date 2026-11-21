/** @jest-environment node */
import { fetchWithTimeout } from './fetchWithTimeout';

/** Faux serveur qui ne répond jamais, sauf annulation. */
function hangingFetch(_input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  return new Promise((_resolve, reject) => {
    init?.signal?.addEventListener('abort', () => reject(init.signal?.reason));
  });
}

describe('fetchWithTimeout', () => {
  const realFetch = global.fetch;
  afterEach(() => {
    global.fetch = realFetch;
  });

  it('abandonne au bout du délai au lieu de bloquer indéfiniment', async () => {
    global.fetch = jest.fn(hangingFetch);
    const start = Date.now();
    await expect(fetchWithTimeout(50)('https://supabase.test')).rejects.toThrow('n’a pas répondu');
    expect(Date.now() - start).toBeLessThan(1000);
  });

  it('respecte l’annulation demandée par l’appelant', async () => {
    global.fetch = jest.fn(hangingFetch);
    const controller = new AbortController();
    const pending = fetchWithTimeout(10_000)('https://supabase.test', {
      signal: controller.signal,
    });
    controller.abort(new Error('annulé'));
    await expect(pending).rejects.toThrow('annulé');
  });

  it('laisse passer une réponse normale', async () => {
    global.fetch = jest.fn(() => Promise.resolve(new Response('ok')));
    await expect((await fetchWithTimeout(1000)('https://supabase.test')).text()).resolves.toBe(
      'ok',
    );
  });
});
