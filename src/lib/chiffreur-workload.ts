/**
 * Shared logic for computing a chiffreur's "open dossier" count.
 *
 * An "open" chiffrage is one whose top-level `status` is NOT a terminal status
 * (i.e. NOT `'done'`). We intentionally key counts by `assignedChiffreurId`
 * (unique) rather than `assignedChiffreurNom` (can collide), and we expose a
 * name->id resolver for surfaces that only have the name.
 *
 * This file exists to keep the "Envoyer vers chiffrage" modal (via
 * `useChiffreurWorkload` in `src/hooks/use-workload-counts.ts`) and the
 * "Assignations au chiffrage" page filter in strict agreement.
 */
import {
  collection,
  getCountFromServer,
  getDocs,
  onSnapshot,
  query,
  where,
  type Firestore,
  type Unsubscribe,
} from 'firebase/firestore';

/**
 * Top-level chiffrage `status` values considered "closed" / no longer counting
 * toward a chiffreur's workload. Keep this list in sync with any future
 * finalization flows. The canonical value today is `'done'` (set by the PDF
 * editor and the editor page when the chiffreur submits the final result).
 *
 * NB: legacy dossier statuses like `'Terminé'` / `'Clôturé'` live on the
 * `dossiers` collection, not on `chiffrages`, so they do not belong here.
 */
export const CHIFFRAGE_TERMINAL_STATUSES: readonly string[] = ['done'] as const;

function isOpen(status: unknown): boolean {
  return !CHIFFRAGE_TERMINAL_STATUSES.includes(String(status ?? ''));
}

/**
 * One-shot: returns the number of open chiffrages assigned to `chiffreurId`.
 *
 * Uses `getCountFromServer` for a fast aggregation when we only need the
 * count; Firestore aggregations cannot exclude a status field cheaply, so
 * when there's any risk of closed-but-not-cleaned-up docs we fall back to
 * a filtered count via `getDocs`. Here we default to the accurate fallback
 * so the two UI surfaces always match each other exactly.
 */
export async function getChiffreurOpenCount(
  db: Firestore,
  chiffreurId: string,
): Promise<number> {
  if (!chiffreurId) return 0;
  const q = query(
    collection(db, 'chiffrages'),
    where('assignedChiffreurId', '==', chiffreurId),
  );
  const snap = await getDocs(q);
  let n = 0;
  snap.forEach((d) => {
    if (isOpen((d.data() as { status?: unknown }).status)) n++;
  });
  return n;
}

/**
 * Same aggregation across ALL chiffreurs in one pass. Preferred when the UI
 * needs a record keyed by chiffreur id (e.g. populating a dropdown with
 * per-entry counts). Returns `{ [assignedChiffreurId]: openCount }`.
 */
export async function getAllChiffreurOpenCounts(
  db: Firestore,
): Promise<Record<string, number>> {
  const snap = await getDocs(collection(db, 'chiffrages'));
  const counts: Record<string, number> = {};
  snap.forEach((d) => {
    const data = d.data() as { status?: unknown; assignedChiffreurId?: string };
    if (!data.assignedChiffreurId) return;
    if (!isOpen(data.status)) return;
    counts[data.assignedChiffreurId] = (counts[data.assignedChiffreurId] || 0) + 1;
  });
  return counts;
}

/**
 * Realtime variant: fires `cb` every time the open-count for `chiffreurId`
 * changes. Returns an `Unsubscribe`. Use from React effects, NOT render.
 */
export function subscribeChiffreurOpenCount(
  db: Firestore,
  chiffreurId: string,
  cb: (count: number) => void,
): Unsubscribe {
  if (!chiffreurId) {
    cb(0);
    return () => {};
  }
  const q = query(
    collection(db, 'chiffrages'),
    where('assignedChiffreurId', '==', chiffreurId),
  );
  return onSnapshot(q, (snap) => {
    let n = 0;
    snap.forEach((d) => {
      if (isOpen((d.data() as { status?: unknown }).status)) n++;
    });
    cb(n);
  });
}

/**
 * Realtime variant that streams the full `{ chiffreurId: openCount }` map.
 * This is what `useChiffreurWorkload` and the assignations-page chiffreur
 * filter should both consume so their numbers always line up.
 */
export function subscribeAllChiffreurOpenCounts(
  db: Firestore,
  cb: (counts: Record<string, number>) => void,
): Unsubscribe {
  return onSnapshot(collection(db, 'chiffrages'), (snap) => {
    const counts: Record<string, number> = {};
    snap.forEach((d) => {
      const data = d.data() as { status?: unknown; assignedChiffreurId?: string };
      if (!data.assignedChiffreurId) return;
      if (!isOpen(data.status)) return;
      counts[data.assignedChiffreurId] = (counts[data.assignedChiffreurId] || 0) + 1;
    });
    cb(counts);
  });
}

/**
 * Aggregate-only count using Firestore's server-side `COUNT()` aggregation.
 * Faster and cheaper than `getDocs` when you KNOW there are no closed
 * chiffrages lingering with the same `assignedChiffreurId`, because it
 * cannot exclude by `status`. Exposed for callers that explicitly want the
 * server aggregation (e.g. admin dashboards that don't care about
 * terminal-status filtering precision).
 */
export async function getChiffreurTotalCount(
  db: Firestore,
  chiffreurId: string,
): Promise<number> {
  if (!chiffreurId) return 0;
  const q = query(
    collection(db, 'chiffrages'),
    where('assignedChiffreurId', '==', chiffreurId),
  );
  const snap = await getCountFromServer(q);
  return snap.data().count;
}
