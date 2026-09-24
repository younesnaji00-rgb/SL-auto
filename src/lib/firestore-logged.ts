/**
 * Logging wrappers around the Firestore read primitives.
 *
 * Firestore reads never appear in the network tab as JSON, so they are the one
 * half of the data flow that `[apiFetch]` cannot show. These drop-in
 * replacements log every snapshot under `[firestore]` before handing it to the
 * caller, which completes the backend ↔ frontend picture:
 *
 *   [firestore]  what the database returned
 *   [apiFetch]   what the API returned
 *   [frontend]   what the UI derived from either
 *
 * Import these instead of the `firebase/firestore` originals; the signatures
 * and return values are identical, so call sites do not change. Because
 * `useCollection` and `useDoc` are built on `onSnapshot`, every component
 * using those hooks is covered too.
 *
 * Each snapshot log carries `fromCache` and `hasPendingWrites`: a UI showing
 * values the server does not have is usually a cached or not-yet-committed
 * snapshot, and those two flags say so immediately.
 */

import {
  getDoc as _getDoc,
  getDocs as _getDocs,
  onSnapshot as _onSnapshot,
} from 'firebase/firestore';

/** Best-effort path for a DocumentReference, CollectionReference or Query. */
function describeRef(ref: any): string {
  try {
    if (!ref) return 'unknown';
    if (typeof ref.path === 'string') return ref.path;
    // Queries expose no public path — read the internal one, guarded.
    const segments = ref?._query?.path?.segments;
    if (Array.isArray(segments) && segments.length > 0) return segments.join('/');
    return ref?.type ?? 'query';
  } catch {
    return 'unknown';
  }
}

/** Flattens a QuerySnapshot or DocumentSnapshot into plain, inspectable data. */
function describeSnapshot(snap: any): unknown {
  // QuerySnapshot — only it carries a `docs` array.
  if (snap && Array.isArray(snap.docs)) {
    return {
      kind: 'query',
      size: snap.size,
      empty: snap.empty,
      fromCache: snap.metadata?.fromCache,
      hasPendingWrites: snap.metadata?.hasPendingWrites,
      docs: snap.docs.map((d: any) => ({ id: d.id, path: d.ref?.path, ...d.data() })),
    };
  }
  return {
    kind: 'doc',
    id: snap?.id,
    path: snap?.ref?.path,
    exists: typeof snap?.exists === 'function' ? snap.exists() : undefined,
    fromCache: snap?.metadata?.fromCache,
    hasPendingWrites: snap?.metadata?.hasPendingWrites,
    data: typeof snap?.data === 'function' ? snap.data() : undefined,
  };
}

function logRead(op: string, ref: unknown, snap: unknown): void {
  try {
    console.log(`[firestore] ${op} ${describeRef(ref)}`, describeSnapshot(snap));
  } catch {
    // Diagnostics must never break the read they are observing.
  }
}

export const getDoc = (async (...args: any[]) => {
  const snap = await (_getDoc as any)(...args);
  logRead('getDoc', args[0], snap);
  return snap;
}) as typeof _getDoc;

export const getDocs = (async (...args: any[]) => {
  const snap = await (_getDocs as any)(...args);
  logRead('getDocs', args[0], snap);
  return snap;
}) as typeof _getDocs;

/**
 * `onSnapshot` has many overloads: the success handler may be the 2nd or 3rd
 * argument (an options object can precede it), or a `next` method on an
 * observer. Wrap whichever form was used and pass everything else through
 * untouched, so error/completion handling is unaffected.
 */
export const onSnapshot = ((...args: any[]) => {
  const ref = args[0];
  const patched = [...args];

  const nextIdx = args.findIndex((a, i) => i >= 1 && typeof a === 'function');
  const observerIdx = args.findIndex(
    (a, i) => i >= 1 && a && typeof a === 'object' && typeof a.next === 'function'
  );

  if (nextIdx !== -1) {
    const onNext = args[nextIdx];
    patched[nextIdx] = (snap: any) => {
      logRead('onSnapshot', ref, snap);
      return onNext(snap);
    };
  } else if (observerIdx !== -1) {
    const observer = args[observerIdx];
    patched[observerIdx] = {
      ...observer,
      next: (snap: any) => {
        logRead('onSnapshot', ref, snap);
        return observer.next(snap);
      },
    };
  }

  return (_onSnapshot as any)(...patched);
}) as typeof _onSnapshot;
