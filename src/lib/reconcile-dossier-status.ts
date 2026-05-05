/**
 * Pure status deriver for the reconciler script.
 *
 * Reads a dossier's actual subcollection state (documents, photos,
 * planifications) and returns the canonical `statut` it *should* be at.
 * Mirrors the priority order baked into the seven event-driven write paths
 * (status-machine + send-to-chiffrage + devis-editor + photo trigger +
 * modal-planification + sendByMail), but derives from state rather than
 * consuming events.
 *
 * No Firestore imports — this module is pure and unit-testable. The script
 * (`scripts/reconcile-statuses.ts`) wraps it in the per-dossier loop with
 * Admin SDK reads/writes.
 *
 * Priority (highest wins, never regresses past terminal):
 *   1. Terminal: `'Accord envoyé'` or `'Réforme'` → keep as-is.
 *   2. Most-recently-saved accord/proposition document → `ordinalAccordLabel`.
 *   3. Any chiffrage source devis/facture present but no accord yet →
 *      `'Chiffrage en cours'`.
 *   4. Most-recent photo by category → `'Planification expertise <cat>'`.
 *   5. Most-recent active planification by typeMission → `'Planification
 *      programmée <typeMission>'`.
 *   6. Default → `'Création dossier'`.
 */

import { parseAccordDocType, type ParsedAccordDocType } from './docType-accorde';
import { ordinalAccordLabel } from './status-machine';

/** Terminal statuses the deriver never overwrites. */
const TERMINAL_STATUSES: ReadonlySet<string> = new Set([
  'Accord envoyé',
  'Réforme',
]);

const PHOTO_CATEGORY_TO_STATUS: Record<string, string> = {
  avant: 'Planification expertise avant',
  en_cours: 'Planification expertise en cours',
  apres: 'Planification expertise après',
};

const PLANIF_MISSION_TO_STATUS: Record<string, string> = {
  Avant: 'Planification programmée avant',
  'En cours': 'Planification programmée en cours',
  Après: 'Planification programmée après',
};

const CHIFFRAGE_SOURCE_BASES: ReadonlySet<string> = new Set([
  'Devis Garage',
  'Facture Garage',
]);

/** Reads the doc's most-recent timestamp from any of the conventional fields. */
function docTimestampMillis(d: any): number {
  if (!d) return 0;
  const candidates = [d.dateUpload, d.updatedAt, d.createdAt];
  let best = 0;
  for (const c of candidates) {
    if (!c) continue;
    if (typeof c.toMillis === 'function') {
      best = Math.max(best, c.toMillis());
    } else if (typeof c.seconds === 'number') {
      best = Math.max(best, c.seconds * 1000);
    } else if (c instanceof Date) {
      best = Math.max(best, c.getTime());
    } else if (typeof c === 'number') {
      best = Math.max(best, c);
    }
  }
  return best;
}

/** True if the document type indicates a chiffrage source slot
 *  (`Devis Garage`, `Facture Garage`, `Devis Garage 2`, …). */
function isChiffrageSourceDoc(d: any): boolean {
  if (!d) return false;
  const type = (d.type || d.typeDocument || '') as unknown;
  if (typeof type !== 'string') return false;
  if (CHIFFRAGE_SOURCE_BASES.has(type)) return true;
  return /^(Devis Garage|Facture Garage)\s+\d+$/.test(type);
}

export interface ReconcileInputs {
  /** Only `statut` is read — keep the parameter shape forward-compatible. */
  dossier: { statut?: string };
  documents: any[];
  photos: any[];
  planifications: any[];
}

/**
 * Derives the canonical statut a dossier should be at given its subcollection
 * state. Pure function: same inputs → same output. Always returns a non-empty
 * string.
 */
export function deriveActualStatut(input: ReconcileInputs): string {
  const { dossier, documents, photos, planifications } = input;
  const current = (dossier?.statut || '').trim();

  // 1. Terminal — never overwrite.
  if (TERMINAL_STATUSES.has(current)) return current;

  // 2. Most-recently-saved accord/proposition document. We pick by timestamp,
  //    not by ordinal, because the chiffreur's last action is what defines
  //    the current phase (e.g., a 4ème proposition saved after a 1ère accord
  //    means we're back in negotiation).
  type AccordHit = { parsed: ParsedAccordDocType; ts: number };
  const accordHits: AccordHit[] = [];
  let hasChiffrageSource = false;
  for (const d of documents || []) {
    if (!d) continue;
    if (isChiffrageSourceDoc(d)) hasChiffrageSource = true;
    const type = (d.type || d.typeDocument || '') as unknown;
    if (typeof type !== 'string') continue;
    const parsed = parseAccordDocType(type);
    if (!parsed) continue;
    if (d.pendingUpload === true) continue; // placeholder from `+` pimple
    if (!d.url) continue; // not yet uploaded
    accordHits.push({ parsed, ts: docTimestampMillis(d) });
  }
  if (accordHits.length > 0) {
    accordHits.sort((a, b) => b.ts - a.ts);
    const top = accordHits[0].parsed;
    const kind: 'accord' | 'proposition' =
      top.kind === 'proposition-accord' ? 'proposition' : 'accord';
    return ordinalAccordLabel(kind, top.ordinal);
  }

  // 3. Has at least one chiffrage source devis/facture but no accord saved.
  if (hasChiffrageSource) return 'Chiffrage en cours';

  // 4. Most-recent photo by category.
  let topPhotoCat: string | null = null;
  let topPhotoTs = -1;
  for (const p of photos || []) {
    if (!p) continue;
    const cat = (p.category || '') as string;
    if (!PHOTO_CATEGORY_TO_STATUS[cat]) continue;
    const ts = docTimestampMillis(p);
    if (ts > topPhotoTs) {
      topPhotoTs = ts;
      topPhotoCat = cat;
    }
  }
  if (topPhotoCat) return PHOTO_CATEGORY_TO_STATUS[topPhotoCat];

  // 5. Most-recent active planification by typeMission.
  let topMission: string | null = null;
  let topPlanifTs = -1;
  for (const pl of planifications || []) {
    if (!pl) continue;
    if (pl.active === false) continue;
    const tm = (pl.typeMission || '') as string;
    if (!PLANIF_MISSION_TO_STATUS[tm]) continue;
    const ts = docTimestampMillis(pl);
    if (ts > topPlanifTs) {
      topPlanifTs = ts;
      topMission = tm;
    }
  }
  if (topMission) return PLANIF_MISSION_TO_STATUS[topMission];

  // 6. Nothing yet.
  return 'Création dossier';
}
