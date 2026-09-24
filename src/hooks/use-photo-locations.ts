'use client';

/**
 * « Par localisation » for the dossier photos — one answer per photo, always
 * (owner ruling 2026-09-24: the location view « doit toujours fonctionner »).
 *
 * Most photos carry no position at all (screenshots, WhatsApp images, gallery
 * exports strip EXIF), so grouping on the photo's own GPS alone put nearly
 * everything under « Sans localisation ». Order of truth:
 *
 *  1. the photo's own coordinates — grouped per ~100 m cell, labelled with its
 *     stored place name or, when it has none, one looked up once per cell;
 *  2. a stored place name without coordinates;
 *  3. the ADDRESS OF THE VISIT the photo belongs to: a photo can only be added
 *     to a phase that has a planification (QA bug 048), so the rendez-vous of
 *     that phase closest to the upload is where it was taken;
 *  4. « Sans localisation » — only a photo from before planifications existed,
 *     in a phase with no visit at all.
 */
import * as React from 'react';
import { geoCellKey, labelForGeo, photoLocationBucket } from '@/lib/photo-geo';
import { normalizeTypeMission } from '@/lib/type-mission';

export type PhotoLocationSource = 'gps' | 'text' | 'rdv' | 'none';
export interface PhotoLocation {
  key: string;
  label: string;
  source: PhotoLocationSource;
}

interface LocPhoto {
  id: string;
  category?: string;
  lat?: unknown;
  lng?: unknown;
  location?: unknown;
  uploadedAt?: any;
  _localCreatedAt?: unknown;
}
interface LocPlan {
  typeMission?: unknown;
  adresse?: unknown;
  dateRDV?: any;
}

const PHASE_CATEGORY: Record<string, string> = { Avant: 'avant', 'En cours': 'en_cours', Après: 'apres' };

const toMs = (v: any): number | null => {
  if (!v) return null;
  if (typeof v?.toMillis === 'function') return v.toMillis();
  if (typeof v?.toDate === 'function') return v.toDate().getTime();
  if (v instanceof Date) return v.getTime();
  if (typeof v === 'number') return v;
  return null;
};

const coordsOf = (p: LocPhoto): { lat: number; lng: number } | null => {
  const lat = typeof p.lat === 'number' ? p.lat : Number(p.lat);
  const lng = typeof p.lng === 'number' ? p.lng : Number(p.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || (lat === 0 && lng === 0)) return null;
  return { lat, lng };
};

export function usePhotoLocations(
  photos: ReadonlyArray<LocPhoto>,
  planifications: ReadonlyArray<LocPlan> | null | undefined,
  labels: { unknown: string; rdv: string },
): (photo: LocPhoto) => PhotoLocation {
  // Place names looked up for coordinate cells that have none stored.
  const [cellLabels, setCellLabels] = React.useState<Record<string, string>>({});
  React.useEffect(() => {
    let alive = true;
    const wanted = new Map<string, { lat: number; lng: number }>();
    for (const p of photos) {
      const c = coordsOf(p);
      const txt = typeof p.location === 'string' ? p.location.trim() : '';
      if (!c || txt) continue;
      const key = geoCellKey(c.lat, c.lng);
      if (!(key in cellLabels)) wanted.set(key, c);
    }
    wanted.forEach((c, key) => {
      labelForGeo(c.lat, c.lng).then((label) => {
        if (alive && label) setCellLabels((prev) => (prev[key] ? prev : { ...prev, [key]: label }));
      });
    });
    return () => {
      alive = false;
    };
    // `cellLabels` is read to skip known cells; re-running on it would only
    // re-check the same photos.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photos]);

  // Visits per photo category, with an address, in RDV order.
  const visitsByCategory = React.useMemo(() => {
    const map = new Map<string, { adresse: string; at: number | null }[]>();
    for (const plan of planifications ?? []) {
      const phase = normalizeTypeMission(plan?.typeMission);
      const cat = phase ? PHASE_CATEGORY[phase] : undefined;
      const adresse = typeof plan?.adresse === 'string' ? plan.adresse.trim() : '';
      if (!cat || !adresse) continue;
      const list = map.get(cat) ?? [];
      list.push({ adresse, at: toMs(plan.dateRDV) });
      map.set(cat, list);
    }
    map.forEach((list) => list.sort((a, b) => (a.at ?? 0) - (b.at ?? 0)));
    return map;
  }, [planifications]);

  return React.useCallback(
    (photo: LocPhoto): PhotoLocation => {
      const own = photoLocationBucket(photo, labels.unknown);
      if (own.key.startsWith('c:')) {
        const c = coordsOf(photo)!;
        const txt = typeof photo.location === 'string' ? photo.location.trim() : '';
        return { key: own.key, label: txt || cellLabels[geoCellKey(c.lat, c.lng)] || own.label, source: 'gps' };
      }
      if (own.key.startsWith('t:')) return { ...own, source: 'text' };
      const visits = photo.category ? visitsByCategory.get(photo.category) : undefined;
      if (visits && visits.length > 0) {
        // The visit the photo was taken at: the last one that had started by
        // the upload (half a day of slack for late RDV times), else the first.
        const shot = toMs(photo.uploadedAt) ?? (typeof photo._localCreatedAt === 'number' ? photo._localCreatedAt : null);
        let visit = visits[0];
        if (shot != null) {
          for (const v of visits) if (v.at != null && v.at <= shot + 12 * 3600_000) visit = v;
        } else {
          visit = visits[visits.length - 1];
        }
        return { key: `a:${visit.adresse.toLowerCase()}`, label: `${visit.adresse} (${labels.rdv})`, source: 'rdv' };
      }
      return { key: '__unknown__', label: labels.unknown, source: 'none' };
    },
    [cellLabels, visitsByCategory, labels.unknown, labels.rdv],
  );
}
