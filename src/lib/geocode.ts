/**
 * Client-side geocoder for Moroccan addresses via Nominatim (OpenStreetMap).
 *
 * - localStorage cache (`geocode-cache-v1`), 30-day TTL for resolved entries,
 *   1-hour TTL for failures so transient errors retry later.
 * - Sequential module-level queue spacing requests >= 1100 ms apart
 *   (Nominatim usage policy). Cached hits bypass the queue entirely.
 * - In-flight de-duplication for identical (normalized) addresses.
 *
 * No React here; safe to import from anywhere. Returns null on the server.
 */

export interface GeoPoint {
  lat: number;
  lon: number;
}

interface CacheEntry {
  /** Resolved coordinates, or null when the address could not be geocoded. */
  v: GeoPoint | null;
  /** Epoch ms at write time. */
  ts: number;
  /** TTL in ms for this entry. */
  ttl: number;
}

type CacheMap = Record<string, CacheEntry>;

const CACHE_KEY = 'geocode-cache-v1';
const TTL_OK_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const TTL_FAIL_MS = 60 * 60 * 1000; // 1 hour
const MIN_INTERVAL_MS = 1100;

/** trim + lowercase + collapse whitespace */
function normalizeAddress(adresse: string): string {
  return adresse.trim().toLowerCase().replace(/\s+/g, ' ');
}

function readCacheMap(): CacheMap {
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as CacheMap;
    }
  } catch {
    // localStorage unavailable or corrupted cache — behave as a miss.
  }
  return {};
}

/** undefined = cache miss (or expired); null = cached "not geocodable". */
function readCache(key: string): GeoPoint | null | undefined {
  try {
    const map = readCacheMap();
    const entry = map[key];
    if (!entry || typeof entry.ts !== 'number' || typeof entry.ttl !== 'number') {
      return undefined;
    }
    if (Date.now() - entry.ts > entry.ttl) return undefined;
    if (
      entry.v &&
      typeof entry.v.lat === 'number' &&
      typeof entry.v.lon === 'number'
    ) {
      return { lat: entry.v.lat, lon: entry.v.lon };
    }
    return entry.v === null ? null : undefined;
  } catch {
    return undefined;
  }
}

function writeCache(key: string, value: GeoPoint | null, ttl: number): void {
  try {
    const map = readCacheMap();
    // Opportunistic pruning of expired entries to keep the blob small.
    const now = Date.now();
    for (const k of Object.keys(map)) {
      const e = map[k];
      if (!e || typeof e.ts !== 'number' || now - e.ts > e.ttl) delete map[k];
    }
    map[key] = { v: value, ts: now, ttl };
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(map));
  } catch {
    // Quota exceeded / private mode — cache is best-effort only.
  }
}

// ---------------------------------------------------------------------------
// Politeness queue: strictly sequential, >= MIN_INTERVAL_MS between requests.
// ---------------------------------------------------------------------------

let queueTail: Promise<unknown> = Promise.resolve();
let nextAllowedAt = 0;

function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const run = queueTail.then(async () => {
    const wait = nextAllowedAt - Date.now();
    if (wait > 0) {
      await new Promise<void>((resolve) => setTimeout(resolve, wait));
    }
    nextAllowedAt = Date.now() + MIN_INTERVAL_MS;
    return task();
  });
  // Keep the chain alive even if a task rejects.
  queueTail = run.catch(() => undefined);
  return run;
}

/** In-flight de-duplication: normalized address -> pending promise. */
const inFlight = new Map<string, Promise<GeoPoint | null>>();

async function fetchGeocode(normalized: string): Promise<GeoPoint | null> {
  try {
    const url =
      'https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=ma&q=' +
      encodeURIComponent(normalized);
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) {
      writeCache(normalized, null, TTL_FAIL_MS);
      return null;
    }
    const data: unknown = await res.json();
    const first = Array.isArray(data) ? (data[0] as unknown) : undefined;
    if (first && typeof first === 'object') {
      const lat = Number.parseFloat(String((first as { lat?: unknown }).lat));
      const lon = Number.parseFloat(String((first as { lon?: unknown }).lon));
      if (Number.isFinite(lat) && Number.isFinite(lon)) {
        const point: GeoPoint = { lat, lon };
        writeCache(normalized, point, TTL_OK_MS);
        return point;
      }
    }
    // Well-formed response but no usable result: a genuine "not found".
    writeCache(normalized, null, TTL_OK_MS);
    return null;
  } catch {
    // Network error — cache the failure briefly so we retry later.
    writeCache(normalized, null, TTL_FAIL_MS);
    return null;
  }
}

/**
 * Geocode a Moroccan address. Resolves to coordinates or null when the
 * address cannot be located (or on error). Never throws.
 */
export async function geocodeAddress(
  adresse: string
): Promise<GeoPoint | null> {
  if (typeof window === 'undefined') return null;
  const key = normalizeAddress(adresse);
  if (!key) return null;

  const cached = readCache(key);
  if (cached !== undefined) return cached;

  const pending = inFlight.get(key);
  if (pending) return pending;

  const promise = enqueue(() => fetchGeocode(key)).finally(() => {
    inFlight.delete(key);
  });
  inFlight.set(key, promise);
  return promise;
}
