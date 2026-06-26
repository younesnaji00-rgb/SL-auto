/**
 * Firestore side of rappel treatment-session snapshots.
 *
 * To render a read-only replica of the dossier "as the gestionnaire left it" —
 * including items they DELETED (shown in red) — we freeze the dossier document
 * AND its relevant subcollections at the start of the session (`before`) and at
 * "Valider le traitement" (`after`), then diff them into added / modified /
 * removed sets used by the replay's green / yellow / red highlighting.
 *
 * Snapshots live in `rappels/{rappelId}/snapshots/{before|after}` so they never
 * bloat the rappel list queries. Pure diff/sanitize helpers live in
 * `./rappel-snapshot`.
 */
import {
  collection,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import {
  classifyDossierChanges,
  diffCollectionById,
  sanitizeForFirestore,
  type CollectionDiff,
  type DocPathDiff,
} from './rappel-snapshot';

/** Subcollections frozen into the snapshot (those a gestionnaire can change). */
export const SNAP_SUBCOLLECTIONS = [
  'documents',
  'photos',
  'planifications',
  'observations',
  'rapport_pieces',
] as const;

const SNAP_BEFORE = 'before';
const SNAP_AFTER = 'after';

function snapshotRef(db: any, rappelId: string, which: string) {
  return doc(collection(doc(db, 'rappels', rappelId), 'snapshots'), which);
}

export interface SnapshotBundle {
  dossier: any;
  subs: Record<string, any[]>;
}

export interface ReplayDiff {
  doc: DocPathDiff;
  subs: Record<string, CollectionDiff>;
}

export interface ReplaySnapshots {
  before: SnapshotBundle | null;
  after: SnapshotBundle | null;
  diff: ReplayDiff | null;
}

/** Read every snapshotted subcollection of a dossier into id-carrying arrays. */
async function readSubcollections(db: any, dossierId: string): Promise<Record<string, any[]>> {
  const subs: Record<string, any[]> = {};
  await Promise.all(
    SNAP_SUBCOLLECTIONS.map(async (name) => {
      try {
        const snap = await getDocs(collection(db, 'dossiers', dossierId, name));
        subs[name] = snap.docs.map((d) => sanitizeForFirestore({ id: d.id, ...(d.data() as any) }));
      } catch {
        subs[name] = [];
      }
    }),
  );
  return subs;
}

/**
 * Write a snapshot doc. The dossier document can contain shapes Firestore's
 * `setDoc` rejects (nested arrays, unsupported field types) — a structured write
 * then throws and, if swallowed, leaves us with NO baseline and therefore no
 * highlighting at all. So we fall back to a JSON-serialized form (single string
 * fields, immune to structural restrictions) before giving up. Readers handle
 * both formats via {@link readSnapshotBundle}.
 */
async function writeSnapshot(ref: any, payload: Record<string, any>): Promise<void> {
  try {
    await setDoc(ref, payload);
    return;
  } catch (err) {
    console.warn('[rappel-session] structured snapshot write failed, retrying as JSON', err);
  }
  const jsonPayload: Record<string, any> = {
    _format: 'json',
    dossierJson: safeStringify(payload.dossier ?? null),
    subsJson: safeStringify(payload.subs ?? {}),
    capturedAt: payload.capturedAt,
  };
  if (payload.diff) jsonPayload.diff = payload.diff;
  try {
    await setDoc(ref, jsonPayload);
    return;
  } catch (err2) {
    console.warn('[rappel-session] JSON snapshot write failed, storing dossier-only JSON', err2);
  }
  try {
    await setDoc(ref, { ...jsonPayload, subsJson: '{}' });
  } catch (err3) {
    console.warn('[rappel-session] snapshot write failed', err3);
  }
}

function safeStringify(v: any): string {
  try {
    return JSON.stringify(v ?? null);
  } catch {
    return 'null';
  }
}

/**
 * Read a stored snapshot doc into a {dossier, subs} bundle, transparently
 * handling both the structured format and the JSON-string fallback format.
 */
function readSnapshotBundle(data: any): SnapshotBundle | null {
  if (!data) return null;
  if (data._format === 'json' || (data.dossierJson != null && data.dossier == null)) {
    let dossier: any = null;
    let subs: Record<string, any[]> = {};
    try {
      dossier = data.dossierJson ? JSON.parse(data.dossierJson) : null;
    } catch {}
    try {
      subs = data.subsJson ? JSON.parse(data.subsJson) : {};
    } catch {}
    return { dossier, subs };
  }
  return { dossier: data.dossier ?? null, subs: data.subs ?? {} };
}

/**
 * Capture the dossier + subcollections at the START of a treatment session.
 * Idempotent — only writes if the `before` snapshot doesn't already exist, so
 * it is safe to call on every open (new sessions and reopened ones alike).
 * `dossierData` is the already-loaded dossier doc; subcollections are read here.
 */
export async function ensureSnapshotBefore(
  db: any,
  rappelId: string,
  dossierId: string,
  dossierData: any,
): Promise<void> {
  if (!db || !rappelId || !dossierId || !dossierData) return;
  try {
    const ref = snapshotRef(db, rappelId, SNAP_BEFORE);
    const existing = await getDoc(ref);
    if (existing.exists()) return;
    const subs = await readSubcollections(db, dossierId);
    await writeSnapshot(ref, {
      dossier: sanitizeForFirestore(dossierData),
      subs,
      capturedAt: serverTimestamp(),
    });
  } catch (err) {
    console.warn('[rappel-session] ensureSnapshotBefore failed', err);
  }
}

/**
 * Capture the dossier + subcollections at the END of a treatment session,
 * diff against the `before` snapshot, persist the `after` snapshot with the
 * diff, and return a count of changed items.
 */
export async function captureSnapshotAfter(
  db: any,
  rappelId: string,
  dossierId: string,
  dossierData: any,
): Promise<number> {
  if (!db || !rappelId || !dossierId) return 0;
  try {
    const afterDossier = sanitizeForFirestore(dossierData ?? {});
    const afterSubs = await readSubcollections(db, dossierId);

    let beforeBundle: SnapshotBundle | null = null;
    try {
      const beforeSnap = await getDoc(snapshotRef(db, rappelId, SNAP_BEFORE));
      if (beforeSnap.exists()) {
        beforeBundle = readSnapshotBundle(beforeSnap.data());
      }
    } catch {}

    // Without a baseline we can't know what changed — store an empty diff
    // rather than classifying the entire dossier as "added" (all-green).
    const emptyDoc: DocPathDiff = { added: [], modified: [], removed: [] };
    const emptyColl: CollectionDiff = { added: [], removed: [], modified: [] };
    const diff: ReplayDiff = { doc: emptyDoc, subs: {} };
    if (beforeBundle) {
      diff.doc = classifyDossierChanges(beforeBundle.dossier ?? {}, afterDossier);
      for (const name of SNAP_SUBCOLLECTIONS) {
        diff.subs[name] = diffCollectionById(beforeBundle.subs?.[name], afterSubs[name]);
      }
    } else {
      for (const name of SNAP_SUBCOLLECTIONS) diff.subs[name] = { ...emptyColl };
    }

    await writeSnapshot(snapshotRef(db, rappelId, SNAP_AFTER), {
      dossier: afterDossier,
      subs: afterSubs,
      diff,
      capturedAt: serverTimestamp(),
    });

    return (
      diff.doc.added.length +
      diff.doc.modified.length +
      diff.doc.removed.length +
      Object.values(diff.subs).reduce(
        (n, c) => n + c.added.length + c.modified.length + c.removed.length,
        0,
      )
    );
  } catch (err) {
    console.warn('[rappel-session] captureSnapshotAfter failed', err);
    return 0;
  }
}

/** Load both snapshot bundles + the stored diff for the read-only replay. */
export async function loadReplaySnapshots(db: any, rappelId: string): Promise<ReplaySnapshots> {
  const empty: ReplaySnapshots = { before: null, after: null, diff: null };
  if (!db || !rappelId) return empty;
  try {
    const [beforeSnap, afterSnap] = await Promise.all([
      getDoc(snapshotRef(db, rappelId, SNAP_BEFORE)),
      getDoc(snapshotRef(db, rappelId, SNAP_AFTER)),
    ]);
    const before = beforeSnap.exists() ? readSnapshotBundle(beforeSnap.data()) : null;
    const afterData = afterSnap.exists() ? (afterSnap.data() as any) : null;
    const after = afterData ? readSnapshotBundle(afterData) : null;
    return { before, after, diff: afterData?.diff ?? null };
  } catch (err) {
    console.warn('[rappel-session] loadReplaySnapshots failed', err);
    return empty;
  }
}

/** Mark the rappel treated. */
export async function markTreatmentResolved(db: any, rappelId: string): Promise<void> {
  if (!db || !rappelId) return;
  await updateDoc(doc(db, 'rappels', rappelId), { resolvedAt: serverTimestamp() });
}
