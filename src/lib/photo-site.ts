/**
 * Was a terrain photo taken at the visit? (tester, 2026-10-13)
 *
 * The photos showed the address of the planification whatever the phone's
 * real position: a photo with no GPS fell back to « adresse du RDV », and
 * nothing compared the phone with the visit. Taking photos away from the
 * address stays allowed while the app is being tested; each photo records
 * where the agent's phone was and says, on the photo and in the app, whether
 * that was at the visit:
 *   - « Sur place »: within reach of a visit address of its phase;
 *   - « Hors site »: clearly away from every one of them;
 *   - « Lieu non vérifié »: no position, a position too vague to tell, or an
 *     address no map service can place.
 *
 * Distances are resolved like the automatic arrival
 * (assignations-atg/mission-geofence-checkin.tsx), with the same radii: the
 * address placed by Nominatim → straight line, else the road distance Google
 * computes from the phone to the address (/api/arrival-distance).
 *
 * Pure rules and wording here; the network part is lib/photo-site-check.ts.
 */
import { startOfDay } from 'date-fns';
import { toDate } from '@/lib/dossier-steps';

/** Straight-line reach of an address, as for the automatic arrival. */
export const SITE_RADIUS_M = 150;
/** Road-distance reach, when the address can only be routed to. */
export const SITE_ROAD_RADIUS_M = 250;
/** A fix vaguer than this cannot put the phone on site. */
export const SITE_MAX_ACCURACY_M = 150;

export type PhotoSiteStatus = 'sur_place' | 'hors_site' | 'non_verifie';
export type PhotoSiteReason = 'no_position' | 'imprecise' | 'address_unknown' | 'no_visit';

/** Stored on the photo document as `siteCheck`. */
export interface PhotoSiteCheck {
  status: PhotoSiteStatus;
  /** The phone's position when the photo was taken. */
  lat?: number;
  lng?: number;
  /** Its accuracy, metres. */
  accuracyM?: number;
  /** Distance to the nearest visit address, metres. */
  distanceM?: number;
  /** Straight line (address placed on the map) or road distance. */
  method?: 'direct' | 'road';
  /** The visit address it was compared with. */
  adresse?: string;
  /** Why the place could not be verified. */
  reason?: PhotoSiteReason;
}

export interface SiteFix {
  lat: number;
  lng: number;
  accuracy?: number;
}

export interface SiteDistance {
  adresse: string;
  meters: number | null;
  method: 'direct' | 'road';
}

/**
 * The addresses a photo of the phase may be taken at: the live visits of the
 * phase whose day has come (a re-planned visit keeps its old RDV too), else —
 * photos taken before the RDV day — every live visit of the phase.
 */
export function visitAddressesForPhotos(
  plans: ReadonlyArray<{ adresse?: unknown; dateRDV?: unknown; active?: unknown }>,
  now: Date,
): string[] {
  const live = plans.filter((p) => p?.active !== false && typeof p?.adresse === 'string' && p.adresse.trim());
  const due = live.filter((p) => {
    const rdv = toDate(p.dateRDV);
    return !rdv || startOfDay(rdv) <= now;
  });
  return [...new Set((due.length > 0 ? due : live).map((p) => String(p.adresse).trim()))];
}

/** Great-circle distance, metres. */
export function haversineM(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * The verdict from the phone's fix and its distance to each visit address.
 * Pure — the network part is `checkPhotoSite` (lib/photo-site-check.ts).
 */
export function classifySite(fix: SiteFix | null, visits: ReadonlyArray<SiteDistance>, hasVisit: boolean): PhotoSiteCheck {
  if (!fix || !Number.isFinite(fix.lat) || !Number.isFinite(fix.lng)) return { status: 'non_verifie', reason: 'no_position' };
  const where = {
    lat: fix.lat,
    lng: fix.lng,
    ...(Number.isFinite(fix.accuracy) ? { accuracyM: Math.round(fix.accuracy!) } : {}),
  };
  if (!hasVisit) return { status: 'non_verifie', reason: 'no_visit', ...where };
  const known = visits.filter((v): v is SiteDistance & { meters: number } => typeof v.meters === 'number' && Number.isFinite(v.meters));
  if (known.length === 0) return { status: 'non_verifie', reason: 'address_unknown', ...where };
  const reach = (v: SiteDistance) => (v.method === 'road' ? SITE_ROAD_RADIUS_M : SITE_RADIUS_M);
  // The visit the phone is closest to, relative to each one's reach.
  const nearest = known.reduce((a, b) => (b.meters / reach(b) < a.meters / reach(a) ? b : a));
  const accuracy = Number.isFinite(fix.accuracy) ? (fix.accuracy as number) : SITE_MAX_ACCURACY_M;
  const measured = { ...where, distanceM: Math.round(nearest.meters), method: nearest.method, adresse: nearest.adresse };
  if (nearest.meters <= reach(nearest) && accuracy <= SITE_MAX_ACCURACY_M) return { status: 'sur_place', ...measured };
  // Away even if the phone were at the near edge of its uncertainty.
  if (nearest.meters - accuracy > reach(nearest)) return { status: 'hors_site', ...measured };
  return { status: 'non_verifie', reason: 'imprecise', ...measured };
}

/** « moins de 10 m », « 15 m », « 850 m », « 3,2 km », « 24 km ». */
export function formatDistance(m: number): string {
  if (m < 10) return 'moins de 10 m';
  if (m < 100) return `${Math.round(m / 5) * 5} m`;
  if (m < 1000) return `${Math.round(m / 10) * 10} m`;
  const km = m / 1000;
  return `${km < 10 ? km.toFixed(1).replace('.', ',') : Math.round(km)} km`;
}

/** Short label for a badge: « Sur place », « Hors site · 3,2 km », « Lieu non vérifié ». */
export function siteLabel(check: PhotoSiteCheck): string {
  if (check.status === 'sur_place') return 'Sur place';
  if (check.status === 'hors_site') return check.distanceM != null ? `Hors site · ${formatDistance(check.distanceM)}` : 'Hors site';
  return 'Lieu non vérifié';
}

/** The full sentence: what was measured, or why nothing could be. */
export function siteDetail(check: PhotoSiteCheck): string {
  const at = check.adresse ? ` (${check.adresse})` : '';
  const precision = check.accuracyM != null ? ` Position du téléphone précise à ${formatDistance(check.accuracyM)}.` : '';
  switch (check.status) {
    case 'sur_place':
      return `Photo prise sur place : à ${formatDistance(check.distanceM ?? 0)} de l'adresse de la visite${at}.${precision}`;
    case 'hors_site':
      return `Photo prise hors site : à ${formatDistance(check.distanceM ?? 0)} de l'adresse de la visite${at}.${precision}`;
    default:
      switch (check.reason) {
        case 'no_position':
          return "Lieu non vérifié : la position du téléphone n'était pas disponible (localisation refusée ou désactivée).";
        case 'imprecise':
          return `Lieu non vérifié : la position du téléphone était trop imprécise pour conclure${check.distanceM != null ? ` (à ${formatDistance(check.distanceM)} de la visite${at})` : ''}.${precision}`;
        case 'no_visit':
          return "Lieu non vérifié : aucune adresse de visite n'est renseignée pour cette phase.";
        default:
          return `Lieu non vérifié : l'adresse de la visite n'a pas pu être placée sur la carte${at}.`;
      }
  }
}

/** The line printed on the photo itself, under the GPS line. */
export function siteWatermarkLine(check: PhotoSiteCheck): string {
  if (check.status === 'sur_place') return 'Sur place';
  if (check.status === 'hors_site') {
    return check.distanceM != null ? `HORS SITE : à ${formatDistance(check.distanceM)} de la visite` : 'HORS SITE';
  }
  return 'Lieu non vérifié';
}

/** Reads a stored `siteCheck`; anything malformed reads as none. */
export function readSiteCheck(raw: unknown): PhotoSiteCheck | null {
  if (!raw || typeof raw !== 'object') return null;
  const status = (raw as { status?: unknown }).status;
  if (status !== 'sur_place' && status !== 'hors_site' && status !== 'non_verifie') return null;
  return raw as PhotoSiteCheck;
}
