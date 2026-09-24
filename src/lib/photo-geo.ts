/**
 * Where a photo was taken — one answer for every upload path (QA bug 021).
 *
 * Order of truth:
 *  1. the file's own EXIF GPS (a phone photo imported later still knows
 *     where it was shot — this is the only source that survives a desktop
 *     import);
 *  2. the device's live position, when the caller says the file was just
 *     captured here (camera capture goes through a canvas, which strips
 *     EXIF, so the shot itself carries nothing);
 *  3. nothing — the photo lands in « Sans localisation ».
 *
 * The label comes from `/api/reverse-geocode` (« ville, quartier, rue »),
 * cached per rounded coordinate for the life of the page so a batch of
 * thirty photos from one spot costs one lookup. Grouping keys are built by
 * `photoLocationBucket`, which clusters on ~100 m so AT captures and
 * gestionnaire imports of the same place fall in the same group.
 */
import { readExifGps } from '@/lib/exif-gps';
import { getCurrentGeo } from '@/lib/photo-watermark';
import { apiFetch } from '@/lib/api-fetch';

export interface PhotoGeo {
  lat: number;
  lng: number;
  /** Human label from reverse geocoding, when the lookup succeeded. */
  location?: string;
}

const labelCache = new Map<string, Promise<string | null>>();

/** Rounded « lat,lng » — ~100 m cells, the unit of the label cache and of grouping. */
export function geoCellKey(lat: number, lng: number): string {
  return `${lat.toFixed(3)},${lng.toFixed(3)}`;
}

/** Reverse-geocoded label for a point, memoised per cell; null when unavailable. */
export function labelForGeo(lat: number, lng: number): Promise<string | null> {
  const key = geoCellKey(lat, lng);
  let p = labelCache.get(key);
  if (!p) {
    p = (async () => {
      try {
        const res = await apiFetch(`/api/reverse-geocode?lat=${lat}&lng=${lng}`);
        const data = res.ok ? await res.json() : null;
        return typeof data?.formatted === 'string' && data.formatted ? (data.formatted as string) : null;
      } catch {
        return null;
      }
    })();
    labelCache.set(key, p);
  }
  return p;
}

/**
 * Resolve a photo's position + label. `liveFallback` = the file was captured
 * on this device just now (camera), so the device position is a fair proxy
 * when the file carries no EXIF. Never throws.
 */
export async function resolvePhotoGeo(
  file: Blob,
  opts: { liveFallback?: boolean; live?: { lat: number; lng: number } | null } = {},
): Promise<PhotoGeo | null> {
  let point: { lat: number; lng: number } | null = null;
  try {
    point = await readExifGps(file);
  } catch {
    point = null;
  }
  if (!point && opts.liveFallback) {
    point = opts.live ?? (await getCurrentGeo().catch(() => null));
  }
  if (!point || !Number.isFinite(point.lat) || !Number.isFinite(point.lng)) return null;
  const location = await labelForGeo(point.lat, point.lng);
  return { lat: point.lat, lng: point.lng, ...(location ? { location } : {}) };
}

/** The Firestore fields to spread on a photo document. */
export function photoGeoFields(geo: PhotoGeo | null): { lat?: number; lng?: number; location?: string } {
  if (!geo) return {};
  return { lat: geo.lat, lng: geo.lng, ...(geo.location ? { location: geo.location } : {}) };
}

/**
 * Group key + display label for « Par localisation ». Coordinates win (a
 * ~100 m cell), with the reverse-geocoded text as the label; a text-only
 * photo groups by its text; anything else is « Sans localisation » (the
 * caller supplies the translated label).
 */
export function photoLocationBucket(
  photo: { lat?: unknown; lng?: unknown; location?: unknown },
  unknownLabel: string,
): { key: string; label: string } {
  const txt = typeof photo.location === 'string' ? photo.location.trim() : '';
  const lat = typeof photo.lat === 'number' ? photo.lat : Number(photo.lat);
  const lng = typeof photo.lng === 'number' ? photo.lng : Number(photo.lng);
  if (Number.isFinite(lat) && Number.isFinite(lng) && !(lat === 0 && lng === 0)) {
    return { key: `c:${geoCellKey(lat, lng)}`, label: txt || `${lat.toFixed(4)}, ${lng.toFixed(4)}` };
  }
  if (txt) return { key: `t:${txt.toLowerCase()}`, label: txt };
  return { key: '__unknown__', label: unknownLabel };
}
