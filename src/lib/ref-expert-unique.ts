/**
 * Réf. expert uniqueness (QA bug 002).
 *
 * The reference is typed by the gestionnaire or copied by the AI scan, and
 * nothing generates it, so two dossiers could carry the same one. Every
 * write path (information form, document scan) asks here first. Firestore
 * cannot enforce uniqueness in rules; a single equality query is enough at
 * this volume and needs no composite index.
 */
import { collection, getDocs, limit, query, where, type Firestore } from 'firebase/firestore';

export const DUPLICATE_REF_MESSAGE = 'Cette Réf. expert est déjà utilisée par un autre dossier.';

/**
 * Returns the id of ANOTHER dossier already carrying `ref` (trimmed, exact
 * match), or null when the reference is free. `excludeId` is the dossier
 * being edited so its own reference never counts as a duplicate.
 */
export async function findDossierWithRefExpert(
  db: Firestore,
  ref: string,
  excludeId?: string | null,
): Promise<string | null> {
  const value = (ref || '').trim();
  if (!value) return null;
  const snap = await getDocs(query(collection(db, 'dossiers'), where('refExpert', '==', value), limit(5)));
  const other = snap.docs.find((d) => d.id !== excludeId);
  return other ? other.id : null;
}
