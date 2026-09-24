/**
 * Réf. expert uniqueness (QA bug 002).
 *
 * The reference is typed by the gestionnaire or copied by the AI scan, and
 * nothing generates it, so two dossiers could carry the same one. Every
 * write path (information form, document scan) asks here first. Firestore
 * cannot enforce uniqueness in rules; equality queries are enough at this
 * volume and need no composite index.
 *
 * Two lookups run: the exact trimmed value (what older dossiers store) and
 * the normalised `refExpertKey` every write now stores beside `refExpert`,
 * so « sl-12 », « SL-12 » and « SL - 12 » count as the same reference.
 */
import { collection, limit, query, where, type Firestore } from 'firebase/firestore';
import { getDocs } from './firestore-logged';

export const DUPLICATE_REF_MESSAGE = 'Cette Réf. expert est déjà utilisée par un autre dossier.';

/**
 * Comparison key: trimmed, upper-cased, diacritics and whitespace removed.
 * Empty for an empty reference.
 */
export function normalizeRefExpert(ref: unknown): string {
  return String(ref ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, '')
    .toUpperCase();
}

/** The pair every write of a reference carries: the trimmed value + its key. */
export function refExpertFields(ref: unknown): { refExpert: string; refExpertKey: string } {
  const refExpert = String(ref ?? '').trim();
  return { refExpert, refExpertKey: normalizeRefExpert(refExpert) };
}

/**
 * Returns the id of ANOTHER dossier already carrying `ref` (exact trimmed
 * match or same normalised key), or null when the reference is free.
 * `excludeId` is the dossier being edited so its own reference never counts
 * as a duplicate.
 */
export async function findDossierWithRefExpert(
  db: Firestore,
  ref: string,
  excludeId?: string | null,
): Promise<string | null> {
  const value = (ref || '').trim();
  if (!value) return null;
  const key = normalizeRefExpert(value);
  const dossiers = collection(db, 'dossiers');
  const [exact, byKey] = await Promise.all([
    getDocs(query(dossiers, where('refExpert', '==', value), limit(5))),
    getDocs(query(dossiers, where('refExpertKey', '==', key), limit(5))),
  ]);
  const other = [...exact.docs, ...byKey.docs].find((d) => d.id !== excludeId);
  return other ? other.id : null;
}

/**
 * Keys carried by at least two of the given dossiers — the list pages badge
 * those rows « Doublon » so references duplicated before the gate existed
 * stay visible and get corrected instead of silently coexisting.
 */
export function duplicateRefExpertKeys(dossiers: ReadonlyArray<{ refExpert?: unknown } | null | undefined>): Set<string> {
  const seen = new Map<string, number>();
  for (const d of dossiers) {
    const key = normalizeRefExpert(d?.refExpert);
    if (!key) continue;
    seen.set(key, (seen.get(key) ?? 0) + 1);
  }
  const dup = new Set<string>();
  for (const [k, n] of seen) if (n > 1) dup.add(k);
  return dup;
}
