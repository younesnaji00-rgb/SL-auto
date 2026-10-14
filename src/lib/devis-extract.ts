import { arrayUnion, collection, doc, query, serverTimestamp, updateDoc, where, type Firestore } from 'firebase/firestore';
import { getDoc, getDocs } from './firestore-logged';
import { getDownloadURL, ref as storageRef, type FirebaseStorage } from 'firebase/storage';
import { apiFetch } from '@/lib/api-fetch';
import {
  emptyHeader, formatFr, isEditableDocType, numOrNull, qteFromScan, toBaseEditableDocType,
  type DevisExtraColumn, type DevisHeader, type DevisRow, type DevisScanSource, type EditableDocType, type StructuredDevis,
} from './devis-schema';
import type { ScanDevisCounterOutput } from './scan-devis-counter-schema';
import { logFrontend } from './debug-log';

export interface ExtractAndPersistParams {
  db: Firestore;
  storage: FirebaseStorage;
  chiffrageId: string;
  /** The document type to extract — only files with this docType are processed. */
  docType: EditableDocType;
  /** If true, bypass idempotent guards and overwrite any existing entry. */
  force?: boolean;
}

export type ExtractResult =
  | {
      ok: true;
      reason: 'already-extracted' | 'already-attempted' | 'no-files' | 'extracted' | 'counter-only';
      structuredDevis?: StructuredDevis;
      /**
       * Task #35: arithmetic mismatches surfaced by `/api/scan-devis` (task #34).
       * Populated on a fresh original-scan; empty on the idempotent no-op paths
       * (`already-extracted`, `already-attempted`, `no-files`, `counter-only`).
       * Forwarded to the editor so the scan-warning dialog can render them as
       * bullets under its body copy.
       */
      calculationErrors: string[];
      /**
       * The source files changed since the table was read (tester
       * 2026-10-14): how many were read anew, how many left with their rows.
       */
      sourceChange?: { added: number; removed: number };
    }
  | { ok: false; reason: 'missing-chiffrage' | 'fetch-failed' | 'api-failed' | 'persist-failed' | 'no-original-for-counter' | 'service-overloaded'; error?: string };

/**
 * Per-docType extractor.
 *
 * For `Facture`: downloads every file of docType, asks Gemini to extract
 * header + rows, merges them, and persists.
 *
 * For `Devis`: 2-phase.
 *   Phase 1 (originals — `devisVariant === 'original'` or missing): same as
 *     Facture flow. Establishes the header + rows.
 *   Phase 2 (counters — `devisVariant === 'counter'`): for each counter file
 *     not yet processed (dedup by `sourceStoragePath`), calls
 *     `/api/scan-devis-counter` seeded with the now-established row
 *     designations, and appends a red `DevisExtraColumn` with the matched
 *     counter-prices.
 *
 * Idempotent:
 *   - If originals already extracted AND no unprocessed counter files exist,
 *     returns `already-extracted` without touching the backend.
 *   - If originals are missing but only counter files are present, returns
 *     `no-original-for-counter` — the UI surfaces this and the gestionnaire
 *     must upload an original before counters can be processed.
 *
 * Safe to fire-and-forget from UI flows (assignment, editor load).
 */
export async function extractAndPersistChiffrageDevis(
  { db, storage, chiffrageId, docType, force = false }: ExtractAndPersistParams
): Promise<ExtractResult> {
  const docRef = doc(db, 'chiffrages', chiffrageId);

  try {
    const snap = await getDoc(docRef);
    if (!snap.exists()) return { ok: false, reason: 'missing-chiffrage' };

    const data = snap.data() as any;
    const editables = (data.structuredEditables || {}) as Record<string, StructuredDevis>;
    const attempts = (data.editableExtractionAttempted || {}) as Record<string, boolean>;

    const files: any[] = Array.isArray(data.files) ? data.files : [];
    // One entry per stored file, and only files the dossier still holds under
    // this type (QA Chiffreur 008): a deleted or re-filed devis/facture kept
    // its entry here, and a re-scan merged its lines in a second time.
    const live = await liveSourceDocs(db, data.dossierId, docType);
    const livePaths = live?.paths ?? null;
    const seenPaths = new Set<string>();
    const targetFiles = files.filter((f: any) => {
      if (f?.docType !== docType || !f?.storagePath || seenPaths.has(f.storagePath)) return false;
      seenPaths.add(f.storagePath);
      return !livePaths || livePaths.has(f.storagePath);
    });
    // A devis / facture the dossier holds under this type that the chiffrage
    // never received — dropped in the Pièces socket, moved from another slot,
    // imported after the assignment: it is read too, and joins the
    // chiffrage's files so the editor shows it (tester 2026-10-14: a devis
    // imported on a new dossier left the table empty).
    const unsent = (live?.files ?? []).filter((f) => !seenPaths.has(f.storagePath));
    // …and a file of this type the dossier no longer holds leaves the list,
    // so the editor stops counting and showing a deleted devis.
    const gone = livePaths
      ? files.filter((f: any) => f?.docType === docType && f?.storagePath && !livePaths.has(f.storagePath))
      : [];
    if (unsent.length > 0) targetFiles.push(...unsent);
    if (unsent.length > 0 || gone.length > 0) {
      try {
        await updateDoc(docRef, {
          ...(gone.length > 0
            ? { files: [...files.filter((f: any) => !gone.includes(f)), ...unsent.map((f) => ({ ...f, status: 'pending', recognizedText: null, pdfUrl: null }))] }
            : { files: arrayUnion(...unsent.map((f) => ({ ...f, status: 'pending', recognizedText: null, pdfUrl: null }))) }),
          updatedAt: serverTimestamp(),
        });
      } catch (e) {
        console.warn('[devis-extract] could not bring the chiffrage files in line with the dossier', e);
      }
    }

    if (targetFiles.length === 0) {
      return { ok: true, reason: 'no-files', calculationErrors: [] };
    }

    // Variant split — only relevant for Devis (base or numbered extra). Facture has no variants.
    const isDevis = toBaseEditableDocType(docType) === 'Devis Garage';
    const originalFiles = isDevis
      ? targetFiles.filter((f) => (f.devisVariant ?? 'original') === 'original')
      : targetFiles;
    const counterFiles = isDevis
      ? targetFiles.filter((f) => f.devisVariant === 'counter')
      : [];

    let existing: StructuredDevis | null = editables[docType] || null;

    // Task #35: aggregated per-file `calculationErrors` from /api/scan-devis,
    // forwarded to the editor's scan-warning dialog on a fresh extraction.
    const aggregatedCalculationErrors: string[] = [];

    // Phase 1: originals. The table follows its source files (tester
    // 2026-10-14: a devis deleted and another imported left the old lines in
    // the chiffreur's table — nothing re-read it once a table existed):
    //  - no table, one without a line, or « Ré-extraire » → every original
    //    is read;
    //  - a table that knows its files (scanSources) → the new files are read
    //    and merged, the rows of the files that left are dropped, rows typed
    //    by hand stay (mergeScannedFile / pruneDeadScanSources);
    //  - a table from before scanSources → left as it is.
    // A failed read no longer marks the type « attempted » for good: the next
    // trigger (an upload, the editor opening) tries again.
    void attempts;
    const liveOriginalPaths = new Set<string>(originalFiles.map((f) => f.storagePath));
    const hasRows = !!existing && existing.rows.some((r) => (r.designation || '').trim() !== '' || Number(r.puHT) > 0);
    let mode: 'full' | 'incremental' | 'none' = 'none';
    let incrementalFiles: any[] = [];
    let removedSources = 0;
    if (force || !existing || !hasRows) {
      mode = 'full';
    } else if (existing.scanSources && livePaths) {
      // Only when the dossier vouches for its files: with an empty slot (or
      // legacy documents) a stale entry of the chiffrage's list would read as
      // « new » — a deleted devis fetched again, a moved one merged back.
      const known = new Set(existing.scanSources.map((s) => s.storagePath));
      incrementalFiles = originalFiles.filter((f) => !known.has(f.storagePath));
      removedSources = existing.scanSources.filter((s) => !liveOriginalPaths.has(s.storagePath)).length;
      if (incrementalFiles.length > 0 || removedSources > 0) mode = 'incremental';
    }
    const needsOriginalExtract = mode === 'full';
    let sourceChange: { added: number; removed: number } | undefined;
    let partialFailure: { reason: 'api-failed' | 'service-overloaded'; error: string } | null = null;

    if (mode === 'incremental' && existing) {
      let next: StructuredDevis = pruneDeadScanSources(existing, liveOriginalPaths);
      const reads = await Promise.all(incrementalFiles.map((file) => scanOriginal(storage, file)));
      let added = 0;
      incrementalFiles.forEach((file, i) => {
        const r = reads[i];
        if (!r.ok) return;
        const rows = rowsFromScan(r.parsed);
        if (Array.isArray(r.calculationErrors)) aggregatedCalculationErrors.push(...r.calculationErrors);
        next = mergeScannedFile(next, { source: sourceFromScan(file.storagePath, rows, r.parsed), rows, header: r.parsed.header || {} }, liveOriginalPaths);
        added += 1;
      });
      if (added < incrementalFiles.length) {
        const overloaded = reads.some((r) => !r.ok && isOverloadMessage((r as { error?: string }).error));
        partialFailure = overloaded
          ? { reason: 'service-overloaded', error: 'Le service IA est momentanément surchargé.' }
          : { reason: 'api-failed', error: `Un ${docType.toLowerCase()} n'a pas pu être lu.` };
      }
      if (added > 0 || removedSources > 0) {
        existing = next;
        sourceChange = { added, removed: removedSources };
      }
    }

    if (needsOriginalExtract) {
      if (originalFiles.length === 0) {
        // Counter-only case — cannot proceed without rows.
        return { ok: false, reason: 'no-original-for-counter', error: "Aucun devis original trouvé pour ce dossier." };
      }

      const originalExtractions = await Promise.all(
        originalFiles.map((file) => scanOriginal(storage, file))
      );
      const successful = originalExtractions.filter((r) => r.ok) as Array<{ ok: true; parsed: any; calculationErrors: string[] }>;

      if (successful.length === 0) {
        // Distinguish a transient service-overload (503/UNAVAILABLE/high demand)
        // from a permanent api failure. On overload we DON'T mark attempted —
        // the chiffreur can retry naturally a few minutes later.
        const overloaded = originalExtractions.some((r) => !r.ok && isOverloadMessage((r as { error?: string }).error));
        if (overloaded) {
          return { ok: false, reason: 'service-overloaded', error: 'Le service IA est momentanément surchargé.' };
        }
        return { ok: false, reason: 'api-failed', error: `Aucun ${docType.toLowerCase()} n'a pu être lu.` };
      }

      for (const s of successful) {
        if (Array.isArray(s.calculationErrors)) aggregatedCalculationErrors.push(...s.calculationErrors);
      }

      const mergedHeader: DevisHeader = emptyHeader();
      for (const { parsed } of successful) {
        const h = parsed.header || {};
        (Object.keys(mergedHeader) as Array<keyof DevisHeader>).forEach((k) => {
          if (!mergedHeader[k] && h[k]) mergedHeader[k] = String(h[k]);
        });
      }

      // Rows keep track of the file they came from (scanSources), with the
      // totals printed on it — the editor compares them with its own sum.
      const mergedRows: DevisRow[] = [];
      const scanSources: DevisScanSource[] = [];
      originalFiles.forEach((file, i) => {
        const r = originalExtractions[i];
        if (!r.ok) return;
        const rows = rowsFromScan(r.parsed);
        mergedRows.push(...rows);
        scanSources.push(sourceFromScan(file.storagePath, rows, r.parsed));
      });

      existing = {
        header: mergedHeader,
        rows: mergedRows,
        versions: existing?.versions || [],
        extraColumns: existing?.extraColumns || [],
        scanSources,
      };
    }

    // Phase 2: counters (Devis only, and only when we have rows to match against)
    let counterColumnsAdded = 0;
    // A counter-devis that left the dossier takes its column with it.
    let counterColumnsRemoved = 0;
    if (isDevis && existing && livePaths && Array.isArray(existing.extraColumns)) {
      const kept = existing.extraColumns.filter((c) => c.kind !== 'counter' || !c.sourceStoragePath || livePaths.has(c.sourceStoragePath));
      counterColumnsRemoved = existing.extraColumns.length - kept.length;
      if (counterColumnsRemoved > 0) existing = { ...existing, extraColumns: kept };
    }
    if (isDevis && counterFiles.length > 0 && existing && existing.rows.length > 0) {
      const currentColumns = Array.isArray(existing.extraColumns) ? existing.extraColumns : [];
      const processedPaths = new Set(
        currentColumns
          .filter((c) => c.kind === 'counter' && c.sourceStoragePath)
          .map((c) => c.sourceStoragePath as string)
      );

      const unprocessed = counterFiles
        .filter((f) => !processedPaths.has(f.storagePath))
        .sort((a, b) => (a.counterRoundOrder || 999) - (b.counterRoundOrder || 999));

      if (unprocessed.length > 0) {
        const rowsForMatch = existing.rows.map((r) => ({ id: r.id, designation: r.designation }));

        // Sequential (not parallel) so each column is appended in round order.
        const newColumns: DevisExtraColumn[] = [];
        for (const file of unprocessed) {
          try {
            const url = await getDownloadURL(storageRef(storage, file.storagePath));
            const res = await fetch(url);
            if (!res.ok) throw new Error(`fetch ${res.status}`);
            const blob = await res.blob();
            const contentType = scanContentType(blob, file);
            const base64 = await blobToBase64(blob);

            const r = await apiFetch('/api/scan-devis-counter', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                fileBase64: base64,
                contentType,
                rows: rowsForMatch,
              }),
            });
            if (!r.ok) throw new Error(`api ${r.status}`);
            const out: ScanDevisCounterOutput = await r.json();

            const values: Record<string, string> = {};
            for (const m of out.matches || []) {
              if (m.counterPrice != null) values[m.rowId] = formatFr(m.counterPrice);
            }
            logFrontend('devis-extract ← /api/scan-devis-counter', { matches: out.matches, values });

            const col: DevisExtraColumn = {
              id: newId(),
              label: file.counterRoundLabel || 'Contre-devis',
              values,
              kind: 'counter',
              sourcePdfUrl: url,
              sourceStoragePath: file.storagePath,
              importedAt: new Date().toISOString(),
            };
            newColumns.push(col);
          } catch (e) {
            console.error('[devis-extract] counter scan failed for', file.storagePath, e);
          }
        }

        if (newColumns.length > 0) {
          existing = {
            ...existing,
            extraColumns: [...currentColumns, ...newColumns],
          };
          counterColumnsAdded = newColumns.length;
        }
      }
    }

    // Short-circuit: nothing changed → no write, no counter-only error.
    if (!needsOriginalExtract && !sourceChange && counterColumnsAdded === 0 && counterColumnsRemoved === 0) {
      if (partialFailure) return { ok: false, ...partialFailure };
      return { ok: true, reason: 'already-extracted', structuredDevis: existing || undefined, calculationErrors: [] };
    }

    if (!existing) {
      // Shouldn't happen given the logic above, but guard for TS.
      return { ok: false, reason: 'persist-failed', error: 'No structured devis to persist.' };
    }

    try {
      const fresh = await getDoc(docRef);
      if (!fresh.exists()) return { ok: false, reason: 'missing-chiffrage' };
      const freshData = fresh.data() as any;
      const freshAttempts = (freshData.editableExtractionAttempted || {}) as Record<string, boolean>;
      await updateDoc(docRef, {
        [`structuredEditables.${docType}`]: existing,
        editableExtractionAttempted: { ...freshAttempts, [docType]: true },
        updatedAt: serverTimestamp(),
      });
    } catch (e: any) {
      return { ok: false, reason: 'persist-failed', error: e?.message };
    }

    return {
      ok: true,
      reason: needsOriginalExtract || sourceChange ? 'extracted' : 'counter-only',
      structuredDevis: existing,
      calculationErrors: needsOriginalExtract || sourceChange ? aggregatedCalculationErrors : [],
      ...(sourceChange ? { sourceChange } : {}),
    };
  } catch (e: any) {
    return { ok: false, reason: 'persist-failed', error: e?.message };
  }
}

/**
 * Dossier-side eager extraction. Runs when the gestionnaire uploads a
 * Devis Garage / Facture Garage document to `dossiers/{id}/documents` — scans
 * the single file, appends its rows to any existing
 * `dossiers/{id}.structuredEditables[docType]`, and writes back. By the time
 * the chiffrage is created, the data is already there and can be seeded into
 * the new chiffrage doc.
 *
 * Handles originals only. Counter-devis are processed at chiffrage time
 * (Phase 2 of `extractAndPersistChiffrageDevis`) since they need the
 * established rows from the originals to row-match against.
 *
 * Fire-and-forget safe. Failures are swallowed and logged.
 */
export async function extractAndPersistDossierDoc({
  db, storage, dossierId, docType, storagePath, name, skipAIScan,
}: {
  db: Firestore;
  storage: FirebaseStorage;
  dossierId: string;
  docType: EditableDocType;
  storagePath: string;
  name?: string;
  /**
   * When true (set on pieces-jointes produced by the gestionnaire devis editor),
   * bypass the AI extractor entirely — the structured data was provided by the
   * gestionnaire via the editor table and is already mirrored into
   * `dossiers.structuredEditables[docType]` by
   * `saveGestionnaireDevisAsPieceJointe`.
   */
  skipAIScan?: boolean;
}): Promise<ExtractResult> {
  if (skipAIScan) {
    return { ok: true, reason: 'already-extracted', calculationErrors: [] };
  }
  const dossierRef = doc(db, 'dossiers', dossierId);

  try {
    const result = await scanOriginal(storage, { storagePath, name });
    if (!result.ok) {
      return { ok: false, reason: 'api-failed', error: result.error };
    }

    const parsed = result.parsed;
    const rows = rowsFromScan(parsed);
    if (rows.length === 0) {
      return { ok: true, reason: 'no-files', calculationErrors: [] };
    }

    // Merge with the existing extraction FILE BY FILE (QA Chiffreur 008).
    // Rows used to be appended blindly: the same facture scanned twice (a
    // re-classified drop, or deleted and imported again) doubled the table,
    // and a deleted document's lines stayed in it for good.
    const snap = await getDoc(dossierRef);
    const existing = (snap.data()?.structuredEditables?.[docType] ?? null) as StructuredDevis | null;
    const live = (await liveSourcePaths(db, dossierId, docType)) ?? new Set<string>();
    live.add(storagePath);

    const structured = mergeScannedFile(
      existing,
      { source: sourceFromScan(storagePath, rows, parsed), rows, header: parsed.header || {} },
      live,
    );

    await updateDoc(dossierRef, {
      [`structuredEditables.${docType}`]: structured,
      updatedAt: serverTimestamp(),
    });

    return { ok: true, reason: 'extracted', structuredDevis: structured, calculationErrors: result.calculationErrors };
  } catch (e: any) {
    return { ok: false, reason: 'persist-failed', error: e?.message };
  }
}

async function scanOriginal(
  storage: FirebaseStorage,
  file: any
): Promise<{ ok: true; parsed: any; calculationErrors: string[] } | { ok: false; error?: string }> {
  try {
    const url = await getDownloadURL(storageRef(storage, file.storagePath));
    const res = await fetch(url);
    if (!res.ok) throw new Error(`fetch ${res.status}`);
    const blob = await res.blob();
    const contentType = scanContentType(blob, file);
    const base64 = await blobToBase64(blob);

    const r = await apiFetch('/api/scan-devis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileBase64: base64, contentType }),
    });
    if (!r.ok) {
      // Pull the server error body so the browser console shows the actual
      // cause (missing API key, model unavailable, Google safety block, etc.)
      // instead of the generic "api 500".
      let bodyDetail = '';
      try {
        const bodyText = await r.text();
        if (bodyText) {
          try {
            const bodyJson = JSON.parse(bodyText);
            bodyDetail = bodyJson?.error || bodyText;
          } catch {
            bodyDetail = bodyText;
          }
        }
      } catch {
        /* ignore */
      }
      throw new Error(`api ${r.status}${bodyDetail ? ` — ${bodyDetail}` : ''}`);
    }
    const parsed = await r.json();
    const calculationErrors: string[] = Array.isArray(parsed?.calculationErrors) ? parsed.calculationErrors : [];
    logFrontend('devis-extract ← /api/scan-devis', { parsed, calculationErrors });
    return { ok: true, parsed, calculationErrors };
  } catch (e: any) {
    const msg = String(e?.message || '').toLowerCase();
    const isOverload = msg.includes('unavailable')
      || msg.includes('overloaded')
      || msg.includes('high demand')
      || msg.includes(' 503')
      || msg.startsWith('api 503');
    if (isOverload) {
      // Transient upstream condition — log as warn to keep the dev console clean.
      console.warn('[devis-extract] original scan deferred (service overloaded):', file?.storagePath);
    } else {
      console.error('[devis-extract] original scan failed for', file?.storagePath, e);
    }
    return { ok: false, error: e?.message };
  }
}

/** Table rows from one `/api/scan-devis` response. */
function rowsFromScan(parsed: any): DevisRow[] {
  return (Array.isArray(parsed?.rows) ? parsed.rows : []).map((r: any) => ({
    id: newId(),
    ref: r.ref || 'CHANGE',
    designation: r.designation || '',
    type: r.type || '',
    tva: numOrNull(r.tva),
    qte: qteFromScan(r.qte),
    puHT: numOrNull(r.puHT) ?? 0,
  }));
}

function sourceFromScan(storagePath: string, rows: DevisRow[], parsed: any): DevisScanSource {
  const printed = parsed?.printedTotals || {};
  return {
    storagePath,
    rowIds: rows.map((r) => r.id),
    printedTotalHT: numOrNull(printed.ht),
    printedTotalTTC: numOrNull(printed.ttc),
  };
}

/**
 * Storage paths of the documents the dossier currently files under `docType`,
 * or null when that can't be told (no dossier, a read error, or a document
 * without its path — older uploads) so callers keep every file rather than
 * dropping a good one.
 */
async function liveSourcePaths(db: Firestore, dossierId: string | undefined, docType: EditableDocType): Promise<Set<string> | null> {
  return (await liveSourceDocs(db, dossierId, docType))?.paths ?? null;
}

/** A dossier document of an editable type, as a chiffrage `files` entry. */
interface LiveSourceFile {
  name: string;
  storagePath: string;
  type: 'rapport';
  docType: EditableDocType;
  devisVariant?: 'original' | 'counter';
  counterRoundLabel?: string;
  counterRoundOrder?: number;
}

/**
 * The documents the dossier files under `docType`: their paths (an upload
 * still on its way counts — its rows are not to be dropped) and the files
 * actually stored, as chiffrage `files` entries. Null when that can't be
 * told (no dossier, a read error, an empty slot, or a stored document without
 * its path — older uploads) so callers keep every file rather than dropping a
 * good one. An empty slot placeholder (« + », no file, no path) is skipped.
 */
async function liveSourceDocs(
  db: Firestore,
  dossierId: string | undefined,
  docType: EditableDocType,
): Promise<{ paths: Set<string>; files: LiveSourceFile[] } | null> {
  if (!dossierId) return null;
  try {
    const snap = await getDocs(query(collection(db, 'dossiers', dossierId, 'documents'), where('type', '==', docType)));
    const paths = new Set<string>();
    const files: LiveSourceFile[] = [];
    for (const d of snap.docs) {
      const x = d.data() as any;
      const p = x?.storagePath;
      if (typeof p !== 'string' || !p) {
        if (!x?.url) continue; // slot placeholder: nothing filed yet
        return null;
      }
      paths.add(p);
      if (!x.url || x.pendingUpload) continue;
      files.push({
        name: x.nom || x.name || 'document.pdf',
        storagePath: p,
        type: 'rapport',
        docType,
        ...(x.devisVariant ? { devisVariant: x.devisVariant } : {}),
        ...(x.counterRoundLabel ? { counterRoundLabel: x.counterRoundLabel } : {}),
        ...(typeof x.counterRoundOrder === 'number' ? { counterRoundOrder: x.counterRoundOrder } : {}),
      });
    }
    return paths.size > 0 ? { paths, files } : null;
  } catch {
    return null;
  }
}

function isOverloadMessage(error: string | undefined): boolean {
  const msg = String(error || '').toLowerCase();
  return msg.includes('unavailable')
    || msg.includes('overloaded')
    || msg.includes('high demand')
    || msg.includes(' 503')
    || msg.includes(' 429')
    || msg.startsWith('api 503')
    || msg.startsWith('api 429');
}

/**
 * The table after scanning one more file (QA Chiffreur 008):
 *  - the rows this same file produced before are REPLACED, never added twice;
 *  - rows of files no longer in `livePaths` (deleted, re-filed) are dropped;
 *  - a table written before `scanSources` existed can't say which file a row
 *    came from: when this file is the only live one of its slot and nobody
 *    saved the table (no version), nothing else can own those rows, so the
 *    table starts over; otherwise they are kept.
 * Rows no scan produced (typed in the gestionnaire editor) are kept, and so
 * are versions and extra columns.
 */
export function mergeScannedFile(
  existing: StructuredDevis | null,
  scanned: { source: DevisScanSource; rows: DevisRow[]; header: Partial<Record<keyof DevisHeader, unknown>> },
  livePaths: ReadonlySet<string>,
): StructuredDevis {
  const path = scanned.source.storagePath;
  let keptRows: DevisRow[];
  let keptSources: DevisScanSource[];
  if (!existing?.scanSources) {
    const otherLiveFile = [...livePaths].some((p) => p !== path);
    const savedByHand = (existing?.versions?.length ?? 0) > 0;
    keptRows = otherLiveFile || savedByHand ? existing?.rows ?? [] : [];
    keptSources = [];
  } else {
    keptSources = existing.scanSources.filter((s) => s.storagePath !== path && livePaths.has(s.storagePath));
    const dropped = new Set(
      existing.scanSources.filter((s) => !keptSources.includes(s)).flatMap((s) => s.rowIds),
    );
    keptRows = existing.rows.filter((r) => !dropped.has(r.id));
  }

  // Header: earlier values win while earlier rows remain; a fresh table takes
  // this scan's header whole.
  const header: DevisHeader = keptRows.length > 0 ? { ...emptyHeader(), ...existing?.header } : emptyHeader();
  (Object.keys(header) as Array<keyof DevisHeader>).forEach((k) => {
    const v = scanned.header[k];
    if (!header[k] && v) header[k] = String(v);
  });

  return {
    header,
    rows: [...keptRows, ...scanned.rows],
    versions: existing?.versions ?? [],
    extraColumns: existing?.extraColumns ?? [],
    scanSources: [...keptSources, scanned.source],
  };
}

/**
 * Drops the rows of scanned files that are not in `livePaths` — a seed sent
 * to the chiffreur carries only the documents actually sent. Tables without
 * `scanSources` are returned as they are.
 */
export function pruneDeadScanSources(sd: StructuredDevis, livePaths: ReadonlySet<string>): StructuredDevis {
  if (!sd.scanSources) return sd;
  const kept = sd.scanSources.filter((s) => livePaths.has(s.storagePath));
  if (kept.length === sd.scanSources.length) return sd;
  const dropped = new Set(sd.scanSources.filter((s) => !kept.includes(s)).flatMap((s) => s.rowIds));
  return { ...sd, rows: sd.rows.filter((r) => !dropped.has(r.id)), scanSources: kept };
}

/**
 * Repairs a table built before `scanSources` existed whose rows are one block
 * repeated — the same file merged in twice or more (the Z5678 facture read
 * 66 100,00 for a 33 050,00 document). Returns the block once. Only blocks of
 * 3+ rows count: two identical labour lines side by side are legitimate.
 */
export function collapseRepeatedScan<R extends Pick<DevisRow, 'designation' | 'type' | 'tva' | 'qte' | 'puHT'>>(rows: R[]): R[] {
  const n = rows.length;
  const key = (r: R) => [(r.designation || '').trim().toLowerCase(), r.type ?? '', r.tva ?? '', r.qte ?? '', r.puHT ?? ''].join('|');
  for (let size = 3; size <= n / 2; size++) {
    if (n % size !== 0) continue;
    let repeated = true;
    for (let i = size; i < n && repeated; i++) {
      if (key(rows[i]) !== key(rows[i % size])) repeated = false;
    }
    if (repeated) return rows.slice(0, size);
  }
  return rows;
}

/**
 * The dossier's pre-extracted tables, trimmed to what is actually sent to the
 * chiffreur (QA Chiffreur 008): rows of scanned files that are not among
 * `files` are dropped, and a legacy table (no scanSources, never saved) whose
 * rows repeat as a block is collapsed. A table left without rows is omitted,
 * so the chiffrage-side extraction reads the sent files itself.
 */
export function seedForChiffrage(
  editables: Record<string, unknown> | null | undefined,
  files: ReadonlyArray<{ storagePath?: string; docType?: string }>,
): Record<string, unknown> | undefined {
  if (!editables) return undefined;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(editables)) {
    if (!isEditableDocType(key) || !value || typeof value !== 'object' || !Array.isArray((value as StructuredDevis).rows)) {
      out[key] = value;
      continue;
    }
    let sd = value as StructuredDevis;
    const saved = (sd.versions?.length ?? 0) > 0;
    if (sd.scanSources) {
      const sent = new Set(files.filter((f) => f.docType === key && f.storagePath).map((f) => f.storagePath as string));
      sd = pruneDeadScanSources(sd, sent);
      if (sd.rows.length === 0 && !saved) continue;
    } else if (!saved) {
      sd = { ...sd, rows: collapseRepeatedScan(sd.rows) };
    }
    out[key] = sd;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

/**
 * A garage devis / facture entered or left a dossier slot — by any path: the
 * Pièces socket, a move between slots, a delete (tester 2026-10-14: those
 * paths never told anyone, so the chiffreur's table kept a deleted devis's
 * lines, or stayed empty for a new one). The dossier's own table reads the
 * new files and drops the rows of the ones that left; the open chiffrage, if
 * any, does the same (extractAndPersistChiffrageDevis follows the dossier's
 * live documents). Fire-and-forget: never throws.
 */
export async function syncGarageDocs({
  db, storage, dossierId, docType, added = [],
}: {
  db: Firestore;
  storage: FirebaseStorage;
  dossierId: string;
  docType: string;
  added?: ReadonlyArray<{ storagePath: string; name?: string }>;
}): Promise<void> {
  if (!isEditableDocType(docType)) return;
  try {
    for (const f of added) {
      void extractAndPersistDossierDoc({ db, storage, dossierId, docType, storagePath: f.storagePath, name: f.name })
        .catch((e) => console.error('[devis-extract] dossier extraction failed', e));
    }
    const dossierRef = doc(db, 'dossiers', dossierId);
    const snap = await getDoc(dossierRef);
    const data = (snap.data() ?? {}) as any;
    // A file left and none came: the dossier's table drops its rows now
    // (a new file's scan does it through mergeScannedFile).
    if (added.length === 0) {
      const table = data.structuredEditables?.[docType] as StructuredDevis | undefined;
      const live = await liveSourcePaths(db, dossierId, docType);
      if (table?.scanSources && live) {
        const pruned = pruneDeadScanSources(table, live);
        if (pruned !== table) {
          await updateDoc(dossierRef, { [`structuredEditables.${docType}`]: pruned, updatedAt: serverTimestamp() });
        }
      }
    }
    const chiffrageId = data.currentChiffrageId as string | undefined;
    if (chiffrageId) {
      void extractAndPersistChiffrageDevis({ db, storage, chiffrageId, docType })
        .catch((e) => console.error('[devis-extract] chiffrage sync failed', e));
    }
  } catch (e) {
    console.warn('[devis-extract] syncGarageDocs failed (non-fatal)', e);
  }
}

/**
 * The type Gemini is told: the stored one, unless the upload left it blank or
 * as « application/octet-stream » (Gemini refuses that one) — then the file
 * name or path decides.
 */
function scanContentType(blob: Blob, file: { name?: string; storagePath?: string }): string {
  const stored = blob.type && blob.type !== 'application/octet-stream' ? blob.type : '';
  if (stored) return stored;
  const name = String(file.name || file.storagePath || '').toLowerCase();
  if (name.endsWith('.pdf')) return 'application/pdf';
  if (name.endsWith('.png')) return 'image/png';
  if (name.endsWith('.webp')) return 'image/webp';
  if (/.(heic|heif)$/.test(name)) return 'image/heic';
  return 'image/jpeg';
}

export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const s = (reader.result as string) || '';
      const idx = s.indexOf(',');
      resolve(idx >= 0 ? s.slice(idx + 1) : s);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

function newId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return Math.random().toString(36).slice(2);
}
