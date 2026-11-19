'use client';

import { useCallback, useEffect, useState } from 'react';

export interface Countdown {
  /** Secondes restantes (0 = terminé). */
  remaining: number;
  start: (seconds: number) => void;
}

export function useCountdown(): Countdown {
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    if (endsAt === null) return undefined;
    const id = window.setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (current >= endsAt) setEndsAt(null);
    }, 1000);
    return () => window.clearInterval(id);
  }, [endsAt]);

  const start = useCallback((seconds: number) => {
    const current = Date.now();
    setNow(current);
    setEndsAt(current + seconds * 1000);
  }, []);

  const remaining = endsAt === null ? 0 : Math.max(0, Math.ceil((endsAt - now) / 1000));
  return { remaining, start };
}
