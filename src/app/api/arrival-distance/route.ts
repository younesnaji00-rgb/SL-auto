import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, authErrorResponse } from '@/lib/require-auth';
import { anchorToMorocco } from '@/lib/moroccan-address';

/**
 * Road distance from the agent's position to a mission address — the
 * fallback of the automatic arrival (assignations-atg/mission-geofence-
 * checkin.tsx) when Nominatim cannot place the address. Distance Matrix, as
 * the route checks use (the key has no Geocoding API).
 *
 * An address Google only resolves to a town (« Casablanca, Maroc ») answers
 * `meters: null`: its point is the town centre, and an agent passing there
 * must not be « arrived ».
 */
export async function POST(req: NextRequest) {
  try {
    await requireAuth(req);
    const body = (await req.json().catch(() => null)) as { lat?: unknown; lng?: unknown; address?: unknown } | null;
    const lat = Number(body?.lat);
    const lng = Number(body?.lng);
    const address = typeof body?.address === 'string' ? body.address.trim() : '';
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180 || !address || address.length > 300) {
      return NextResponse.json({ meters: null });
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      console.error('[arrival-distance] GOOGLE_MAPS_API_KEY is not set in env');
      return NextResponse.json({ meters: null, error: 'unavailable' });
    }

    const params = new URLSearchParams({
      origins: `${lat},${lng}`,
      destinations: anchorToMorocco(address),
      mode: 'driving',
      language: 'fr',
      region: 'ma',
      key: apiKey,
    });
    const res = await fetch(`https://maps.googleapis.com/maps/api/distancematrix/json?${params.toString()}`);
    if (!res.ok) {
      console.error('[arrival-distance] Google HTTP error', res.status);
      return NextResponse.json({ meters: null, error: 'unavailable' });
    }
    const data = await res.json();
    const cell = data?.rows?.[0]?.elements?.[0];
    if (data?.status !== 'OK' || cell?.status !== 'OK' || typeof cell?.distance?.value !== 'number') {
      return NextResponse.json({ meters: null });
    }
    const formatted: string = typeof data.destination_addresses?.[0] === 'string' ? data.destination_addresses[0] : '';
    if (formatted.split(',').filter((p) => p.trim()).length < 3) {
      return NextResponse.json({ meters: null, imprecise: true });
    }
    return NextResponse.json({ meters: cell.distance.value });
  } catch (error: any) {
    const authResp = authErrorResponse(error);
    if (authResp) return authResp;
    console.error('[arrival-distance] error:', error?.message ?? 'unknown', error?.code ?? '');
    return NextResponse.json({ meters: null, error: 'unavailable' });
  }
}
