import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, authErrorResponse } from '@/lib/require-auth';
import { FIRM_CITIES, anchorToMorocco, placeOfAddress } from '@/lib/moroccan-address';

/**
 * Is a rendez-vous address in Casablanca or Fès? (owner ruling 2026-10-05:
 * the firm works in those two cities only; any other city or country is
 * invalid, and a planification is never saved with it — modal-planification
 * asks here before every save.)
 *
 * Resolved with the Distance Matrix API — the only Maps API enabled on the
 * key, and the one the feasibility check routes with: one row per firm city
 * (« Casablanca, Maroc », « Fès, Maroc ») to the address returns Google's
 * formatted destination, whose locality decides (lib/moroccan-address.ts
 * placeOfAddress), and the drive from each city.
 *
 * `status`: 'inside' (+ `city`), 'outside' (+ where Google placed it),
 * 'not-found' (nothing closer than the country or the region), or
 * 'unavailable' when the check itself failed — the form then refuses to save
 * rather than let an unchecked address through.
 */
export async function POST(req: NextRequest) {
  try {
    await requireAuth(req);
    const body = (await req.json().catch(() => null)) as { address?: unknown } | null;
    const address = typeof body?.address === 'string' ? body.address.trim() : '';
    if (!address || address.length > 300) return NextResponse.json({ status: 'not-found', formatted: '' });

    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      console.error('[check-address] GOOGLE_MAPS_API_KEY is not set in env');
      return NextResponse.json({ status: 'unavailable' });
    }

    const params = new URLSearchParams({
      origins: FIRM_CITIES.map((c) => anchorToMorocco(c)).join('|'),
      destinations: anchorToMorocco(address),
      mode: 'driving',
      language: 'fr',
      region: 'ma',
      key: apiKey,
    });
    const res = await fetch(`https://maps.googleapis.com/maps/api/distancematrix/json?${params.toString()}`);
    if (!res.ok) {
      console.error('[check-address] Google HTTP error', res.status);
      return NextResponse.json({ status: 'unavailable' });
    }
    const data = await res.json();
    if (data.status !== 'OK' || !Array.isArray(data.rows)) {
      console.error('[check-address] Google API status', data.status, data.error_message ?? '(no message)');
      return NextResponse.json({ status: 'unavailable' });
    }

    // Google's address for the destination — empty when it found nothing.
    const formatted: string = typeof data.destination_addresses?.[0] === 'string' ? data.destination_addresses[0] : '';
    const legs = FIRM_CITIES.map((city, i) => {
      const cell = data.rows?.[i]?.elements?.[0];
      const ok = cell?.status === 'OK';
      return {
        city,
        meters: ok && typeof cell.distance?.value === 'number' ? cell.distance.value : null,
        seconds: ok && typeof cell.duration?.value === 'number' ? cell.duration.value : null,
      };
    });

    return NextResponse.json({ ...placeOfAddress(formatted), formatted, legs });
  } catch (error: any) {
    const authResp = authErrorResponse(error);
    if (authResp) return authResp;
    console.error('[check-address] error:', error?.message ?? 'unknown', error?.code ?? '');
    return NextResponse.json({ status: 'unavailable' });
  }
}
