import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, authErrorResponse } from '@/lib/require-auth';
import { COORDS_RE, anchorToMorocco, areaNamedIn, cityNamedIn, placeOfAddress } from '@/lib/moroccan-address';
import { acceptedAreas } from '@/lib/accepted-areas-server';

/**
 * Is a rendez-vous address in one of the accepted areas? The admins list them
 * on the « Sites » page (owner ruling 2026-10-16 — Casablanca, Fès, and the
 * outskirts they add, Mohammedia…); any other place is invalid and a
 * planification is never saved with it (modal-planification asks here before
 * every save).
 *
 * The city is mandatory (owner 2026-10-16): an address naming no accepted
 * area is answered at once — 'no-city', or 'outside' when it names another
 * city of Morocco — without asking Google.
 *
 * Otherwise resolved with the Distance Matrix API — the only Maps API enabled
 * on the key: one row per accepted area to the address returns Google's
 * formatted destination and the drive from each area. A town in Google's
 * answer decides by its name; a quartier or a prefecture by its drive from the
 * area typed (lib/moroccan-address.ts placeOfAddress).
 *
 * `status`: 'inside' (+ `city`), 'outside' (+ where it lies), 'no-city',
 * 'not-found' (nothing closer than the country or the region), or
 * 'unavailable' when the check itself failed — the form then refuses to save
 * rather than let an unchecked address through. Every answer carries `areas`.
 */
export async function POST(req: NextRequest) {
  try {
    await requireAuth(req);
    const body = (await req.json().catch(() => null)) as { address?: unknown } | null;
    const address = typeof body?.address === 'string' ? body.address.trim() : '';
    const areas = await acceptedAreas();
    if (!address || address.length > 300) return NextResponse.json({ status: 'not-found', formatted: '', areas });

    if (!COORDS_RE.test(address) && !areaNamedIn(address, areas)) {
      const other = cityNamedIn(address);
      return NextResponse.json(
        other
          ? { status: 'outside', locality: other, abroad: false, formatted: '', legs: [], areas }
          : { status: 'no-city', areas },
      );
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      console.error('[check-address] GOOGLE_MAPS_API_KEY is not set in env');
      return NextResponse.json({ status: 'unavailable', areas });
    }

    // Distance Matrix: at most 25 origins per request.
    const origins = areas.slice(0, 25);
    const params = new URLSearchParams({
      origins: origins.map((a) => anchorToMorocco(a)).join('|'),
      destinations: anchorToMorocco(address),
      mode: 'driving',
      language: 'fr',
      region: 'ma',
      key: apiKey,
    });
    const res = await fetch(`https://maps.googleapis.com/maps/api/distancematrix/json?${params.toString()}`);
    if (!res.ok) {
      console.error('[check-address] Google HTTP error', res.status);
      return NextResponse.json({ status: 'unavailable', areas });
    }
    const data = await res.json();
    if (data.status !== 'OK' || !Array.isArray(data.rows)) {
      console.error('[check-address] Google API status', data.status, data.error_message ?? '(no message)');
      return NextResponse.json({ status: 'unavailable', areas });
    }

    const formatted: string = typeof data.destination_addresses?.[0] === 'string' ? data.destination_addresses[0] : '';
    const legs = origins.map((city, i) => {
      const cell = data.rows?.[i]?.elements?.[0];
      const ok = cell?.status === 'OK';
      return {
        city,
        meters: ok && typeof cell.distance?.value === 'number' ? cell.distance.value : null,
        seconds: ok && typeof cell.duration?.value === 'number' ? cell.duration.value : null,
      };
    });

    // The area typed and the drives decide when Google answers with a quartier
    // or a prefecture rather than the city (« anfa, casablanca »).
    const named = COORDS_RE.test(address) ? null : areaNamedIn(address, areas);
    return NextResponse.json({ ...placeOfAddress(formatted, areas, { named, legs }), formatted, legs, areas });
  } catch (error: any) {
    const authResp = authErrorResponse(error);
    if (authResp) return authResp;
    console.error('[check-address] error:', error?.message ?? 'unknown', error?.code ?? '');
    return NextResponse.json({ status: 'unavailable' });
  }
}
