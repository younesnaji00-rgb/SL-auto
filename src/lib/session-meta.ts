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
