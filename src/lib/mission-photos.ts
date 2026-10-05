/**
 * When photos count for a terrain mission (QA bugs AT 008 / AT 010).
 *
 * A planification is one VISIT. Its photos are the photos of its phase
 * (`dossiers/{id}/photos`, `category` avant / en_cours / apres) taken from
 * the start of its RDV day on — from its creation when it has no RDV:
 *   • the photos themselves close the visit, stamped or not: AT uploads made
 *     before 2026-09-24 never wrote `datePhotos<Phase>` nor `photosSentAt`,
 *     so their visits stayed « Photos pas encore envoyées » for ever (AT 008);
 *   • photos taken before the RDV day never close a later visit of the same
 *     phase: the upload used to stamp every planification of the phase,
 *     future ones included, and those vanished from « Prochaines missions »
 *     (AT 010);
 *   • a later upload still closes an earlier, missed visit of the phase — a
 *     re-planned RDV is done once the phase has its photos.
 * A photo is SENT once its file is in Storage (`url`, no `pendingUpload`), the
 * test every document grid uses: a photo still in the offline queue is
 * exactly « photos pas encore envoyées ».
 */

import { startOfDay } from 'date-fns';
import { toDate } from '@/lib/dossier-steps';
import type { TypeMission } from '@/lib/type-mission';

export type PhotoCategory = 'avant' | 'en_cours' | 'apres';

export const PHASE_OF_PHOTO_CATEGORY: Record<PhotoCategory, TypeMission> = {
  avant: 'Avant',
  en_cours: 'En cours',
  apres: 'Après',
};

/** Times of the sent photos of one dossier, per phase, oldest first. */
export type PhasePhotoTimes = Partial<Record<TypeMission, Date[]>>;

/** The moment from which a photo of the visit's phase counts for it. */
export function missionPhotoAnchor(rdv: Date | null, createdAt: Date | null): Date | null {
  return rdv ? startOfDay(rdv) : createdAt;
}

export function isSentPhoto(p: { url?: unknown; pendingUpload?: unknown } | null | undefined): boolean {
  return !!p?.url && !p.pendingUpload;
}

/** When the photo reached the dossier: `uploadedAt`, else the upload helper's own `dateUpload`. */
export function photoTakenAt(p: Record<string, unknown> | null | undefined): Date | null {
  return toDate(p?.uploadedAt) ?? toDate(p?.dateUpload);
}

/** Photo docs → the times of the SENT ones per phase (undated ones cannot place a visit). */
export function photoTimesByPhase(photos: ReadonlyArray<Record<string, unknown>>): PhasePhotoTimes {
  const out: PhasePhotoTimes = {};
  for (const p of photos) {
    const phase = PHASE_OF_PHOTO_CATEGORY[(p.category as PhotoCategory) || 'avant'];
    if (!phase || !isSentPhoto(p)) continue;
    const at = photoTakenAt(p);
    if (!at) continue;
    (out[phase] ??= []).push(at);
  }
  for (const list of Object.values(out)) list?.sort((a, b) => a.getTime() - b.getTime());
  return out;
}

/**
 * A visit's `photosSentAt` stamp counts when written from its RDV day on, or
 * when the upload flagged it as an early visit (`photosSentEarly`). An older
 * stamp is the old « every planification of the phase » write.
 */
export function isValidPhotosSentAt(sentAt: Date | null, anchor: Date | null, early: boolean): boolean {
  if (!sentAt) return false;
  return early || !anchor || sentAt >= anchor;
}

export interface StampablePlan {
  id?: string;
  dateRDV?: unknown;
  createdAt?: unknown;
  active?: boolean;
  photosSentAt?: unknown;
  photosSentEarly?: boolean;
}

/**
 * The planifications (of ONE phase) a photo upload at `at` belongs to: every
 * visit whose RDV day has come (or that has no RDV) and is not stamped yet —
 * or, when none is due, the nearest upcoming visit only (the agent came
 * early), flagged `early`. A future visit is never stamped by another
 * visit's photos.
 */
export function photoStampTargets(plans: ReadonlyArray<StampablePlan>, at: Date): { ids: string[]; early: boolean } {
  const live = plans.filter((p): p is StampablePlan & { id: string } => !!p?.id && p.active !== false);
  const stamped = (p: StampablePlan) =>
    isValidPhotosSentAt(toDate(p.photosSentAt), missionPhotoAnchor(toDate(p.dateRDV), toDate(p.createdAt)), p.photosSentEarly === true);
  const due = live.filter((p) => {
    const rdv = toDate(p.dateRDV);
    return !rdv || startOfDay(rdv) <= at;
  });
  if (due.length > 0) return { ids: due.filter((p) => !stamped(p)).map((p) => p.id), early: false };
  let nearest: { id: string; rdv: number; done: boolean } | null = null;
  for (const p of live) {
    const rdv = toDate(p.dateRDV)?.getTime();
    if (rdv === undefined) continue;
    if (!nearest || rdv < nearest.rdv) nearest = { id: p.id, rdv, done: stamped(p) };
  }
  if (!nearest || nearest.done) return { ids: [], early: true };
  return { ids: [nearest.id], early: true };
}
