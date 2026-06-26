'use client';

import { apiFetch } from './api-fetch';

/**
 * Metadata captured when a single-session device claims the session, surfaced
 * on the admin "Session / Appareil" card so an admin can see WHO is currently
 * connected (which device + from which IP) before force-disconnecting.
 */
export interface SessionMeta {
  /** Friendly "Navigateur sur OS" label, e.g. "Chrome sur Windows". */
  device: string;
  /** Public IP as seen by the server, or null when undeterminable. */
  ip: string | null;
}

/**
 * Best-effort "Navigateur sur OS" label parsed from a User-Agent string. Kept
 * deliberately coarse — enough for an admin to recognise the device, not a
 * full UA parser. Order matters: Edge/Opera UAs also contain "Chrome", and
 * Chrome UAs also contain "Safari".
 */
export function parseDeviceLabel(ua: string | undefined | null): string {
  if (!ua) return 'Appareil inconnu';

  let os = '';
  if (/iPhone/i.test(ua)) os = 'iPhone';
  else if (/iPad/i.test(ua)) os = 'iPad';
  else if (/Android/i.test(ua)) os = 'Android';
  else if (/Windows/i.test(ua)) os = 'Windows';
  else if (/Mac OS X|Macintosh/i.test(ua)) os = 'macOS';
  else if (/CrOS/i.test(ua)) os = 'ChromeOS';
  else if (/Linux/i.test(ua)) os = 'Linux';

  let browser = '';
  if (/Edg(?:e|A|iOS)?\//i.test(ua)) browser = 'Edge';
  else if (/OPR\/|Opera/i.test(ua)) browser = 'Opera';
  else if (/SamsungBrowser\//i.test(ua)) browser = 'Samsung Internet';
  else if (/CriOS\//i.test(ua)) browser = 'Chrome'; // Chrome on iOS (WebKit) — no Chrome/ token
  else if (/Chrome\//i.test(ua) && !/Chromium/i.test(ua)) browser = 'Chrome';
  else if (/Chromium\//i.test(ua)) browser = 'Chromium';
  else if (/Firefox\/|FxiOS\//i.test(ua)) browser = 'Firefox';
  else if (/Safari\//i.test(ua)) browser = 'Safari';

  if (browser && os) return `${browser} sur ${os}`;
  return browser || os || 'Appareil inconnu';
}

/** Device label for the current browser (sync; safe to call on the server). */
export function getDeviceLabel(): string {
  if (typeof navigator === 'undefined') return 'Appareil inconnu';
  return parseDeviceLabel(navigator.userAgent);
}

/**
 * Round-trips to /api/client-ip for the caller's public IP. Best-effort: any
 * failure resolves to null so it can never block a login / session claim.
 */
export async function fetchClientIp(): Promise<string | null> {
  try {
    // Bound the call so a slow/hung endpoint can never stall the login it sits
    // in front of. AbortController (not AbortSignal.timeout) for broad support.
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    try {
      const res = await apiFetch('/api/client-ip', { cache: 'no-store', signal: controller.signal });
      if (!res.ok) return null;
      const data = await res.json();
      return typeof data?.ip === 'string' && data.ip ? data.ip : null;
    } finally {
      clearTimeout(timer);
    }
  } catch {
    return null;
  }
}

/** Capture device label (sync) + public IP (server round-trip, best-effort). */
export async function collectSessionMeta(): Promise<SessionMeta> {
  const device = getDeviceLabel();
  const ip = await fetchClientIp();
  return { device, ip };
}

// ---------------------------------------------------------------------------
// Single-session liveness (self-healing BLOCK model)
// ---------------------------------------------------------------------------
// The original BLOCK model held `currentSessionId` on the user doc forever and
// only released it on a clean sign-out or an admin force-disconnect. A field
// agent who closes/kills the app, drops network mid-session, or clears storage
// never runs a clean release, so the id is STRANDED — and because a fresh
// login never matches an orphaned id, the user is locked out permanently even
// though nobody is actually connected. Admin force-disconnect was an unreliable
// escape hatch: under the force-long-polling connection the clearing write can
// sit in the local queue and never reach the server the next login reads.
//
// Fix: the device that holds the session refreshes `currentSessionSeenAt` on a
// cadence (SESSION_HEARTBEAT_MS, in src/hooks/use-current-user.tsx) while the
// app is open. A login may take over any session whose heartbeat is older than
// STALE_SESSION_MS (holder is gone) or absent entirely (a legacy/orphaned claim
// with no heartbeat). A genuinely active second device keeps a fresh heartbeat
// and is still blocked, so the single-session intent is preserved — but a dead
// session can never lock a user out for more than STALE_SESSION_MS, with or
// without admin intervention.

/**
 * A session whose last heartbeat is older than this is treated as abandoned and
 * may be claimed by a new login. Must comfortably exceed the heartbeat cadence
 * (SESSION_HEARTBEAT_MS) so a live foreground device — which also beats on
 * focus/visibility — is never mistaken for dead. 2.5 min ≈ two missed 60 s beats.
 */
export const STALE_SESSION_MS = 150_000;

/**
 * Coerce a Firestore `currentSessionSeenAt` field (Timestamp | Date | {seconds})
 * into epoch millis, or null when absent/unparseable.
 */
export function timestampToMillis(ts: unknown): number | null {
  if (!ts) return null;
  const anyTs = ts as { toMillis?: () => number; seconds?: number };
  if (typeof anyTs.toMillis === 'function') return anyTs.toMillis();
  if (typeof anyTs.seconds === 'number') return anyTs.seconds * 1000;
  if (ts instanceof Date) return ts.getTime();
  return null;
}

/**
 * Decide whether a fresh login may CLAIM the single-session slot.
 *
 * @param remoteSessionId currentSessionId on the user doc (server truth)
 * @param lastSeenMs      currentSessionSeenAt as epoch millis, or null if absent
 * @param priorLocalId    this tab's existing session id (same-device re-login)
 * @param nowMs           client clock (Date.now())
 */
export function isSessionClaimable(
  remoteSessionId: string | null | undefined,
  lastSeenMs: number | null,
  priorLocalId: string | null,
  nowMs: number,
): boolean {
  if (!remoteSessionId) return true; // slot free
  if (priorLocalId && remoteSessionId === priorLocalId) return true; // same device re-claims
  if (lastSeenMs == null) return true; // legacy/orphaned claim, no heartbeat → abandoned
  return nowMs - lastSeenMs > STALE_SESSION_MS; // holder went silent → abandoned
}

/** True when a held session's heartbeat is stale (holder presumed gone). */
export function isSessionStale(lastSeenMs: number | null, nowMs: number): boolean {
  if (lastSeenMs == null) return true;
  return nowMs - lastSeenMs > STALE_SESSION_MS;
}
