/**
 * Rappel treatment-session snapshots & diffing.
 *
 * When a gestionnaire opens a dossier from "Mes rappels", we snapshot the
 * dossier document at the start of the session (`snapshotBefore`) and again
 * when they click "Valider le traitement" (`snapshotAfter`). The set of
 * dot-paths that differ between the two (`changedPaths`) is what the manager's
 * read-only replay highlights in yellow — i.e. exactly the fields the
 * gestionnaire touched during their treatment window.
 *
 * Everything here is pure (no Firestore imports) so it can be unit-tested and
 * reused on both the write side (capture/diff) and the read side (highlight).
 */

/** Firestore Timestamp | Date | epoch-millis → milliseconds (0 when absent). */
export function tsToMillis(ts: any): number {
  if (ts == null) return 0;
  if (typeof ts.toMillis === 'function') return ts.toMillis();
  if (typeof ts.toDate === 'function') return ts.toDate().getTime();
  if (ts instanceof Date) return ts.getTime();
  if (typeof ts === 'object') {
    // Client SDK JSON form ({seconds,nanoseconds}) and admin SDK JSON form
    // ({_seconds,_nanoseconds}) — both appear after a snapshot is stored as
    // serialized JSON (the write-fallback path) and read back.
    if (typeof ts.seconds === 'number') return ts.seconds * 1000 + Math.floor((ts.nanoseconds || 0) / 1e6);
    if (typeof ts._seconds === 'number') return ts._seconds * 1000 + Math.floor((ts._nanoseconds || 0) / 1e6);
  }
  const n = Number(ts);
  return Number.isFinite(n) ? n : 0;
}

/**
 * True for anything that represents an instant in time: a live Firestore
 * Timestamp, a Date, or a JSON-roundtripped timestamp ({seconds,…} /
 * {_seconds,…}). Treating these uniformly as scalar leaves keeps the diff
 * stable when one side is a live Timestamp and the other was rehydrated from a
 * JSON snapshot — otherwise every date field would read as "modified".
 */
function isTimestampLike(v: any): boolean {
  if (v == null || typeof v !== 'object') return false;
  if (typeof v.toMillis === 'function' || typeof v.toDate === 'function') return true;
  if (v instanceof Date) return true;
  if (typeof v.seconds === 'number') return true;
  if (typeof v._seconds === 'number') return true;
  return false;
}

/** True for values we treat as scalar "leaves" during diffing. */
function isLeaf(v: any): boolean {
  if (v === null || v === undefined) return true;
  const t = typeof v;
  if (t === 'string' || t === 'number' || t === 'boolean') return true;
  if (v instanceof Date) return true;
  // Firestore Timestamp / GeoPoint / DocumentReference etc. — non-plain objects.
  if (t === 'object') {
    // Time instants (live Timestamp OR JSON-roundtripped {seconds,…}) are leaves.
    if (isTimestampLike(v)) return true;
    const proto = Object.getPrototypeOf(v);
    return proto !== Object.prototype && proto !== null && !Array.isArray(v);
  }
  return true;
}

/**
 * True for values we must recurse into during diffing (plain objects and
 * arrays), EXCLUDING time instants (which are scalar leaves even in their
 * JSON-roundtripped {seconds,…} form). Anything that is not a container is a
 * scalar leaf for diff purposes.
 */
function isContainer(v: any): boolean {
  if (v == null || typeof v !== 'object') return false;
  if (isTimestampLike(v)) return false;
  return Array.isArray(v) || isPlainObject(v);
}

/** True for {} literals we should recurse into. */
function isPlainObject(v: any): boolean {
  if (v === null || typeof v !== 'object' || Array.isArray(v)) return false;
  if (typeof v.toMillis === 'function' || typeof v.toDate === 'function') return false;
  const proto = Object.getPrototypeOf(v);
  return proto === Object.prototype || proto === null;
}

/** Value-equality for leaves, with Timestamp/Date normalised to millis. */
function leafEqual(a: any, b: any): boolean {
  if (a === b) return true;
  const aTime = isTimestampLike(a);
  const bTime = isTimestampLike(b);
  if (aTime || bTime) {
    // Only treat as equal if BOTH are time-like and resolve to the same instant.
    if (aTime && bTime) return tsToMillis(a) === tsToMillis(b);
    return false;
  }
  // Fall back to structural compare for anything that slipped through as a leaf.
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
}

/**
 * Denormalised / volatile fields that mirror data surfaced elsewhere in the
 * replay (status entries, observation cards). Diffing them would double-count,
 * so they are excluded from `changedPaths` by default.
 */
export const DEFAULT_DIFF_IGNORE = [
  // `id` is injected by useDoc() on the "after" side but absent from the raw
  // getDoc() "before" side — ignore it so it isn't reported as a spurious change.
  'id',
  // Status is driven automatically by the workflow, not by the gestionnaire —
  // never count it as one of their modifications.
  'statut',
  'lastObservation',
  'lastStatusChange',
  'updatedAt',
  'lastModified',
  'modifiedAt',
];

export interface DiffOptions {
  /** Top-level dot-paths to skip entirely (defaults to {@link DEFAULT_DIFF_IGNORE}). */
  ignore?: string[];
}

/**
 * Deep-diff two dossier snapshots and return the sorted, de-duplicated set of
 * changed dot-paths (nested objects and arrays included, e.g.
 * `assure.nom`, `garages.2.montant`). A path is reported when a value was
 * added, removed, or changed.
 */
export function diffDocPaths(before: any, after: any, options: DiffOptions = {}): string[] {
  const ignore = new Set(options.ignore ?? DEFAULT_DIFF_IGNORE);
  const changed = new Set<string>();

  const walk = (a: any, b: any, path: string) => {
    if (path && ignore.has(path)) return;

    const aMissing = a === undefined;
    const bMissing = b === undefined;
    if (aMissing && bMissing) return;
    if (aMissing !== bMissing) {
      if (path) changed.add(path);
      return;
    }

    const aLeaf = isLeaf(a);
    const bLeaf = isLeaf(b);

    if (aLeaf || bLeaf) {
      if (aLeaf && bLeaf) {
        if (!leafEqual(a, b) && path) changed.add(path);
      } else if (path) {
        // Shape changed (object↔leaf).
        changed.add(path);
      }
      return;
    }

    const aArr = Array.isArray(a);
    const bArr = Array.isArray(b);
    if (aArr || bArr) {
      if (!aArr || !bArr) {
        if (path) changed.add(path);
        return;
      }
      const len = Math.max(a.length, b.length);
      for (let i = 0; i < len; i++) {
        walk(a[i], b[i], path ? `${path}.${i}` : String(i));
      }
      return;
    }

    // Both plain objects.
    const keys = new Set([...Object.keys(a || {}), ...Object.keys(b || {})]);
    for (const k of keys) {
      walk(a?.[k], b?.[k], path ? `${path}.${k}` : k);
    }
  };

  walk(before ?? {}, after ?? {}, '');
  return Array.from(changed).sort();
}

/** Empty for add/remove semantics: a value the UI would treat as "nothing". */
export function isEmptyVal(v: any): boolean {
  return v === null || v === undefined || v === '';
}

export interface DocPathDiff {
  added: string[];
  modified: string[];
  removed: string[];
}

/**
 * Classify every changed leaf dot-path between two snapshots as added / modified
 * / removed (for green / yellow / red highlighting). "Added" = empty→value,
 * "removed" = value→empty, "modified" = value→different-value.
 *
 * Only SCALAR LEAVES are ever classified. Containers (objects/arrays) are
 * recursed into so an empty object/array appearing opposite `undefined` —
 * e.g. the empty `experts` structure a form save materialises — yields ZERO
 * changes instead of a phantom "added". (Use {@link classifyDossierChanges} to
 * also cancel out form-normalisation noise like field aliases.)
 */
export function classifyDocPaths(before: any, after: any, options: DiffOptions = {}): DocPathDiff {
  const ignore = new Set(options.ignore ?? DEFAULT_DIFF_IGNORE);
  const added = new Set<string>();
  const modified = new Set<string>();
  const removed = new Set<string>();

  const walk = (a: any, b: any, path: string) => {
    if (path && ignore.has(path)) return;

    const aCont = isContainer(a);
    const bCont = isContainer(b);

    // Both scalar leaves → classify this path directly.
    if (!aCont && !bCont) {
      const aE = isEmptyVal(a);
      const bE = isEmptyVal(b);
      if (aE && bE) return;
      if (!path) return;
      if (aE && !bE) added.add(path);
      else if (!aE && bE) removed.add(path);
      else if (!leafEqual(a, b)) modified.add(path);
      return;
    }

    // One side a NON-empty scalar, the other a container → genuine shape change.
    if ((!aCont && !isEmptyVal(a)) || (!bCont && !isEmptyVal(b))) {
      if (path) modified.add(path);
      return;
    }

    // At least one container; the other is a container or empty/absent. Recurse
    // so ONLY real leaf changes count.
    const aArr = Array.isArray(a);
    const bArr = Array.isArray(b);
    if (aArr || bArr) {
      // Array opposite a (non-empty) object → shape change.
      if ((aCont && !aArr) || (bCont && !bArr)) {
        if (path) modified.add(path);
        return;
      }
      const av: any[] = aArr ? a : [];
      const bv: any[] = bArr ? b : [];
      const len = Math.max(av.length, bv.length);
      for (let i = 0; i < len; i++) walk(av[i], bv[i], path ? `${path}.${i}` : String(i));
      return;
    }

    const ao = isPlainObject(a) ? a : {};
    const bo = isPlainObject(b) ? b : {};
    const keys = new Set([...Object.keys(ao), ...Object.keys(bo)]);
    for (const k of keys) walk(ao[k], bo[k], path ? `${path}.${k}` : k);
  };

  walk(before ?? {}, after ?? {}, '');
  return {
    added: Array.from(added).sort(),
    modified: Array.from(modified).sort(),
    removed: Array.from(removed).sort(),
  };
}

/** Parse any date-ish value (Timestamp / Date / ISO string / millis) to millis. */
function toMillisLoose(v: any): any {
  if (v == null || v === '') return null;
  if (isTimestampLike(v)) return tsToMillis(v);
  if (typeof v === 'string') {
    const t = Date.parse(v);
    return Number.isFinite(t) ? t : v;
  }
  if (typeof v === 'number') return v;
  return v;
}

/**
 * Canonicalise a dossier document into the shape the Information tab actually
 * persists, so diffing a pre-save (sparse / legacy-aliased) snapshot against a
 * post-save (normalised) one does NOT report the normalisation as user changes.
 *
 * Mirrors the hydration + save mapping in
 * src/app/(app)/dossiers/[id]/information-tab.tsx (assuré name concatenation,
 * véhicule legacy aliases, expert-rank default, flat field aliases, date
 * normalisation). Keep in sync if that mapping changes.
 */
export function canonicalizeDossierForDiff(d: any): any {
  if (!d || typeof d !== 'object') return {};
  const out: any = { ...d };

  // Assuré: object-or-legacy-string; name is stored concatenated with prénom.
  const rawAssure = typeof d.assure === 'object' && d.assure
    ? d.assure
    : { nom: typeof d.assure === 'string' ? d.assure : '' };
  out.assure = {
    nom: `${rawAssure.nom || ''} ${rawAssure.prenom || ''}`.trim(),
    telephone: rawAssure.telephone || '',
    whatsapp: rawAssure.whatsapp || '',
    telephone2: rawAssure.telephone2 || '',
    email: rawAssure.email || '',
    adresse: rawAssure.adresse || '',
    cin: rawAssure.cin || '',
  };

  // Véhicule: legacy aliases folded into canonical keys.
  const v = d.vehicule && typeof d.vehicule === 'object' ? d.vehicule : {};
  out.vehicule = {
    marque: v.marque || v.brand || '',
    modele: v.modele || v.model || '',
    immatriculation: v.immatriculation || v.registration || '',
    immatriculationAnterieur: v.immatriculationAnterieur || '',
    serie: v.serie || '',
    energie: v.energie || '',
    puissance: v.puissance || v.puissanceFiscale || '',
    mec: toMillisLoose(v.mec),
    km: v.km || v.kilometrage || '',
  };

  // Expert role default + date normalisation.
  const rawRank = d.expertRank;
  out.expertRank = rawRank === '1er' || rawRank === '2eme' || rawRank === 'arbitre' ? rawRank : '1er';
  out.dateSinistre = toMillisLoose(d.dateSinistre);
  out.dateRequete = toMillisLoose(d.dateRequete);

  // Flat field aliases.
  out.referenceCompagnie = d.referenceCompagnie || d.companyRef || '';
  out.adverseNom = d.adverseNom ?? d.partieAdverse?.assure ?? '';
  out.adverseCompagnie = d.adverseCompagnie ?? d.partieAdverse?.compagnie ?? '';
  out.adverseMatricule = d.adverseMatricule ?? d.partieAdverse?.matricule ?? '';
  out.intermediaireNom = d.intermediaireNom ?? d.intermediaryName ?? '';
  out.intermediaireEmail = d.intermediaireEmail ?? d.intermediaryEmail ?? '';

  // Drop the now-folded legacy keys so they don't diff on their own.
  delete out.companyRef;
  delete out.partieAdverse;
  delete out.intermediaryName;
  delete out.intermediaryEmail;

  return out;
}

/**
 * Diff two dossier documents the way the manager's replica should see them:
 * both sides canonicalised first so form-save normalisation never shows up as a
 * gestionnaire change. This is the entry point the replay/snapshot code uses.
 */
export function classifyDossierChanges(before: any, after: any, options: DiffOptions = {}): DocPathDiff {
  return classifyDocPaths(canonicalizeDossierForDiff(before), canonicalizeDossierForDiff(after), options);
}

/** Normalise a value tree for stable structural comparison (Timestamps→ms). */
function normalizeDeep(v: any): any {
  if (v == null) return v;
  if (isTimestampLike(v)) return tsToMillis(v);
  if (Array.isArray(v)) return v.map(normalizeDeep);
  if (isPlainObject(v)) {
    const out: Record<string, any> = {};
    for (const k of Object.keys(v).sort()) out[k] = normalizeDeep(v[k]);
    return out;
  }
  return v;
}

export interface CollectionDiff {
  added: string[];
  removed: string[];
  modified: string[];
}

/**
 * Diff two subcollection snapshots (arrays of docs carrying `id`) by id:
 * added = present only in after, removed = present only in before, modified =
 * present in both with differing content. `ignore` lists per-doc fields to skip
 * when comparing for "modified".
 */
export function diffCollectionById(
  beforeArr: any[] | undefined,
  afterArr: any[] | undefined,
  ignore: string[] = ['id'],
): CollectionDiff {
  const ig = new Set(ignore);
  const strip = (d: any) => {
    const o: Record<string, any> = {};
    for (const k of Object.keys(d || {})) if (!ig.has(k)) o[k] = d[k];
    return JSON.stringify(normalizeDeep(o));
  };
  const bMap = new Map<string, any>((beforeArr || []).map((d) => [d.id, d]));
  const aMap = new Map<string, any>((afterArr || []).map((d) => [d.id, d]));
  const added: string[] = [];
  const removed: string[] = [];
  const modified: string[] = [];
  for (const id of aMap.keys()) if (!bMap.has(id)) added.push(id);
  for (const id of bMap.keys()) if (!aMap.has(id)) removed.push(id);
  for (const id of aMap.keys()) {
    if (bMap.has(id) && strip(bMap.get(id)) !== strip(aMap.get(id))) modified.push(id);
  }
  return { added, removed, modified };
}

/** Status of a config field path given a {added,modified,removed} diff. */
export function docPathStatus(diff: DocPathDiff | undefined, path: string): 'added' | 'modified' | 'removed' | null {
  if (!diff) return null;
  if (isPathChanged(diff.removed, path)) return 'removed';
  if (isPathChanged(diff.added, path)) return 'added';
  if (isPathChanged(diff.modified, path)) return 'modified';
  return null;
}

/** Read a value off an object by dot-path (`a.b.2.c`). */
export function getByPath(obj: any, path: string): any {
  if (!obj || !path) return undefined;
  const parts = path.replace(/\[(\d+)\]/g, '.$1').split('.');
  let cur = obj;
  for (const p of parts) {
    if (cur == null) return undefined;
    cur = cur[p];
  }
  return cur;
}

/**
 * Whether `path` should be highlighted given the set of changed paths.
 * Matches the exact path, any ancestor (a parent object/array changed), and
 * any descendant (a child field changed). This lets a field rendered as
 * `assure.nom` highlight when the whole `assure` object was replaced, and a
 * section rendered as `assure` highlight when only `assure.nom` changed.
 */
export function isPathChanged(changedPaths: string[] | Set<string> | undefined, path: string): boolean {
  if (!changedPaths || !path) return false;
  const list = Array.isArray(changedPaths) ? changedPaths : Array.from(changedPaths);
  for (const c of list) {
    if (c === path) return true;
    if (c.startsWith(path + '.')) return true;
    if (path.startsWith(c + '.')) return true;
  }
  return false;
}

/**
 * Recursively strip `undefined` values (which Firestore rejects) while
 * preserving Timestamps, Dates and other non-plain objects intact. Returns a
 * structure safe to write back to Firestore as a snapshot.
 */
export function sanitizeForFirestore<T = any>(value: T): T {
  if (value === undefined) return undefined as any;
  if (Array.isArray(value)) {
    return value
      .filter((v) => v !== undefined)
      .map((v) => sanitizeForFirestore(v)) as any;
  }
  if (isPlainObject(value)) {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(value as Record<string, any>)) {
      if (v === undefined) continue;
      out[k] = sanitizeForFirestore(v);
    }
    return out as any;
  }
  return value;
}

/** Whether a subcollection entry falls inside the treatment window. */
export function isWithinWindow(
  entryTs: any,
  startTs: any,
  endTs: any,
): boolean {
  const t = tsToMillis(entryTs);
  if (!t) return false;
  const start = tsToMillis(startTs);
  if (start && t < start) return false;
  const end = tsToMillis(endTs);
  if (end && t > end) return false;
  return true;
}

/**
 * Whether a subcollection entry (observation / historique / workflow /
 * document / photo) belongs to a given rappel treatment session — either it
 * carries the explicit `rappelSessionId` tag, or (for legacy / untagged
 * collections) it was created inside the [start, end] window.
 */
export function entryBelongsToSession(
  entry: any,
  sessionId: string | null | undefined,
  startTs: any,
  endTs: any,
  tsField: string = 'createdAt',
): boolean {
  if (!entry) return false;
  if (sessionId && entry.rappelSessionId === sessionId) return true;
  if (entry.rappelSessionId && entry.rappelSessionId !== sessionId) return false;
  return isWithinWindow(entry[tsField], startTs, endTs);
}
