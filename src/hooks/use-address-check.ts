'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api-fetch';
import { logFrontend } from '@/lib/debug-log';

/** Drive from one of the accepted areas to the address, when Google routed it. */
export interface CityLeg {
  city: string;
  meters: number | null;
  seconds: number | null;
}

/**
 * /api/check-address: is the address in one of the accepted areas (the
 * admins' « Sites » list, owner ruling 2026-10-16)? `areas` is that list, for
 * the messages. `no-city`: the address names none of them — the city is
 * mandatory.
 */
export type AddressCheck =
  | { status: 'inside'; city: string; locality: string; formatted: string; legs: CityLeg[]; areas: string[] }
  | { status: 'outside'; locality: string; abroad: boolean; formatted: string; legs: CityLeg[]; areas: string[] }
  | { status: 'no-city'; areas: string[] }
  | { status: 'not-found'; formatted: string; areas: string[] }
  | { status: 'unavailable' };

/**
 * The latest answer per address. A refusal is asked again after a minute — an
 * admin may have added the area meanwhile — and a failed check every time.
 */
const answers = new Map<string, { answer: AddressCheck; at: number }>();
const REFUSAL_TTL_MS = 60_000;

const keyOf = (address: string) => address.trim().replace(/\s+/g, ' ').toLowerCase();

function fresh(key: string): AddressCheck | null {
  const hit = answers.get(key);
  if (!hit || hit.answer.status === 'unavailable') return null;
  if (hit.answer.status !== 'inside' && Date.now() - hit.at > REFUSAL_TTL_MS) return null;
  return hit.answer;
}

function parse(data: any): AddressCheck {
  const legs: CityLeg[] = Array.isArray(data?.legs) ? data.legs : [];
  const formatted = typeof data?.formatted === 'string' ? data.formatted : '';
  const areas: string[] = Array.isArray(data?.areas) ? data.areas.filter((a: unknown) => typeof a === 'string') : [];
  switch (data?.status) {
    case 'inside':
      return { status: 'inside', city: data.city, locality: data.locality ?? data.city, formatted, legs, areas };
    case 'outside':
      return { status: 'outside', locality: data.locality ?? formatted, abroad: data.abroad === true, formatted, legs, areas };
    case 'no-city':
      return { status: 'no-city', areas };
    case 'not-found':
      return { status: 'not-found', formatted, areas };
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
  answers.set(keyOf(address), { answer, at: Date.now() });
  logFrontend('use-address-check ← /api/check-address', { address, answer });
  return answer;
}

/** For the save: the known answer for this address, or a fresh one. */
export async function checkAddress(address: string): Promise<AddressCheck> {
  return fresh(keyOf(address)) ?? askServer(address.trim());
}

/** The latest answer for an address, if it was checked (the form's validation rule reads it). */
export function knownAddressCheck(address: string): AddressCheck | null {
  return answers.get(keyOf(address))?.answer ?? null;
}

/**
 * « Is this rendez-vous address in an accepted area? » while it is typed —
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
    if (fresh(key)) return;
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

  return active ? answers.get(key)?.answer ?? null : null;
}
