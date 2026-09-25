import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, authErrorResponse } from '@/lib/require-auth';
import { anchorToMorocco, checkSites } from '@/lib/moroccan-address';

/**
 * Is a rendez-vous address inside the cities the account covers (its
 * « Sites » in Utilisateurs)? Drives « Destination hors de Casablanca /
 * hors de Fès » in the planning form (owner request 2026-09-25).
 *
 * Resolved with the Distance Matrix API — the only Maps API enabled on the
 * key, and the one the feasibility check routes with: one row per site
 * (« Casablanca, Maroc » → the address) returns Google's formatted
 * destination, whose locality is compared with the sites, and the drive from
 * each city.
 *
 * `result: null` = nothing to say (no site, address not found, or only the
 * country resolved); `error: 'unavailable'` = the check itself failed.
 */
export async function POST(req: NextRequest) {
  try {
    await requireAuth(req);
    const body = (await req.json().catch(() => null)) as { address?: unknown; sites?: unknown } | null;
    const address = typeof body?.address === 'string' ? body.address.trim() : '';
    const sites = Array.isArray(body?.sites)
      ? (body.sites as unknown[])
          .filter((s): s is string => typeof s === 'string' && s.trim() !== '')
          .map((s) => s.replace(/\|/g, ' ').trim().slice(0, 60))
          .slice(0, 5)
      : [];
    if (!address || address.length > 300 || sites.length === 0) {
      return NextResponse.json({ result: null });
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      console.error('[destination-city] GOOGLE_MAPS_API_KEY is not set in env');
      return NextResponse.json({ result: null, error: 'unavailable' });
    }

    const params = new URLSearchParams({
      origins: sites.map((s) => anchorToMorocco(s)).join('|'),
      destinations: anchorToMorocco(address),
      mode: 'driving',
      language: 'fr',
      region: 'ma',
      key: apiKey,
    });
    const res = await fetch(`https://maps.googleapis.com/maps/api/distancematrix/json?${params.toString()}`);
    if (!res.ok) {
      console.error('[destination-city] Google HTTP error', res.status);
      return NextResponse.json({ result: null, error: 'unavailable' });
    }
    const data = await res.json();
    if (data.status !== 'OK' || !Array.isArray(data.rows)) {
      console.error('[destination-city] Google API status', data.status, data.error_message ?? '(no message)');
      return NextResponse.json({ result: null, error: 'unavailable' });
    }

    const legs = sites.map((site, i) => {
      const cell = data.rows?.[i]?.elements?.[0];
      const ok = cell?.status === 'OK';
      return {
        site,
        meters: ok && typeof cell.distance?.value === 'number' ? cell.distance.value : null,
        seconds: ok && typeof cell.duration?.value === 'number' ? cell.duration.value : null,
      };
    });
    // Not routable from any site (NOT_FOUND / ZERO_RESULTS): Google did not
    // find the address — nothing to warn about.
    if (legs.every((l) => l.meters === null)) return NextResponse.json({ result: null });

    const formatted: string = typeof data.destination_addresses?.[0] === 'string' ? data.destination_addresses[0] : '';
    const check = checkSites(formatted, sites);
    if (!check) return NextResponse.json({ result: null });

    return NextResponse.json({
      result: { formatted, locality: check.locality, insideSites: check.insideSites, legs },
    });
  } catch (error: any) {
    const authResp = authErrorResponse(error);
    if (authResp) return authResp;
    console.error('[destination-city] error:', error?.message ?? 'unknown', error?.code ?? '');
    return NextResponse.json({ result: null, error: 'unavailable' });
  }
}
