/**
 * The phone's latest position, as the app's own trackers received it — the
 * agent de terrain's live-location publisher (hooks/use-gps-publisher.ts) and
 * the automatic arrival (assignations-atg/mission-geofence-checkin.tsx).
 *
 * A photo used to ask the phone for a NEW position at the shutter, high
 * accuracy, 5 s at most. Without a recent satellite fix that ask timed out,
 * the photo carried no position at all, and « Par localisation » then showed
 * the visit's address as if the photo had been taken there (tester,
 * 2026-10-13). Those trackers keep a fix warm while the mission is open; a
 * photo uses it when it is recent enough to say where the shot was taken.
 */
export interface LastFix {
  lat: number;
  lng: number;
  /** Radius of uncertainty, metres. */
  accuracy?: number;
  /** When the device produced it, ms since epoch. */
  at: number;
}

let last: LastFix | null = null;

/** Called by every position watcher of the app. */
export function recordFix(lat: number, lng: number, accuracy?: number | null, at: number = Date.now()): void {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
  if (last && at < last.at) return;
  last = { lat, lng, ...(Number.isFinite(accuracy) ? { accuracy: accuracy as number } : {}), at };
}

/** The latest fix if it is at most `maxAgeMs` old, else null. */
export function freshFix(maxAgeMs: number, now: number = Date.now()): LastFix | null {
  if (!last || now - last.at > maxAgeMs || last.at - now > 60_000) return null;
  return last;
}

/** Tests only. */
export function resetLastFix(): void {
  last = null;
}
