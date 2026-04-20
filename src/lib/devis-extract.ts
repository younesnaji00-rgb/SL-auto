import { doc, getDoc, serverTimestamp, updateDoc, type Firestore } from 'firebase/firestore';
import { getDownloadURL, ref as storageRef, type FirebaseStorage } from 'firebase/storage';
import { emptyHeader, type DevisHeader, type DevisRow, type EditableDocType, type StructuredDevis } from './devis-schema';

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
  | { ok: true; reason: 'already-extracted' | 'already-attempted' | 'no-files' | 'extracted'; structuredDevis?: StructuredDevis }
  | { ok: false; reason: 'missing-chiffrage' | 'fetch-failed' | 'api-failed' | 'persist-failed'; error?: string };

/**
 * Per-docType extractor. Downloads every file matching the requested
 * `docType`, asks Gemini to extract header + rows from each, concatenates
 * the rows and merges headers into a single structured document stored at
 * chiffrages/{id}.structuredEditables[docType].
 *
 * Idempotent: no-op if structuredEditables[docType] already exists OR if
 * editableExtractionAttempted[docType] is set (unless force=true).
 *
 * Safe to fire-and-forget from UI flows (assignment, editor first-open).
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

    if (!force) {
      if (editables[docType]) return { ok: true, reason: 'already-extracted', structuredDevis: editables[docType] };
      if (attempts[docType]) return { ok: true, reason: 'already-attempted' };
    }

    const files = Array.isArray(data.files) ? data.files : [];
    const targetFiles: Array<{ file: any; index: number }> = files
      .map((f: any, i: number) => ({ file: f, index: i }))
      .filter(({ file }: any) => file?.docType === docType && file?.storagePath);

    if (targetFiles.length === 0) {
      await markAttempted(docRef, docType);
      return { ok: true, reason: 'no-files' };
    }

    const extractions = await Promise.all(
      targetFiles.map(async ({ file, index }) => {
        try {
          const url = await getDownloadURL(storageRef(storage, file.storagePath));
          const res = await fetch(url);
          if (!res.ok) throw new Error(`fetch ${res.status}`);
          const blob = await res.blob();
          const contentType = blob.type || (file.name?.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg');
          const base64 = await blobToBase64(blob);

          const r = await fetch('/api/scan-devis', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fileBase64: base64, contentType }),
          });
          if (!r.ok) throw new Error(`api ${r.status}`);
          const parsed = await r.json();
          return { ok: true as const, index, file, parsed };
        } catch (e: any) {
          console.error(`[extractChiffrageDevis] file #${index} failed`, e);
          return { ok: false as const, index, file, error: e?.message };
        }
      })
    );

    const successful = extractions.filter((r) => r.ok) as Array<{ ok: true; index: number; file: any; parsed: any }>;

    if (successful.length === 0) {
      await markAttempted(docRef, docType);
      return { ok: false, reason: 'api-failed', error: `Aucun ${docType.toLowerCase()} n'a pu etre extrait.` };
    }

    const mergedHeader: DevisHeader = emptyHeader();
    for (const { parsed } of successful) {
      const h = parsed.header || {};
      (Object.keys(mergedHeader) as Array<keyof DevisHeader>).forEach((k) => {
        if (!mergedHeader[k] && h[k]) mergedHeader[k] = String(h[k]);
      });
    }

    const mergedRows: DevisRow[] = [];
    for (const { parsed } of successful) {
      const rows = Array.isArray(parsed.rows) ? parsed.rows : [];
      rows.forEach((r: any) => {
        mergedRows.push({
          id: newId(),
          ref: r.ref || 'CHANGE',
          designation: r.designation || '',
          type: r.type || '',
          tva: Number(r.tva) || 0,
          qte: Number(r.qte) || 0,
          puHT: Number(r.puHT) || 0,
        });
      });
    }

    const structuredDevis: StructuredDevis = {
      header: mergedHeader,
      rows: mergedRows,
      versions: [],
    };

    try {
      const fresh = await getDoc(docRef);
      if (!fresh.exists()) return { ok: false, reason: 'missing-chiffrage' };
      const freshData = fresh.data() as any;
      const freshEditables = (freshData.structuredEditables || {}) as Record<string, StructuredDevis>;
      if (!force && freshEditables[docType]) {
        return { ok: true, reason: 'already-extracted', structuredDevis: freshEditables[docType] };
      }
      const freshAttempts = (freshData.editableExtractionAttempted || {}) as Record<string, boolean>;
      await updateDoc(docRef, {
        [`structuredEditables.${docType}`]: structuredDevis,
        editableExtractionAttempted: { ...freshAttempts, [docType]: true },
        updatedAt: serverTimestamp(),
      });
    } catch (e: any) {
      return { ok: false, reason: 'persist-failed', error: e?.message };
    }

    return { ok: true, reason: 'extracted', structuredDevis };
  } catch (e: any) {
    return { ok: false, reason: 'persist-failed', error: e?.message };
  }
}

async function markAttempted(docRef: ReturnType<typeof doc>, docType: EditableDocType): Promise<void> {
  try {
    const snap = await getDoc(docRef);
    if (!snap.exists()) return;
    const data = snap.data() as any;
    const attempts = (data.editableExtractionAttempted || {}) as Record<string, boolean>;
    if (attempts[docType]) return;
    await updateDoc(docRef, {
      editableExtractionAttempted: { ...attempts, [docType]: true },
      updatedAt: serverTimestamp(),
    });
  } catch { /* best effort */ }
}

function blobToBase64(blob: Blob): Promise<string> {
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
