/**
 * « 1er accord » complete? — the ONE rule behind the « 1er accord » step,
 * the « 2ème accord et + » unlock and its « Assigner au chiffrage » button
 * (owner ruling 2026-09-24).
 *
 * Complete = every garage SOURCE the dossier has (« Devis Garage »,
 * « Facture Garage ») carries its first-round answer from the chiffreur: an
 * accord (« Devis accordé », « Facture accordé ») or a proposition
 * (« 1ère proposition d'accord (devis|facture) »), with a real uploaded file.
 * A later round (2ème…) implies the first one. A dossier with only a devis
 * needs only the devis answer; one with no source at all is never complete.
 *
 * Decided from the DOCUMENTS, not from a flag: `firstAccordReachedAt` was only
 * written by a gestionnaire-side save that is no longer mounted, so dossiers
 * with both accords saved stayed locked (production, 2026-09-24: D689339 and
 * a123643 — both « accordé » documents present, no stamp). The flag is still
 * written once the rule holds, for the funnel and analytics readers.
 */
import { parseAccordDocType } from '@/lib/docType-accorde';

export const FIRST_ACCORD_FAMILIES = ['Devis Garage', 'Facture Garage'] as const;
export type FirstAccordFamily = (typeof FIRST_ACCORD_FAMILIES)[number];

export interface FirstAccordState {
  complete: boolean;
  /** When the LAST required family got its answer (best effort), else null. */
  at: Date | null;
  /** Families that have a source but no first-round answer yet. */
  missing: FirstAccordFamily[];
  /** Families that have a source document. */
  required: FirstAccordFamily[];
}

interface DocLike {
  type?: unknown;
  typeDocument?: unknown;
  url?: unknown;
  pendingUpload?: unknown;
  dateUpload?: any;
  uploadedAt?: any;
  createdAt?: any;
  _localCreatedAt?: unknown;
}

const isReal = (d: DocLike) => !!d?.url && !d?.pendingUpload;
const typeOf = (d: DocLike) => String(d?.type || d?.typeDocument || '').trim();
const timeOf = (d: DocLike): number | null => {
  for (const v of [d?.dateUpload, d?.uploadedAt, d?.createdAt]) {
    if (v && typeof v.toMillis === 'function') return v.toMillis();
    if (v && typeof v.toDate === 'function') return v.toDate().getTime();
    if (v instanceof Date) return v.getTime();
  }
  return typeof d?._localCreatedAt === 'number' ? d._localCreatedAt : null;
};

export function firstAccordState(docs: ReadonlyArray<DocLike> | null | undefined): FirstAccordState {
  const list = (docs ?? []).filter(isReal);
  const required: FirstAccordFamily[] = [];
  const missing: FirstAccordFamily[] = [];
  let latest: number | null = null;
  for (const family of FIRST_ACCORD_FAMILIES) {
    if (!list.some((d) => typeOf(d) === family)) continue;
    required.push(family);
    let answeredAt: number | null | undefined;
    for (const d of list) {
      const parsed = parseAccordDocType(typeOf(d));
      if (!parsed || parsed.parent !== family || parsed.ordinal < 1) continue;
      if (parsed.kind !== 'accord' && parsed.kind !== 'proposition-accord') continue;
      const t = timeOf(d);
      // Earliest answer of this family = when its first round was done.
      if (answeredAt === undefined || (t != null && (answeredAt == null || t < answeredAt))) answeredAt = t;
    }
    if (answeredAt === undefined) {
      missing.push(family);
      continue;
    }
    if (answeredAt != null && (latest == null || answeredAt > latest)) latest = answeredAt;
  }
  const complete = required.length > 0 && missing.length === 0;
  return { complete, at: complete && latest != null ? new Date(latest) : null, missing, required };
}

/** « Nécessite le 1er accord (devis et facture) » — says which answer is still missing. */
export function firstAccordBlockedReason(state: FirstAccordState | null | undefined): string {
  if (!state || state.required.length === 0) return 'Nécessite le 1er accord';
  if (state.missing.length === 2) return 'Nécessite le 1er accord du devis et de la facture';
  if (state.missing[0] === 'Devis Garage') return 'Nécessite le 1er accord du devis';
  if (state.missing[0] === 'Facture Garage') return 'Nécessite le 1er accord de la facture';
  return 'Nécessite le 1er accord';
}
