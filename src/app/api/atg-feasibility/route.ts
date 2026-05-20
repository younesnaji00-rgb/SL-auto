import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, authErrorResponse } from '@/lib/require-auth';

interface Stop {
  address: string;
  rdvISO: string;
}

interface LegResult {
  durationSeconds: number;
  status: string;
}

export async function POST(req: NextRequest) {
  try {
    await requireAuth(req);
    const raw = await req.text();
    if (!raw) {
      // Aborted-mid-flight requests from the debounced client hook can land
      // here with an empty body. Treat as a no-op rather than logging an error.
      return NextResponse.json({ legs: [] });
    }
    const { stops } = JSON.parse(raw) as { stops?: Stop[] };
    console.log('[atg-feasibility] received stops:', JSON.stringify(stops));

    if (!Array.isArray(stops) || stops.length < 2) {
      console.log('[atg-feasibility] short-circuit: fewer than 2 stops');
      return NextResponse.json({ legs: [] });
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      console.error('[atg-feasibility] GOOGLE_MAPS_API_KEY is not set in env');
      return NextResponse.json({ legs: [], error: 'unavailable' });
    }

    const cleaned = stops.map((s) => (s.address || '').trim());
    if (cleaned.some((a) => a.length === 0)) {
      console.error('[atg-feasibility] empty address in chain:', cleaned);
      return NextResponse.json({ legs: [], error: 'unavailable' });
    }

    const origins = cleaned.slice(0, -1).join('|');
    const destinations = cleaned.slice(1).join('|');

    // Departure time anchors traffic-aware durations. Use the RDV of the
    // first destination if it's in the future; otherwise omit (the Distance
    // Matrix API rejects past times for traffic mode).
    const firstDestMs = Date.parse(stops[1].rdvISO);
    const nowSec = Math.floor(Date.now() / 1000);
    const departureSec = Math.floor(firstDestMs / 1000);
    const useTraffic = Number.isFinite(departureSec) && departureSec > nowSec;

    const params = new URLSearchParams({
      origins,
      destinations,
      mode: 'driving',
      language: 'fr',
      region: 'ma',
      key: apiKey,
    });
    if (useTraffic) {
      params.set('departure_time', String(departureSec));
      params.set('traffic_model', 'best_guess');
    }

    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?${params.toString()}`;
    const res = await fetch(url);
    if (!res.ok) {
      const body = await res.text();
      console.error('[atg-feasibility] Google HTTP error', res.status, body);
      return NextResponse.json({ legs: [], error: 'unavailable' });
    }

    const data = await res.json();
    if (data.status !== 'OK' || !Array.isArray(data.rows)) {
      console.error('[atg-feasibility] Google API status', data.status, data.error_message ?? '(no message)');
      return NextResponse.json({ legs: [], error: 'unavailable' });
    }

    const legs: LegResult[] = [];
    for (let i = 0; i < stops.length - 1; i++) {
      const cell = data.rows?.[i]?.elements?.[i];
      if (!cell || cell.status !== 'OK') {
        legs.push({ durationSeconds: 0, status: cell?.status ?? 'NOT_FOUND' });
        continue;
      }
      const seconds: number = cell.duration_in_traffic?.value ?? cell.duration?.value ?? 0;
      legs.push({ durationSeconds: seconds, status: 'OK' });
    }

    return NextResponse.json({ legs });
  } catch (error: any) {
    const authResp = authErrorResponse(error);
    if (authResp) return authResp;
    console.error('[atg-feasibility] error:', error);
    return NextResponse.json({ legs: [], error: 'unavailable' });
  }
}
