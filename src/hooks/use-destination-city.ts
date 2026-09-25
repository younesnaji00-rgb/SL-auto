'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api-fetch';
import { logFrontend } from '@/lib/debug-log';

export interface DestinationCity {
  /** Where Google placed the address (« Bouskoura »). */
  locality: string;
  /** The account's sites the address lies in; empty = outside all of them. */
  insideSites: string[];
  /** Drive from the nearest site's city centre, when Google routed it. */
  nearest: { site: string; meters: number } | null;
}

type Leg = { site: string; meters: number | null };

/** Answers per « sites :: address », for the page's lifetime. */
const cache = new Map<string, DestinationCity | null>();

function nearestLeg(legs: Leg[] | undefined): DestinationCity['nearest'] {
  let best: DestinationCity['nearest'] = null;
  for (const l of legs ?? []) {
    if (typeof l?.meters !== 'number') continue;
    if (!best || l.meters < best.meters) best = { site: l.site, meters: l.meters };
  }
  return best;
}

/**
 * « Is this rendez-vous address in one of my cities? » for the planning form
 * (owner request 2026-09-25). Debounced like the feasibility check; null while
 * the address is short, the account has no site, or no answer exists for the
 * address as it stands — a warning never outlives the text it was about.
 */
export function useDestinationCity(adresse: string, sites: readonly string[]): DestinationCity | null {
  const address = adresse.trim();
  const sitesKey = sites.join('|');
  const key = `${sitesKey}::${address.toLowerCase()}`;
  const active = sitesKey !== '' && address.length >= 6;
  const [answer, setAnswer] = useState<{ key: string; value: DestinationCity | null } | null>(null);

  useEffect(() => {
    if (!active) return;
    if (cache.has(key)) {
      setAnswer({ key, value: cache.get(key) ?? null });
      return;
    }
    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await apiFetch('/api/destination-city', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: ctrl.signal,
          body: JSON.stringify({ address, sites: sitesKey.split('|') }),
        });
        if (!res.ok || ctrl.signal.aborted) return;
        const data = (await res.json()) as {
          result?: { locality: string; insideSites?: string[]; legs?: Leg[] } | null;
          error?: string;
        };
        const r = data?.result;
        const value: DestinationCity | null = r
          ? { locality: r.locality, insideSites: r.insideSites ?? [], nearest: nearestLeg(r.legs) }
          : null;
        // A failed check is asked again next time; an answer is kept.
        if (!data?.error) cache.set(key, value);
        logFrontend('use-destination-city ← /api/destination-city', { address, value });
        if (!ctrl.signal.aborted) setAnswer({ key, value });
      } catch (err: any) {
        if (err?.name !== 'AbortError') console.warn('[use-destination-city] error:', err);
      }
    }, 800);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [active, key, address, sitesKey]);

  return active && answer?.key === key ? answer.value : null;
}
