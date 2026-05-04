/**
 * find-latest-chiffrage-docs
 *
 * Pure helper that, given a `dossierId`, returns the latest accord /
 * proposition d'accord PDF for each chiffrage *source* (a.k.a. garage parent
 * label: `Devis Garage`, `Devis Garage 2`, …).
 *
 * Data shape recap (consumers: `chiffrage-tab.tsx`, `step-5-chiffrage.tsx`,
 * `devis-editor.tsx`):
 *   - chiffrages collection holds one doc per chiffrage with shape:
 *       { dossierId, files: ChiffrageFileDoc[], structuredEditables: Record<docType, { versions: [{ pdfUrl, savedAt, savedBy }, ...] }>, updatedAt }
 *   - structuredEditables keys are docType labels. Accord/proposition variants
 *     parse via `parseAccordDocType()` into { parent, kind, ordinal }.
 *   - `versions[0]` is always the newest published PDF for that docType.
 *   - Multiple chiffrage sources for one dossier are different *parents*
 *     (same chiffrage doc may host them all). We still query the collection
 *     in case more than one chiffrage exists for the dossier.
 *
 * Stage ordinal (highest first):
 *     3ème accord > 3ème proposition d'accord >
 *     2ème accord > 2ème proposition d'accord >
 *     Accord       > Proposition d'accord
 */

import {
  collection,
  getDocs,
  query,
  where,
  type Firestore,
} from 'firebase/firestore';

import { parseAccordDocType, parseGarageSlot } from './docType-accorde';

export interface LatestChiffrageDoc {
  /** Unique key per source (parent label), e.g. `Devis Garage`, `Devis Garage 2`. */
  sourceId: string;
  /** Human label, equal to the parent garage slot (`Devis Garage`, `Devis Garage 2`, …). */
  label: string;
  /** Direct download URL for the latest accord/proposition PDF of this source. */
  pdfUrl: string;
  /** Stage label of the picked PDF (e.g. `3ème accord`, `Proposition d'accord`). */
  stage: string;
  /** Timestamp (Firestore Timestamp | Date | ISO string) of the picked version. */
  updatedAt: any;
}

/** Stage rank — higher wins. */
function stageRank(kind: 'accord' | 'proposition-accord', ordinal: number): number {
  // Composite: ordinal first (3 > 2 > 1), then kind (accord beats proposition at the same ordinal).
  // Mapping (ord, kind) → rank:
  //   (3, accord) = 6 — 3ème accord
  //   (3, proposition-accord) = 5 — 3ème proposition d'accord
  //   (2, accord) = 4 — 2ème accord
  //   (2, proposition-accord) = 3 — 2ème proposition d'accord
  //   (1, accord) = 2 — Accord
  //   (1, proposition-accord) = 1 — Proposition d'accord
  const o = Math.max(1, Math.min(3, ordinal));
  const kindBonus = kind === 'accord' ? 1 : 0;
  return (o - 1) * 2 + 1 + kindBonus;
}

function stageDisplay(kind: 'accord' | 'proposition-accord', ordinal: number): string {
  const o = Math.max(1, Math.min(3, ordinal));
  if (kind === 'accord') {
    if (o === 1) return 'Accord';
    if (o === 2) return '2ème accord';
    return '3ème accord';
  }
  if (o === 1) return "Proposition d'accord";
  if (o === 2) return "2ème proposition d'accord";
  return "3ème proposition d'accord";
}

/**
 * For each chiffrage source attached to `dossierId`, return only the latest
 * accord/proposition PDF. Sorted by source label ascending (`Devis Garage`,
 * `Devis Garage 2`, …, `Facture Garage`, `Facture Garage 2`, …).
 */
export async function findLatestChiffrageDocs(
  db: Firestore,
  dossierId: string,
): Promise<LatestChiffrageDoc[]> {
  if (!db || !dossierId) return [];

  const snap = await getDocs(
    query(collection(db, 'chiffrages'), where('dossierId', '==', dossierId)),
  );

  // Per-source best pick: parent label → { rank, doc }.
  type Pick = {
    rank: number;
    sourceId: string;
    label: string;
    pdfUrl: string;
    stage: string;
    updatedAt: any;
  };
  const best = new Map<string, Pick>();

  for (const chiffrageSnap of snap.docs) {
    const data = chiffrageSnap.data() as any;
    const structured = (data?.structuredEditables ?? {}) as Record<string, any>;

    for (const docType of Object.keys(structured)) {
      const parsed = parseAccordDocType(docType);
      if (!parsed) continue; // not an accord/proposition entry

      // Skip if this isn't a *garage* source (we only want devis/facture garages).
      if (!parseGarageSlot(parsed.parent)) continue;

      const entry = structured[docType];
      const versions: any[] = Array.isArray(entry?.versions) ? entry.versions : [];
      const latest = versions[0];
      const pdfUrl: string | undefined = latest?.pdfUrl;
      if (!pdfUrl) continue; // no published PDF for this stage

      const rank = stageRank(parsed.kind, parsed.ordinal);
      const stage = stageDisplay(parsed.kind, parsed.ordinal);
      const sourceId = parsed.parent; // canonical: `Devis Garage`, `Devis Garage 2`, …

      const prev = best.get(sourceId);
      if (!prev || rank > prev.rank) {
        best.set(sourceId, {
          rank,
          sourceId,
          label: sourceId,
          pdfUrl,
          stage,
          updatedAt: latest?.savedAt ?? entry?.updatedAt ?? data?.updatedAt ?? null,
        });
      }
    }
  }

  // Stable sort by source label.
  return Array.from(best.values())
    .map(({ rank: _rank, ...rest }) => rest)
    .sort((a, b) => a.label.localeCompare(b.label, 'fr'));
}
