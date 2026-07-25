import { NextResponse, type NextRequest } from 'next/server';
import { BRAND } from '@/lib/brand';
import { requireAuth, authErrorResponse } from '@/lib/require-auth';

/**
 * Reverse-geocode a `(lat, lng)` pair into a human-readable address via the
 * public Nominatim service. Centralizes the call so callsites can swap to a
 * different provider later without touching UI code.
 *
 * Nominatim ToS requires a meaningful `User-Agent` and asks for caching/
 * throttling on the client side — we set `Cache-Control` (browser + CDN) and
 * `accept-language=fr` so results match the rest of the app.
 */
export async function GET(request: NextRequest) {
  try {
    await requireAuth(request);
    const { searchParams } = new URL(request.url);
    const lat = Number(searchParams.get('lat'));
    const lng = Number(searchParams.get('lng'));

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return NextResponse.json({ error: 'invalid coords' }, { status: 400 });
    }

    const upstream = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&accept-language=fr`,
      {
        headers: {
          'User-Agent': `${BRAND.id}-app/1.0 (${BRAND.companyEmail})`,
          Accept: 'application/json',
        },
      },
    );

    if (!upstream.ok) {
      return NextResponse.json({ error: 'reverse geocoding failed' }, { status: 502 });
    }

    const data = await upstream.json();
    const address = data?.address;
    if (!address) {
      return NextResponse.json({ error: 'reverse geocoding failed' }, { status: 502 });
    }

    const city =
      address.city || address.town || address.village || address.municipality || '';
    const neighbourhood =
      address.neighbourhood || address.suburb || address.quarter || '';
    const road =
      address.road || address.pedestrian || address.path || address.street || '';

    const parts = [city, neighbourhood, road].filter((p) => !!p);
    const formatted = parts.length > 0 ? parts.join(', ') : (data.display_name || '');

    return NextResponse.json(
      { formatted, display_name: data.display_name, address },
      {
        headers: {
          'Cache-Control': 'public, max-age=86400, s-maxage=86400',
        },
      },
    );
  } catch (err) {
    const authResp = authErrorResponse(err);
    if (authResp) return authResp;
    console.error('[/api/reverse-geocode] Error:', (err as any)?.message ?? 'unknown', (err as any)?.code ?? '');
    return NextResponse.json({ error: 'reverse geocoding failed' }, { status: 502 });
  }
}
