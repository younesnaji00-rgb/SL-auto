'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api-fetch';
import { logFrontend } from '@/lib/debug-log';
import type { FirmCity } from '@/lib/moroccan-address';

/** Drive from one of the firm's cities to the address, when Google routed it. */
export interface CityLeg {
  city: FirmCity;
  meters: number | null;
  seconds: number | null;
}

/** /api/check-address: is the address in Casablanca or Fès (owner ruling 2026-10-05)? */
export type AddressCheck =
  | { status: 'inside'; city: FirmCity; locality: string; formatted: string; legs: CityLeg[] }
  | { status: 'outside'; locality: string; abroad: boolean; formatted: string; legs: CityLeg[] }
  | { status: 'not-found'; formatted: string }
  | { status: 'unavailable' };

/** The latest answer per address, for the page's lifetime. A failed check is asked again. */
const answers = new Map<string, AddressCheck>();

const keyOf = (address: string) => address.trim().replace(/\s+/g, ' ').toLowerCase();

function parse(data: any): AddressCheck {
  const legs: CityLeg[] = Array.isArray(data?.legs) ? data.legs : [];
  const formatted = typeof data?.formatted === 'string' ? data.formatted : '';
  switch (data?.status) {
    case 'inside':
      return { status: 'inside', city: data.city, locality: data.locality ?? data.city, formatted, legs };
    case 'outside':
      return { status: 'outside', locality: data.locality ?? formatted, abroad: data.abroad === true, formatted, legs };
    case 'not-found':
      return { status: 'not-found', formatted };
    default:
      return { status: 'unavailable' };
  }
}

async function askServer(address: string, signal?: AbortSignal): Promise<AddressCheck> {
  let answer: AddressCheck;
  try {
    const res = await apiFetch('/api/check-address', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal,
      body: JSON.stringify({ address }),
    });
    answer = res.ok ? parse(await res.json()) : { status: 'unavailable' };
  } catch (err: any) {
    if (err?.name === 'AbortError') throw err;
    console.warn('[use-address-check] error:', err);
    answer = { status: 'unavailable' };
  }
  answers.set(keyOf(address), answer);
  logFrontend('use-address-check ← /api/check-address', { address, answer });
  return answer;
}

/** For the save: the known answer for this address, or a fresh one (a failed check is retried). */
export async function checkAddress(address: string): Promise<AddressCheck> {
  const known = answers.get(keyOf(address));
  if (known && known.status !== 'unavailable') return known;
  return askServer(address.trim());
}

/** The latest answer for an address, if it was checked (the form's validation rule reads it). */
export function knownAddressCheck(address: string): AddressCheck | null {
  return answers.get(keyOf(address)) ?? null;
}

/**
 * « Is this rendez-vous address in Casablanca or Fès? » while it is typed —
 * debounced like the feasibility check. The answer belongs to the address as
 * it stands, never to the text it was about before.
 */
export function useAddressCheck(adresse: string): AddressCheck | null {
  const key = keyOf(adresse);
  const active = key.length >= 3;
  // Bumped when an answer lands, to render it; the answer itself is read from
  // `answers`, where the save's own check may also have put a fresher one.
  const [, setAnswered] = useState(0);

  useEffect(() => {
    if (!active) return;
    const known = answers.get(key);
    if (known && known.status !== 'unavailable') return;
    const ctrl = new AbortController();
    const timer = setTimeout(() => {
      askServer(adresse.trim(), ctrl.signal)
        .then(() => {
          if (!ctrl.signal.aborted) setAnswered((n) => n + 1);
        })
        .catch(() => {
          /* aborted: the address changed */
        });
    }, 700);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
    // `adresse` is read through `key` (same text, normalised).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, key]);

  return active ? answers.get(key) ?? null : null;
}
