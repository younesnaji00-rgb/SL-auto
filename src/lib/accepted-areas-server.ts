import 'server-only';

import { adminDb } from '@/lib/firebase-admin';
import { DEFAULT_AREAS } from '@/lib/moroccan-address';

/**
 * The areas where a rendez-vous is accepted, as the admins list them on the
 * « Sites » page (`options_sites`, owner ruling 2026-10-16). Read with the
 * Admin SDK and kept 20 s per server instance, so an area just added counts
 * within seconds. An empty or unreadable list falls back to Casablanca and Fès
 * rather than refusing every address.
 */
const TTL_MS = 20_000;
let cache: { at: number; areas: string[] } | null = null;

export async function acceptedAreas(): Promise<string[]> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.areas;
  try {
    const snap = await adminDb().collection('options_sites').get();
    const areas = snap.docs
      .map((d) => d.data() as { label?: unknown; active?: unknown; order?: unknown })
      .filter((d) => d.active !== false)
      .sort((a, b) => Number(a.order ?? 0) - Number(b.order ?? 0))
      .map((d) => String(d.label ?? '').trim())
      .filter(Boolean);
    cache = { at: Date.now(), areas: areas.length > 0 ? areas : [...DEFAULT_AREAS] };
  } catch (err: any) {
    console.error('[accepted-areas] options_sites read failed:', err?.message ?? err);
    if (!cache) return [...DEFAULT_AREAS];
  }
  return cache!.areas;
}
