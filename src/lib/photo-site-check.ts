/**
 * The network half of lib/photo-site.ts: places each visit address and
 * measures the phone's distance to it, like the automatic arrival.
 */
import { geocodeAddress } from '@/lib/geocode';
import { apiFetch } from '@/lib/api-fetch';
import { classifySite, haversineM, type PhotoSiteCheck, type SiteDistance, type SiteFix } from '@/lib/photo-site';

/** The upload never waits longer than this for the check. */
const CHECK_TIMEOUT_MS = 8000;

async function distanceTo(fix: SiteFix, adresse: string): Promise<SiteDistance> {
  const point = await geocodeAddress(adresse).catch(() => null);
  if (point) return { adresse, meters: haversineM(fix.lat, fix.lng, point.lat, point.lon), method: 'direct' };
  try {
    const res = await apiFetch('/api/arrival-distance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lat: fix.lat, lng: fix.lng, address: adresse }),
    });
    const data = res.ok ? await res.json() : null;
    return { adresse, meters: typeof data?.meters === 'number' ? data.meters : null, method: 'road' };
  } catch {
    return { adresse, meters: null, method: 'road' };
  }
}

/**
 * Compares the phone's position with the addresses of the visits the photos
 * belong to. Never throws, never waits more than CHECK_TIMEOUT_MS: a slow or
 * offline network gives « Lieu non vérifié », the position is still kept.
 */
export async function checkPhotoSite(fix: SiteFix | null, adresses: ReadonlyArray<string>): Promise<PhotoSiteCheck> {
  const list = [...new Set(adresses.map((a) => a.trim()).filter(Boolean))].slice(0, 3);
  if (!fix || list.length === 0) return classifySite(fix, [], list.length > 0);
  const timedOut = new Promise<SiteDistance[]>((resolve) =>
    setTimeout(() => resolve(list.map((adresse) => ({ adresse, meters: null, method: 'road' as const }))), CHECK_TIMEOUT_MS),
  );
  const distances = await Promise.race([Promise.all(list.map((a) => distanceTo(fix, a))), timedOut]);
  return classifySite(fix, distances, true);
}

