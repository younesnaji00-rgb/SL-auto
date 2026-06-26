import { NextResponse, type NextRequest } from 'next/server';
import { requireAuth, authErrorResponse } from '@/lib/require-auth';

/**
 * Returns the caller's IP address, read from the proxy headers the front end
 * populates. The browser can't read its own public IP, so the single-session
 * claim (login + legacy claim) round-trips here to stamp the IP into the
 * `users/{uid}/session_meta/current` doc behind the "Session / Appareil" card.
 *
 * Advisory only — shown on an admin card; nothing security-critical keys off it.
 *
 * Portable across hosts (this app runs on both Firebase Hosting and a
 * self-hosted server):
 *   - Firebase Hosting → Cloud Functions/Run: Google's front end sets
 *     `x-forwarded-for`, APPENDING the observed client IP to the RIGHT, so the
 *     right-most entry is the trustworthy hop.
 *   - Self-hosted behind nginx/Caddy/etc.: the reverse proxy should forward
 *     `x-real-ip` and/or `x-forwarded-for` (e.g. nginx
 *     `proxy_set_header X-Real-IP $remote_addr;`).
 *   - Non-standard proxy: set the env var CLIENT_IP_HEADER to the header name
 *     your proxy uses (e.g. `CF-Connecting-IP`), checked first.
 * If none are present (e.g. local dev with no proxy), `ip` is null and the UI
 * shows "Inconnue".
 *
 * Auth-gated like the other /api routes (Bearer ID token via apiFetch).
 */

/** First non-empty, trimmed comma segment of a header value. */
function firstSegment(value: string | null): string | null {
  if (!value) return null;
  const seg = value.split(',')[0]?.trim();
  return seg || null;
}

function readClientIp(request: NextRequest): string | null {
  // 1. Operator-configured header (covers CDNs / custom proxies on either host).
  const customHeader = process.env.CLIENT_IP_HEADER;
  if (customHeader) {
    const fromCustom = firstSegment(request.headers.get(customHeader));
    if (fromCustom) return fromCustom;
  }

  // 2. `x-real-ip` — single value the platform/proxy sets; not client-forgeable
  //    through the proxy.
  const xRealIp = request.headers.get('x-real-ip')?.trim();
  if (xRealIp) return xRealIp;

  // 3. `x-forwarded-for` — "<client>, <proxy1>, …". Both Google's front end and
  //    a typical reverse proxy append the observed client to the RIGHT, so the
  //    right-most entry is the most trustworthy (the left-most is client-set
  //    and spoofable).
  const xff = (request.headers.get('x-forwarded-for') || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return xff[xff.length - 1] || null;
}

export async function GET(request: NextRequest) {
  try {
    await requireAuth(request);
    const ip = readClientIp(request);
    return NextResponse.json({ ip }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    const authResp = authErrorResponse(err);
    if (authResp) return authResp;
    console.error('[/api/client-ip] Error:', (err as any)?.message ?? 'unknown');
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }
}
