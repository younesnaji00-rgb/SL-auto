import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, authErrorResponse } from '@/lib/require-auth';
import {
  COORDS_RE,
  FIRM_CITIES,
  anchorToMorocco,
  firmCityNamedIn,
  pickFirmPlace,
  placeOfAddress,
  withFirmCity,
  type FirmCity,
} from '@/lib/moroccan-address';

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
 * The city need not be typed (owner 2026-10-15). An address naming neither
 * firm city is looked up as « address, Casablanca » and « address, Fès » in
 * the same request; the one Google places inside a firm city wins — the
 * account's site (`sites`) when both do — and `completed` gives the address
 * with that city written out, which the planification stores. When neither
 * lands in a firm city, the address is looked up as typed so the answer says
 * where Google put it.
 *
 * `status`: 'inside' (+ `city`, `completed`), 'outside' (+ where Google
 * placed it), 'not-found' (nothing closer than the country or the region), or
 * 'unavailable' when the check itself failed — the form then refuses to save
 * rather than let an unchecked address through.
 */

type Leg = { city: FirmCity; meters: number | null; seconds: number | null };

async function matrix(destinations: string[], apiKey: string): Promise<{ formatted: string[]; legs: Leg[][] } | null> {
  const params = new URLSearchParams({
    origins: FIRM_CITIES.map((c) => anchorToMorocco(c)).join('|'),
    destinations: destinations.map(anchorToMorocco).join('|'),
    mode: 'driving',
    language: 'fr',
    region: 'ma',
    key: apiKey,
  });
  const res = await fetch(`https://maps.googleapis.com/maps/api/distancematrix/json?${params.toString()}`);
  if (!res.ok) {
    console.error('[check-address] Google HTTP error', res.status);
    return null;
  }
  const data = await res.json();
  if (data.status !== 'OK' || !Array.isArray(data.rows)) {
    console.error('[check-address] Google API status', data.status, data.error_message ?? '(no message)');
    return null;
  }
  const formatted = destinations.map((_, j) => (typeof data.destination_addresses?.[j] === 'string' ? data.destination_addresses[j] : ''));
  // legs[j] = the drive from each firm city to destination j.
  const legs = destinations.map((_, j) =>
    FIRM_CITIES.map((city, i) => {
      const cell = data.rows?.[i]?.elements?.[j];
      const ok = cell?.status === 'OK';
      return {
        city,
        meters: ok && typeof cell.distance?.value === 'number' ? cell.distance.value : null,
        seconds: ok && typeof cell.duration?.value === 'number' ? cell.duration.value : null,
      };
    }),
  );
  return { formatted, legs };
}

export async function POST(req: NextRequest) {
  try {
    await requireAuth(req);
    const body = (await req.json().catch(() => null)) as { address?: unknown; sites?: unknown } | null;
    const address = typeof body?.address === 'string' ? body.address.trim() : '';
    if (!address || address.length > 300) return NextResponse.json({ status: 'not-found', formatted: '' });
    const sites = Array.isArray(body?.sites) ? body.sites.filter((s): s is string => typeof s === 'string').slice(0, 5) : [];

    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      console.error('[check-address] GOOGLE_MAPS_API_KEY is not set in env');
      return NextResponse.json({ status: 'unavailable' });
    }

    // No city typed: try it in each firm city.
    if (!COORDS_RE.test(address) && !firmCityNamedIn(address)) {
      const variants = FIRM_CITIES.map((city) => withFirmCity(address, city));
      const both = await matrix(variants, apiKey);
      if (!both) return NextResponse.json({ status: 'unavailable' });
      const candidates = FIRM_CITIES.map((city, j) => ({
        city,
        formatted: both.formatted[j],
        legs: both.legs[j],
        place: placeOfAddress(both.formatted[j]),
      }));
      const pick = pickFirmPlace(candidates, sites);
      if (pick && pick.place.status === 'inside') {
        return NextResponse.json({ ...pick.place, formatted: pick.formatted, legs: pick.legs, completed: withFirmCity(address, pick.place.city) });
      }
    }

    const one = await matrix([address], apiKey);
    if (!one) return NextResponse.json({ status: 'unavailable' });
    const formatted = one.formatted[0];
    const place = placeOfAddress(formatted);
    return NextResponse.json({
      ...place,
      formatted,
      legs: one.legs[0],
      ...(place.status === 'inside' ? { completed: withFirmCity(address, place.city) } : {}),
    });
  } catch (error: any) {
    const authResp = authErrorResponse(error);
    if (authResp) return authResp;
    console.error('[check-address] error:', error?.message ?? 'unknown', error?.code ?? '');
    return NextResponse.json({ status: 'unavailable' });
  }
}
